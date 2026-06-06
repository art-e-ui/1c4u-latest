import { useQuery } from "@tanstack/react-query";
import { Reseller } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";

export function useUnifiedResellers() {
  const { data = [] } = useQuery({
    queryKey: ["resellers"],
    queryFn: async () => {
      try {
        console.log("[UNIFIED_HOOKS] Fetching unified resellers (limited to 100 tail)...");
        
        // Fetch collections with safety limits
        const [
          usersRes,
          profilesRes,
          adminsRes,
          staffRes,
          retailShopsRes
        ] = await Promise.allSettled([
          getDocs(query(collection(db, 'users'), limit(100))),
          getDocs(query(collection(db, 'reseller_profiles'), limit(100))),
          getDocs(query(collection(db, 'sla_admins'), limit(50))),
          getDocs(query(collection(db, 'sla_staff'), limit(50))),
          getDocs(query(collection(db, 'retail_shops'), limit(100)))
        ]);

        const usersSnapshot = usersRes.status === 'fulfilled' ? usersRes.value : { docs: [] };
        if (usersRes.status === 'rejected') console.error("[UNIFIED_HOOKS] Failed to fetch users:", usersRes.reason);
        
        const profilesSnapshot = profilesRes.status === 'fulfilled' ? profilesRes.value : { docs: [] };
        if (profilesRes.status === 'rejected') console.error("[UNIFIED_HOOKS] Failed to fetch reseller profiles:", profilesRes.reason);
        
        const adminsSnapshot = adminsRes.status === 'fulfilled' ? adminsRes.value : { docs: [] };
        const staffSnapshot = staffRes.status === 'fulfilled' ? staffRes.value : { docs: [] };
        
        const retailShopsSnapshot = retailShopsRes.status === 'fulfilled' ? retailShopsRes.value : { docs: [] };
        if (retailShopsRes.status === 'rejected') console.error("[UNIFIED_HOOKS] Failed to fetch retail shops:", retailShopsRes.reason);

        console.log(`[UNIFIED_HOOKS] Fetched: ${usersSnapshot.docs.length} users, ${profilesSnapshot.docs.length} profiles, ${retailShopsSnapshot.docs.length} shops`);
        if (profilesSnapshot.docs.length > 0) {
          console.log("[UNIFIED_HOOKS] Sample profile IDs:", profilesSnapshot.docs.slice(0, 3).map(d => d.id));
        }

        const usersMap = new Map();
        usersSnapshot.docs.forEach(doc => usersMap.set(doc.id, doc.data()));

        const profilesMap = new Map();
        profilesSnapshot.docs.forEach(doc => profilesMap.set(doc.id, doc.data()));
        
        const retailShopsMap = new Map();
        retailShopsSnapshot.docs.forEach(doc => retailShopsMap.set(doc.id, doc.data()));
        
        const adminsMap = new Map<string, string>();
        adminsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const id = data.account_id || doc.id;
          adminsMap.set(id, data.name || data.username || id);
        });

        const staffMap = new Map<string, Record<string, unknown>>();
        staffSnapshot.docs.forEach(doc => {
          const data = doc.data() as Record<string, unknown>;
          if (data.referral_id) {
            staffMap.set(data.referral_id as string, data);
          }
          staffMap.set(doc.id, data);
        });

        // Use profiles as the source of truth for resellers
        const resellers: Reseller[] = profilesSnapshot.docs.map(profileDoc => {
          const profileData = profileDoc.data() as Record<string, unknown>;
          const userData = (usersMap.get(profileDoc.id) || {}) as Record<string, unknown>;
          const retailShopData = (retailShopsMap.get(profileDoc.id) || {}) as Record<string, unknown>;
          
          let adminName = '';
          let staffName = '';
          let inferredAdminId = (profileData.member_of_admin_id as string) || '';
          
          if (profileData.member_of_admin_id && adminsMap.has(profileData.member_of_admin_id as string)) {
            adminName = adminsMap.get(profileData.member_of_admin_id as string)!;
          } 
          
          if (profileData.referred_by_staff_id && staffMap.has(profileData.referred_by_staff_id as string)) {
            const staffData = staffMap.get(profileData.referred_by_staff_id as string)!;
            staffName = (staffData.username as string) || (staffData.name as string) || (profileData.referred_by_staff_id as string);
            
            if (!inferredAdminId && staffData.created_by_admin_id) {
              inferredAdminId = staffData.created_by_admin_id as string;
            }

            if (!adminName && staffData.created_by_admin_id && adminsMap.has(staffData.created_by_admin_id as string)) {
              adminName = adminsMap.get(staffData.created_by_admin_id as string)!;
            }
          }

          const firstName = (userData.first_name as string) || (profileData.first_name as string) || 'Unknown';
          const lastName = (userData.last_name as string) || (profileData.last_name as string) || 'User';

          const referralId = (profileData.referral_code as string) || (profileData.referral_id as string) || '';

          return {
            id: profileDoc.id,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`,
            shopName: (profileData.shop_name as string) || (retailShopData.shop_name as string) || '',
            email: (userData.email as string) || (profileData.email as string) || '',
            registrationDate: (profileData.registration_date as string) || (userData.created_at as string) || '',
            referredBy: (profileData.referred_by_staff_id as string) || '',
            staffName,
            adminMember: adminName,
            memberOfAdminId: inferredAdminId,
            hasRequestedPasswordReset: false,
            referralId,
            level: (retailShopData.level as string) || 'VIP-0',
            productLimit: (retailShopData.product_limit as number) || 20,
            starRating: (retailShopData.star_rating as number) || 2.0,
            creditScore: (retailShopData.credit_score as number) || 100,
            selectedProductIds: [],
            resellerId: profileData.reseller_id as number,
            // Financial fields
            balance: Number(profileData.balance || 0),
            pendingBalance: Number(profileData.pending_balance || 0),
            unpickedBalance: Number(profileData.unpicked_balance || 0),
            totalDeposits: Number(profileData.total_deposits || 0),
            totalWithdrawals: Number(profileData.total_withdrawals || 0),
            totalEarnings: Number(profileData.total_earnings || 0),
            totalOrders: Number(profileData.total_orders || 0),
            bankInfo: profileData.bank_info as { bankName: string; accountName: string; accountNumber: string } | undefined,
            usdtAddress: (profileData.usdt_address as string) || ''
          };
        });

        console.log(`Final unified resellers list: ${resellers.length} items. IDs: ${resellers.map(r => r.id).join(', ')}`);
        return resellers;
      } catch (error) {
        console.error("Error in useUnifiedResellers queryFn:", error);
        throw error; // Throw instead of returning [] to keep previous data via placeholderData
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes stale time to reduce reads
    refetchOnWindowFocus: false, // Prevent unexpected refetches when switching back to the tab
    placeholderData: (previousData: Reseller[] | undefined) => previousData,
  });

  return data;
}
