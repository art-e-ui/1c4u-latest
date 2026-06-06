import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, getDoc, doc, updateDoc, limit } from "firebase/firestore";
import { toast } from "sonner";

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: "Pending" | "Ongoing" | "Completed" | "Cancelled";
  createdAt: string;
  items: number; // Items count (sum of quantities)
  products: number; // Number of unique products
  resellerId: string;
  staffUsername: string;
  adminUsername: string;
  totalCost: number;
  serviceCost: number;
  profits: number;
  referralId?: string;
  memberOfAdminId?: string;
}

export function useOrders(limitCount: number = 100) {
  return useQuery({
    queryKey: ["orders", limitCount],
    queryFn: async () => {
      try {
        const ordersQuery = query(
          collection(db, "orders"), 
          orderBy("created_at", "desc"),
          limit(limitCount)
        );
        const snapshot = await getDocs(ordersQuery);
        
        const orders = snapshot.docs.map((orderDoc) => {
          const orderData = orderDoc.data();
          
          // Use denormalized data if available, otherwise minimal fallbacks
          const customerName = orderData.profileName || orderData.customerName || "Unknown";
          const customerEmail = orderData.customerEmail || "";
          
          const itemsCount = Number(orderData.items_count || 0);
          const productsCount = Number(orderData.products_count || 0);

          // Map status
          let status = "Pending";
          const dbStatus = String(orderData.status || "").toLowerCase();
          if (dbStatus === "ongoing" || dbStatus === "processing" || dbStatus === "shipped") status = "Ongoing";
          else if (dbStatus === "completed" || dbStatus === "delivered") status = "Completed";
          else if (dbStatus === "cancelled") status = "Cancelled";

          const resellerId = orderData.resellerId || orderData.reseller_id || 'N/A';
          const staffUsername = String(orderData.staffUsername || orderData.staff_username || 'N/A');
          const adminUsername = String(orderData.adminUsername || orderData.admin_username || 'N/A');

          return {
            id: orderDoc.id,
            customerName,
            customerEmail,
            total: Number(orderData.total_amount || 0),
            status: status as Order["status"],
            createdAt: String(orderData.created_at || ''),
            items: itemsCount,
            products: productsCount,
            resellerId: String(resellerId).startsWith('GRS') ? resellerId : `GRS${resellerId}`,
            staffUsername,
            adminUsername,
            totalCost: Number(orderData.total_cost || orderData.totalCost || 0),
            serviceCost: Number(orderData.service_cost || orderData.serviceCost || 0),
            profits: Number(orderData.profits || orderData.profit || 0),
            referralId: orderData.referralId || orderData.referred_by_staff_id,
            memberOfAdminId: orderData.memberOfAdminId || orderData.member_of_admin_id,
          };
        });

        return orders as Order[];
      } catch (error) {
        console.error("Error fetching orders:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache to prevent huge reads
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order["status"] }) => {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        throw new Error("Order not found");
      }
      
      const orderData = orderSnap.data();
      const previousStatus = String(orderData.status || "").toLowerCase();
      const newStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

      // 1. Update order status
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === "Ongoing" && previousStatus === "pending") {
        updateData.picked_up_at = new Date().toISOString();
      } else if (newStatus === "Completed" && previousStatus !== "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      await updateDoc(orderRef, updateData);

      // 2. Handle balance transfer if order is marked as completed
      if (newStatus === "Completed" && previousStatus !== "completed") {
        const resellerId = orderData.reseller_id || orderData.resellerId;
        const totalAmount = Number(orderData.total_amount || orderData.total_cost || 0);

        if (resellerId) {
          const resellerRef = doc(db, "reseller_profiles", resellerId);
          const resellerSnap = await getDoc(resellerRef);
          
          if (resellerSnap.exists()) {
            const resellerData = resellerSnap.data();
            const currentPending = Number(resellerData.pending_balance) || 0;
            const currentBalance = Number(resellerData.balance) || 0;
            const currentTotalEarnings = Number(resellerData.total_earnings) || 0;
            const profit = Number(orderData.profits || orderData.profit) || 0;

            await updateDoc(resellerRef, {
              pending_balance: Math.max(0, currentPending - totalAmount),
              balance: currentBalance + totalAmount,
              total_earnings: currentTotalEarnings + profit,
              updated_at: new Date().toISOString()
            });
          }
        }
      }

      // 3. Handle balance transfer if order is marked as ongoing (Admin action)
      if (newStatus === "Ongoing" && previousStatus === "pending") {
        const resellerId = orderData.reseller_id || orderData.resellerId;
        const totalAmount = Number(orderData.total_amount || orderData.total_cost || 0);
        const serviceCost = Number(orderData.service_cost || orderData.serviceCost || 0);

        if (resellerId) {
          const resellerRef = doc(db, "reseller_profiles", resellerId);
          const resellerSnap = await getDoc(resellerRef);
          
          if (resellerSnap.exists()) {
            const resellerData = resellerSnap.data();
            const currentUnpicked = Number(resellerData.unpicked_balance) || 0;
            const currentPending = Number(resellerData.pending_balance) || 0;
            const currentBalance = Number(resellerData.balance) || 0;

            await updateDoc(resellerRef, {
              unpicked_balance: Math.max(0, currentUnpicked - totalAmount),
              pending_balance: currentPending + totalAmount,
              balance: currentBalance - serviceCost,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status: " + (error.message || "Unknown error"));
    }
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (orderId: string) => {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        throw new Error("Order not found");
      }
      
      const orderData = orderSnap.data();
      const previousStatus = String(orderData.status || "").toLowerCase();
      const resellerId = orderData.reseller_id || orderData.resellerId;
      const totalAmount = Number(orderData.total_amount || orderData.total_cost || 0);
      const serviceCost = Number(orderData.service_cost || orderData.serviceCost || 0);

      // 1. Update order status
      await updateDoc(orderRef, {
        status: "Cancelled",
        updated_at: new Date().toISOString()
      });

      // 2. Handle balance reversals
      if (resellerId) {
        const resellerRef = doc(db, "reseller_profiles", resellerId);
        const resellerSnap = await getDoc(resellerRef);
        
        if (resellerSnap.exists()) {
          const resellerData = resellerSnap.data();
          const currentUnpicked = Number(resellerData.unpicked_balance) || 0;
          const currentPending = Number(resellerData.pending_balance) || 0;
          const currentBalance = Number(resellerData.balance) || 0;

          if (previousStatus === "pending" || previousStatus === "processing") {
            // Deduct from unpicked balance
            await updateDoc(resellerRef, {
              unpicked_balance: Math.max(0, currentUnpicked - totalAmount),
              updated_at: new Date().toISOString()
            });
          } else if (previousStatus === "ongoing") {
            // Deduct from pending balance and refund service cost
            await updateDoc(resellerRef, {
              pending_balance: Math.max(0, currentPending - totalAmount),
              balance: currentBalance + serviceCost,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled successfully");
    },
    onError: (error: Error) => {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order: " + (error.message || "Unknown error"));
    }
  });
}
