import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Reseller } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";

export function useUnifiedResellers() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for changes in the primary collections making up a reseller profile
    const unsubProfiles = onSnapshot(collection(db, "reseller_profiles"), () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
    });
    const unsubShops = onSnapshot(collection(db, "retail_shops"), () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
    });
    const unsubUsers = onSnapshot(collection(db, "users"), () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
    });

    return () => {
      unsubProfiles();
      unsubShops();
      unsubUsers();
    };
  }, [queryClient]);

  const { data = [] } = useQuery({
    queryKey: ["resellers"],
    queryFn: async () => {
      try {
        console.log("[UNIFIED_HOOKS] Fetching unified resellers...");
        
        // Fetch all required collections in parallel with individual error handling
        const [
          usersRes,
          profilesRes,
          adminsRes,
          staffRes,
          retailShopsRes
        ] = await Promise.allSettled([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'reseller_profiles')),
          getDocs(collection(db, 'sla_admins')),
          getDocs(collection(db, 'sla_staff')),
          getDocs(collection(db, 'retail_shops'))
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

          const firstName = (userData.first_name as string) || (profileData.first_name as string) || (profileData.full_name as string)?.split(' ')[0] || 'Unknown';
          const lastName = (userData.last_name as string) || (profileData.last_name as string) || (profileData.full_name as string)?.split(' ').slice(1).join(' ') || 'User';

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
            hasRequestedPasswordReset: !!(profileData.password_reset_requested || profileData.has_requested_password_reset),
            status: (profileData.status as string) || (profileData.verified === false ? 'Inactive' : 'Active'),
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
    staleTime: 24 * 60 * 60 * 1000, // 24 hours stale time to reduce reads
    refetchOnWindowFocus: false, // Prevent unexpected refetches when switching back to the tab
    placeholderData: (previousData: Reseller[] | undefined) => previousData,
  });

  return data;
}
