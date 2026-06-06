import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, getDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
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

import { useEffect } from "react";

export function useOrders() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ordersQuery = query(collection(db, "orders"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
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
          createdAt: orderData.created_at?.toDate ? orderData.created_at.toDate().toISOString() : orderData.created_at?.seconds ? new Date(orderData.created_at.seconds * 1000).toISOString() : String(orderData.created_at || ''),
          items: itemsCount,
          products: productsCount,
          resellerId: String(resellerId).startsWith('1CR') ? resellerId : `1CR${resellerId}`,
          staffUsername,
          adminUsername,
          totalCost: Number(orderData.total_cost || orderData.totalCost || 0),
          serviceCost: Number(orderData.service_cost || orderData.serviceCost || 0),
          profits: Number(orderData.profits || orderData.profit || 0),
          referralId: orderData.referralId || orderData.referred_by_staff_id,
          memberOfAdminId: orderData.memberOfAdminId || orderData.member_of_admin_id,
        } as Order;
      });
      queryClient.setQueryData(["orders"], orders);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      // Return currently cached data to act as placeholder until onSnapshot fires
      return queryClient.getQueryData<Order[]>(["orders"]) || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (cache managed by onSnapshot)
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
      const newStatus = (status || "").charAt(0).toUpperCase() + (status || "").slice(1).toLowerCase();

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

      // Handle balance transfers based on state transitions
      const resellerId = orderData.reseller_id || orderData.resellerId;
      
      if (resellerId && previousStatus !== newStatus.toLowerCase()) {
        const resellerRef = doc(db, "reseller_profiles", resellerId);
        const resellerSnap = await getDoc(resellerRef);
        
        if (resellerSnap.exists()) {
          const resellerData = resellerSnap.data();
          let currentUnpicked = Number(resellerData.unpicked_balance) || 0;
          let currentPending = Number(resellerData.pending_balance) || 0;
          let currentBalance = Number(resellerData.balance) || 0;
          let currentTotalEarnings = Number(resellerData.total_earnings) || 0;
          
          const totalAmount = Number(orderData.total_amount || orderData.total_cost || 0);
          const serviceCost = Number(orderData.service_cost || orderData.serviceCost || 0);
          const profit = Number(orderData.profits || orderData.profit) || 0;

          let updated = false;

          // 1. Pending -> Completed (Skipped Ongoing)
          if (newStatus === "Completed" && previousStatus === "pending") {
            currentUnpicked = Math.max(0, currentUnpicked - totalAmount);
            currentBalance = currentBalance - serviceCost;
            // implicitly pending goes +totalAmount and -totalAmount
            currentBalance = currentBalance + totalAmount;
            currentTotalEarnings = currentTotalEarnings + profit;
            updated = true;
          } 
          // 2. Pending -> Ongoing
          else if (newStatus === "Ongoing" && previousStatus === "pending") {
            currentUnpicked = Math.max(0, currentUnpicked - totalAmount);
            currentPending = currentPending + totalAmount;
            currentBalance = currentBalance - serviceCost;
            updated = true;
          }
          // 3. Ongoing -> Completed
          else if (newStatus === "Completed" && (previousStatus === "ongoing" || previousStatus === "processing" || previousStatus === "shipped")) {
            currentPending = Math.max(0, currentPending - totalAmount);
            currentBalance = currentBalance + totalAmount;
            currentTotalEarnings = currentTotalEarnings + profit;
            updated = true;
          }

          if (updated) {
            await updateDoc(resellerRef, {
              unpicked_balance: currentUnpicked,
              pending_balance: currentPending,
              balance: currentBalance,
              total_earnings: currentTotalEarnings,
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
