import React, { useState, useEffect } from "react";
import { useDbProducts } from "@/hooks/use-db-products";
import type { Product } from "@/lib/types";
import { ResellerContext, type ResellerProfile, type StoreTheme, getLevelByDeposit, VIP_LEVELS } from "@/lib/reseller-context-hooks";
import { auth, db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { useFcmToken } from "@/hooks/use-fcm-token";
import { AppLoading } from "@/components/ui/AppLoading";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from "@/lib/supabase-compat/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  onSnapshot,
  orderBy,
  limit
} from "firebase/firestore";

const DEFAULT_PROFILE_TEMPLATE: Omit<ResellerProfile, "id" | "resellerId" | "firstName" | "lastName" | "email" | "shopName"> = {
  profilePicture: "",
  phone: "",
  shopLogo: "",
  shopHeroBanner: "",
  storeTheme: "minimal",
  level: "VIP-0",
  verified: false,
  balance: 0,
  pendingBalance: 0,
  unpickedBalance: 0,
  guaranteeBalance: 0,
  totalEarnings: 0,
  totalOrders: 0,
  totalDeposits: 0,
  pendingOrders: 0,
  selectedProductIds: [],
  joinedAt: new Date().toISOString(),
  shopLevel: "VIP-0",
  storeRating: 2.0,
  creditLimit: 100,
  creditScore: 100,
  productLimit: 20,
  starRating: 2.0,
  usdtAddress: "",
  bankInfo: { bankName: "", accountName: "", accountNumber: "" },
};


export function ResellerProvider({ children }: { children: React.ReactNode }) {
  const [reseller, setReseller] = useState<ResellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: products = [] } = useDbProducts();

  // Register FCM token for push notifications
  useFcmToken();

  const currentUserRef = React.useRef<string | null>(null);
  
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Prevent redundant fetches if the user hasn't changed
        if (currentUserRef.current === user.uid) {
          console.log("[RESELLER_CONTEXT] User unchanged, skipping fetchProfile");
          return;
        }
        currentUserRef.current = user.uid;
        
        // Initial fetch to check role and setup shop if needed
        await fetchProfile(user.uid, user.email || '');
        
        // Setup real-time listener for the reseller profile
        profileUnsubscribe = onSnapshot(doc(db, 'reseller_profiles', user.uid), (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.data();
            
            setReseller(prev => {
              const base = prev || ({} as ResellerProfile);
              return {
                ...DEFAULT_PROFILE_TEMPLATE,
                ...base,
                id: user.uid,
                resellerId: profileData.reseller_id || 0,
                phone: profileData.phone || '',
                profilePicture: profileData.profile_picture || '',
                shopName: profileData.shop_name || 'My Shop',
                shopSlug: profileData.shop_slug || '',
                shopLogo: profileData.shop_logo || '',
                shopHeroBanner: profileData.shop_hero_banner || '',
                storeTheme: profileData.store_theme || 'minimal',
                verified: profileData.verified || false,
                balance: Number(profileData.balance || 0),
                pendingBalance: Number(profileData.pending_balance || 0),
                unpickedBalance: Number(profileData.unpicked_balance || 0),
                totalEarnings: Number(profileData.total_earnings || 0),
                usdtAddress: profileData.usdt_address || '',
                bankInfo: profileData.bank_info || { bankName: '', accountName: '', accountNumber: '' },
              } as ResellerProfile;
            });
          }
        });

        // Separate listener for user data to avoid redundant fetches
        const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data();
            setReseller(prev => {
              if (!prev) return null;
              return {
                ...prev,
                firstName: userData.first_name || '',
                lastName: userData.last_name || '',
                email: userData.email || '',
              };
            });
          }
        });

        // Separate listener for product selection
        const selectionQuery = query(collection(db, 'reseller_product_selection'), where('reseller_id', '==', user.uid));
        const selectionUnsubscribe = onSnapshot(selectionQuery, (snapshot) => {
          const selectedProductIds = snapshot.docs.map(doc => doc.data().product_id);
          setReseller(prev => {
            if (!prev) return null;
            return {
              ...prev,
              selectedProductIds,
            };
          });
        });

        // Add real-time listener for retail_shops to fix Star Rating not updating
        const shopUnsubscribe = onSnapshot(doc(db, 'retail_shops', user.uid), (snapshot) => {
          if (snapshot.exists()) {
            const shopData = snapshot.data();
            setReseller(prev => {
              if (!prev) return null;
              return {
                ...prev,
                starRating: shopData.star_rating || 2.0,
                creditScore: shopData.credit_score || 100,
                level: shopData.level || prev.level || "VIP-0",
                productLimit: shopData.product_limit || 20,
              };
            });
          }
        });

        // Wrap cleanup
        const originalProfileUnsubscribe = profileUnsubscribe;
        profileUnsubscribe = () => {
          if (originalProfileUnsubscribe) originalProfileUnsubscribe();
          shopUnsubscribe();
          userUnsubscribe();
          selectionUnsubscribe();
        };
      } else {
        currentUserRef.current = null;
        if (profileUnsubscribe) profileUnsubscribe();
        setReseller(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    setLoading(true);
    console.log(`[RESELLER_CONTEXT] Fetching profile for UID: ${userId}, Email: ${email}`);
    try {
      // 1. Fetch user role
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', userId));
      } catch (error) {
        console.error(`[RESELLER_CONTEXT] Error fetching 'users' document:`, error);
        throw new Error(JSON.stringify({ error: error instanceof Error ? error.message : String(error), operationType: 'get', path: 'users' }));
      }
      
      let userData;
      if (!userDoc.exists()) {
        console.warn(`[RESELLER_CONTEXT] 'users' document NOT FOUND for UID: ${userId}. Auto-creating.`);
        userData = { role: 'reseller', email: email, created_at: new Date().toISOString() };
        await setDoc(doc(db, 'users', userId), userData);
      } else {
        userData = userDoc.data();
      }
      console.log(`[RESELLER_CONTEXT] User data found. Role: ${userData.role}`);
      if (!['reseller', 'customer', 'owner', 'admin'].includes(userData.role)) {
        console.warn(`[RESELLER_CONTEXT] Unauthorized role: ${userData.role}`);
        setReseller(null);
        setLoading(false);
        return;
      }

      // 2. Fetch reseller profile
      let profileDoc;
      try {
        profileDoc = await getDoc(doc(db, 'reseller_profiles', userId));
      } catch (error) {
        console.warn(`[RESELLER_CONTEXT] Could not fetch 'reseller_profiles' document:`, error);
      }
      
      let retailShopDoc;
      try {
        if (!userId) {
            throw new Error("userId is undefined");
        }
        retailShopDoc = await getDoc(doc(db, 'retail_shops', userId));
      } catch (error) {
        console.warn(`[RESELLER_CONTEXT] Could not fetch 'retail_shops' document:`, error);
      }

      let profileData: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!profileDoc || !profileDoc.exists()) {
        console.warn(`[RESELLER_CONTEXT] 'reseller_profiles' document NOT FOUND for UID: ${userId}`, 'Auto-creating...');
        const newProfile = {
          reseller_id: userData.uid || userId,
          full_name: userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Store Owner',
          phone: userData.phone_number || '',
          shop_name: 'My Store',
          shop_slug: userId.substring(0, 8),
          store_theme: 'minimal',
          verified: true,
          balance: 0,
          pending_balance: 0,
          unpicked_balance: 0,
          total_earnings: 0,
          usdt_address: '',
          level: 'VIP-0',
          credit_score: 100,
          product_limit: 20
        };
        try {
          await setDoc(doc(db, 'reseller_profiles', userId), newProfile);
          console.log(`[RESELLER_CONTEXT] Created default reseller_profiles for ${userId}`);
          profileData = newProfile;
        } catch (e) {
          console.error(`[RESELLER_CONTEXT] Failed to auto-create reseller_profiles: `, e);
          setReseller(null);
          setLoading(false);
          return;
        }
      } else {
        profileData = profileDoc.data();
      }

      
      // Auto-verify if 2 minutes have passed
      if (profileData.verified === false && profileData.registration_date) {
        const regDate = new Date(profileData.registration_date).getTime();
        const now = Date.now();
        if (now - regDate > 2 * 60 * 1000) {
          try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'reseller_profiles', userId), { verified: true });
            profileData.verified = true;
            console.log(`[RESELLER_CONTEXT] Reseller ${userId} auto-verified on load.`);
          } catch (e) {
            console.error(`[RESELLER_CONTEXT] Failed to auto-verify reseller ${userId}:`, e);
          }
        }
      }

      console.log(`[RESELLER_CONTEXT] Reseller profile found. ID: ${profileData.reseller_id}`);
      let retailShopData = retailShopDoc?.exists() ? retailShopDoc.data() : null;

      // Auto-create missing retail_shop if it doesn't exist
      if (!retailShopData) {
        console.log(`[RESELLER_CONTEXT] Retail shop missing for ${userId}, auto-creating...`);
        const newShopData = {
          reseller_id: profileData.reseller_id || 0,
          shop_name: profileData.shop_name || 'My Store',
          star_rating: 2.0,
          credit_score: 100,
          status: 'active',
          created_at: new Date().toISOString()
        };
        try {
          await setDoc(doc(db, 'retail_shops', userId), newShopData);
          retailShopData = newShopData;
          console.log(`[RESELLER_CONTEXT] Retail shop created for ${userId}`);
        } catch (e) {
          console.error("[RESELLER_CONTEXT] Failed to auto-create retail shop:", e);
        }
      }
      
      const totalDeposits = Number(profileData.total_deposits || 0);
      const totalWithdrawals = Number(profileData.total_withdrawals || 0);
      const netDeposits = totalDeposits - totalWithdrawals;
      const currentLevelLabel = (retailShopData?.level as string) || "VIP-0";
      const levelInfo = getLevelByDeposit(netDeposits, currentLevelLabel);

      // 3. Fetch selected products
      let selectionSnapshot;
      try {
        const selectionQuery = query(collection(db, 'reseller_product_selection'), where('reseller_id', '==', userId));
        selectionSnapshot = await getDocs(selectionQuery);
      } catch (error) {
        console.warn("Could not fetch reseller_product_selection, continuing with empty selection:", error);
      }
      
      const selectedProductIds = selectionSnapshot ? selectionSnapshot.docs.map(doc => doc.data().product_id) : [];

      setReseller({
        ...DEFAULT_PROFILE_TEMPLATE,
        id: userId,
        resellerId: profileData.reseller_id || 0,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        email: email,
        phone: userData.phone || profileData.phone || '',
        profilePicture: profileData.profile_picture || '',
        shopName: profileData.shop_name,
        shopSlug: profileData.shop_slug || '',
        shopLogo: profileData.shop_logo || '',
        shopHeroBanner: profileData.shop_hero_banner || '',
        storeTheme: profileData.store_theme || 'minimal',
        verified: profileData.verified,
        balance: Number(profileData.balance || 0),
        pendingBalance: Number(profileData.pending_balance || 0),
        unpickedBalance: Number(profileData.unpicked_balance || 0),
        totalEarnings: Number(profileData.total_earnings || 0),
        totalDeposits: totalDeposits,
        referralCode: profileData.referral_code,
        referredByStaffId: profileData.referred_by_staff_id,
        memberOfAdminId: profileData.member_of_admin_id,
        level: levelInfo.level,
        productLimit: levelInfo.productLimit,
        starRating: retailShopData?.star_rating || 2.0,
        creditScore: retailShopData?.credit_score || 100,
        selectedProductIds,
        usdtAddress: profileData.usdt_address || '',
        bankInfo: profileData.bank_info || { bankName: '', accountName: '', accountNumber: '' },
      });
    } catch (error) {
      console.error("Error fetching reseller profile:", error);
      setReseller(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log(`[RESELLER_CONTEXT] Attempting login for: ${email}`);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log(`[RESELLER_CONTEXT] Firebase Auth login successful for UID: ${userCredential.user.uid}`);
      return true;
    } catch (e: unknown) {
      const error = e as Error;
      console.error("[RESELLER_CONTEXT] Login error details:", error.message, "for email:", email);
      return false;
    }
  };

  const register = async (data: { firstName: string; lastName: string; emailOrPhone: string; password: string; shopName?: string; referralCode?: string; isPhone?: boolean; phoneCredential?: import("firebase/auth").UserCredential }): Promise<{ success: boolean; error?: string }> => {
    try {
      let userCredential;
      if (data.isPhone && data.phoneCredential) {
        userCredential = data.phoneCredential;
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, data.emailOrPhone, data.password);
      }
      
      const userId = userCredential.user.uid;
      const email = data.isPhone ? null : data.emailOrPhone;
      const phoneNumber = data.isPhone ? data.emailOrPhone : null;
      
      // Look up staff by referral code
      let referredByStaffId = null;
      let memberOfAdminId = null;
      let telegramStaffInfo = "";
      
      if (data.referralCode) {
        try {
          const normalizedCode = data.referralCode.trim().toUpperCase();
          const staffQuery = query(collection(db, 'sla_staff'), where('referral_id', '==', normalizedCode));
          const staffSnapshot = await getDocs(staffQuery);
          if (!staffSnapshot.empty) {
            const staffData = staffSnapshot.docs[0].data();
            referredByStaffId = staffSnapshot.docs[0].id;
            memberOfAdminId = staffData.created_by_admin_id;
            
            const staffName = staffData.name || staffData.username || "Staff";
            telegramStaffInfo = `\n👔 Staff: ${staffName}`;
            
            if (memberOfAdminId) {
              const adminDoc = await getDocs(query(collection(db, 'sla_admins'), where('account_id', '==', memberOfAdminId)));
              if (!adminDoc.empty) {
                telegramStaffInfo += `\n🏢 Admin: ${adminDoc.docs[0].data().name || memberOfAdminId}`;
              }
            }
          }
        } catch (e) {
          console.warn("Could not look up referral code:", e);
        }
      }

      // Create users document
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: email,
        phone_number: phoneNumber,
        first_name: data.firstName,
        last_name: data.lastName,
        role: 'reseller',
        created_at: new Date().toISOString(),
      });

      // Create reseller profile
      const shopNameVal = data.shopName || `${data.firstName}'s Store`;
      const shopSlug = shopNameVal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const referralId = 'GC-' + userId.substring(0, 4).toUpperCase();
      
      // Generate sequential reseller ID
      const q = query(collection(db, 'retail_shops'), orderBy('reseller_id', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      let lastResellerId = 24404;
      if (!snapshot.empty) {
        lastResellerId = snapshot.docs[0].data().reseller_id || 24404;
      }
      const newResellerId = lastResellerId + 1;
      
      const shopSlugVal = shopNameVal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + '-' + Math.random().toString(36).substring(2, 6);
      
      await setDoc(doc(db, 'reseller_profiles', userId), {
        uid: userId,
        user_id: userId,
        shop_name: shopNameVal,
        shop_slug: shopSlugVal,
        referral_id: referralId,
        referral_code: data.referralCode || null,
        balance: 0,
        total_earnings: 0,
        verified: false,
        reseller_id: newResellerId,
        referred_by_staff_id: referredByStaffId,
        member_of_admin_id: memberOfAdminId,
        registration_date: new Date().toISOString(),
      });

      // Create retail shop
      await setDoc(doc(db, 'retail_shops', userId), {
        reseller_id: newResellerId,
        shop_name: shopNameVal,
        shop_slug: shopSlugVal, // Ensure shop_slug is set here too
        level: 'VIP-0',
        product_limit: 20,
        star_rating: 2.0,
        credit_score: 100,
        created_at: new Date().toISOString(),
      });

      // 1. Send Telegram Notification via server API (First, before fetching/navigating)
      try {
        console.log("[REGISTER] Triggering Telegram notification for reseller:", userId);
        const telegramMessage = `<b>New Reseller Registration</b>\n\n` +
          `👤 Name: ${data.firstName} ${data.lastName}\n` +
          `📧 Email/Phone: ${data.emailOrPhone}\n` +
          `🆔 Reseller ID: ${newResellerId}` + 
          `${telegramStaffInfo}\n` +
          `📅 Date: ${new Date().toLocaleString()}`;
        
        await fetch('/api/telegram/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: telegramMessage, threadId: 1 }),
        }).then(res => {
          if (!res.ok) console.error("[REGISTER] Notification error status:", res.status);
          else console.log("[REGISTER] Notification successful.");
        }).catch(err => {
          console.error("[REGISTER] Notification network error:", err);
        });
      } catch (ne) {
        console.error("Error in notification block:", ne);
      }

      // 2. Fetch profile
      await fetchProfile(userId, email || '');

      // 3. Auto-verification (non-blocking)
      setTimeout(async () => {
        try {
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'reseller_profiles', userId), { verified: true });
          console.log(`[AUTO-VERIFY] Reseller ${userId} verified automatically after 2 minutes.`);
          // Refetch profile if still logged in as this user
          if (auth.currentUser?.uid === userId) {
            await fetchProfile(userId, email || '');
          }
        } catch (e) {
          console.error(`[AUTO-VERIFY] Failed to verify reseller ${userId}:`, e);
        }
      }, 2 * 60 * 1000);

      return { success: true };
    } catch (e: unknown) {
      const error = e as Error;
      console.error("Registration error details:", error);
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setReseller(null);
  };

  const updateProfile = async (updates: Partial<ResellerProfile>) => {
    if (!reseller) {
      console.error("[RESELLER_CONTEXT] Cannot update profile: No reseller session active.");
      return;
    }
    
    console.log(`[RESELLER_CONTEXT] Updating profile for ${reseller.id}:`, Object.keys(updates));

    // Update local state optimistically
    setReseller({ ...reseller, ...updates });

    // Sync to Firestore
    try {
      const profileUpdates: Record<string, unknown> = {};
      const userUpdates: Record<string, unknown> = {};
      const shopUpdates: Record<string, unknown> = {};

      if (updates.firstName !== undefined) userUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) userUpdates.last_name = updates.lastName;
      if (updates.email !== undefined) userUpdates.email = updates.email;
      if (updates.phone !== undefined) {
        userUpdates.phone = updates.phone;
        profileUpdates.phone = updates.phone;
      }

      if (updates.shopName !== undefined) {
        profileUpdates.shop_name = updates.shopName;
        shopUpdates.shop_name = updates.shopName;
        
        // Always ensure shop_slug is in shopUpdates
        const slug = reseller.shopSlug || updates.shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + '-' + Math.random().toString(36).substring(2, 6);
        profileUpdates.shop_slug = slug;
        shopUpdates.shop_slug = slug;
        updates.shopSlug = slug; // Update local state too
      }
      if (updates.shopLogo !== undefined) {
        profileUpdates.shop_logo = updates.shopLogo;
        shopUpdates.shop_logo = updates.shopLogo;
      }
      if (updates.shopHeroBanner !== undefined) {
        profileUpdates.shop_hero_banner = updates.shopHeroBanner;
        shopUpdates.shop_hero_banner = updates.shopHeroBanner;
      }
      if (updates.storeTheme !== undefined) {
        profileUpdates.store_theme = updates.storeTheme;
        shopUpdates.store_theme = updates.storeTheme;
      }
      if (updates.profilePicture !== undefined) profileUpdates.profile_picture = updates.profilePicture;
      if (updates.usdtAddress !== undefined) profileUpdates.usdt_address = updates.usdtAddress;
      if (updates.bankInfo !== undefined) profileUpdates.bank_info = updates.bankInfo;
      
      // Ensure shop_slug is present in retail_shops if missing
      if (!reseller.shopSlug && updates.shopName === undefined) {
        const fallbackSlug = (reseller.shopName || 'shop').toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + '-' + Math.random().toString(36).substring(2, 6);
        profileUpdates.shop_slug = fallbackSlug;
        shopUpdates.shop_slug = fallbackSlug;
        updates.shopSlug = fallbackSlug;
      }
      
      const promises: Promise<void>[] = [];

      if (Object.keys(profileUpdates).length > 0) {
        promises.push(setDoc(doc(db, 'reseller_profiles', reseller.id), profileUpdates, { merge: true }));
      }

      if (Object.keys(userUpdates).length > 0) {
        promises.push(setDoc(doc(db, 'users', reseller.id), userUpdates, { merge: true }));
      }

      if (Object.keys(shopUpdates).length > 0) {
        promises.push(setDoc(doc(db, 'retail_shops', reseller.id), shopUpdates, { merge: true }));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        console.log("[RESELLER_CONTEXT] Profile sync successful.");
      }
    } catch (e) {
      console.error("[RESELLER_CONTEXT] Error updating profile:", e);
      handleFirestoreError(e, OperationType.WRITE, `reseller_profiles/${reseller.id}`);
    }
  };

  const toggleProduct = async (productId: string): Promise<{ success: boolean; errorType?: 'limit' | 'permission' | 'error' }> => {
    if (!reseller) return { success: false, errorType: 'error' };
    
    const ids = [...reseller.selectedProductIds];
    const idx = ids.indexOf(productId);
    const selectionDocId = `${reseller.id}_${productId}`;
    
    console.log(`[RESELLER_CONTEXT] Toggling product ${productId}. Current count: ${ids.length}, Limit: ${reseller.productLimit}`);
    
    try {
      if (idx >= 0) {
        // Remove
        ids.splice(idx, 1);
        try {
          await deleteDoc(doc(db, 'reseller_product_selection', selectionDocId));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `reseller_product_selection/${selectionDocId}`);
        }
      } else {
        // Add
        // Check limit
        if (reseller.productLimit && ids.length >= reseller.productLimit) {
          console.warn(`[RESELLER_CONTEXT] Product limit reached: ${ids.length} >= ${reseller.productLimit}`);
          return { success: false, errorType: 'limit' };
        }
        ids.push(productId);
        try {
          await setDoc(doc(db, 'reseller_product_selection', selectionDocId), {
            reseller_id: reseller.id,
            product_id: productId,
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `reseller_product_selection/${selectionDocId}`);
        }
      }
      
      setReseller({ ...reseller, selectedProductIds: ids });
      return { success: true };
    } catch (e) {
      console.error("[RESELLER_CONTEXT] Error toggling product:", e);
      const isPermissionError = e instanceof Error && (e.message.includes('permission-denied') || e.message.includes('insufficient permissions'));
      return { success: false, errorType: isPermissionError ? 'permission' : 'error' };
    }
  };

  const getMyProducts = (): Product[] => {
    if (!reseller) return [];
    return products.filter(p => reseller.selectedProductIds.includes(p.id));
  };

  const getResellerBySlug = (slug: string): ResellerProfile | null => {
    // If the slug matches the current reseller's ID or shopSlug, return the current reseller
    if (reseller && (reseller.id === slug || reseller.shopSlug === slug)) {
      return reseller;
    }
    
    return null;
  };

  const fetchResellerBySlug = async (slug: string): Promise<ResellerProfile | null> => {
    // If it's the current reseller, return it
    if (reseller && (reseller.id === slug || reseller.shopSlug === slug)) return reseller;

    try {
      // 1. Find the reseller UID by querying retail_shops for the shop_slug
      let shopQuery = query(collection(db, 'retail_shops'), where('shop_slug', '==', slug));
      let shopSnapshot = await getDocs(shopQuery);
      
      if (shopSnapshot.empty) {
        // Try camelCase field
        shopQuery = query(collection(db, 'retail_shops'), where('shopSlug', '==', slug));
        shopSnapshot = await getDocs(shopQuery);
      }
      
      if (shopSnapshot.empty) {
        // Fallback: try if slug is actually a UID
        const directShopDoc = await getDoc(doc(db, 'retail_shops', slug));
        if (!directShopDoc.exists()) return null;
        
        const shopData = directShopDoc.data();
        return await fetchResellerById(slug, shopData);
      }

      const shopDoc = shopSnapshot.docs[0];
      const userId = shopDoc.id;
      const shopData = shopDoc.data();
      
      return await fetchResellerById(userId, shopData);
    } catch (error) {
      console.error("Error fetching reseller by slug:", error);
      return null;
    }
  };

  const fetchResellerByName = async (name: string): Promise<ResellerProfile | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    console.log(`[RESELLER_CONTEXT] Searching for shop by name, ID, or slug: "${trimmedName}"`);
    
    try {
      // 1. Try exact name match (case-sensitive) - Fastest
      let shopQuery = query(collection(db, 'retail_shops'), where('shop_name', '==', trimmedName));
      let shopSnapshot = await getDocs(shopQuery);
      
      if (shopSnapshot.empty) {
        // Try camelCase field
        shopQuery = query(collection(db, 'retail_shops'), where('shopName', '==', trimmedName));
        shopSnapshot = await getDocs(shopQuery);
      }
      
      if (!shopSnapshot.empty) {
        const shopDoc = shopSnapshot.docs[0];
        console.log(`[RESELLER_CONTEXT] Found shop by exact name: ${shopDoc.data().shop_name || shopDoc.data().shopName}`);
        return await fetchResellerById(shopDoc.id, shopDoc.data());
      }

      // 2. Try numeric ID match (if it looks like 1CRXXXXX or just XXXXX)
      const numericIdMatch = trimmedName.match(/\d+/);
      if (numericIdMatch) {
        const numericId = parseInt(numericIdMatch[0]);
        console.log(`[RESELLER_CONTEXT] Trying numeric ID match: ${numericId}`);
        const idQuery = query(collection(db, 'retail_shops'), where('reseller_id', '==', numericId));
        const idSnapshot = await getDocs(idQuery);
        if (!idSnapshot.empty) {
          const shopDoc = idSnapshot.docs[0];
          console.log(`[RESELLER_CONTEXT] Found shop by numeric ID: ${shopDoc.data().shop_name}`);
          return await fetchResellerById(shopDoc.id, shopDoc.data());
        }
      }

      // 3. Try exact slug match
      const slugQuery = query(collection(db, 'retail_shops'), where('shop_slug', '==', trimmedName.toLowerCase()));
      const slugSnapshot = await getDocs(slugQuery);
      if (!slugSnapshot.empty) {
        const shopDoc = slugSnapshot.docs[0];
        console.log(`[RESELLER_CONTEXT] Found shop by slug: ${shopDoc.data().shop_name}`);
        return await fetchResellerById(shopDoc.id, shopDoc.data());
      }

      // 4. Robust client-side fallback (handles case-insensitivity, extra spaces, and common typos)
      console.log(`[RESELLER_CONTEXT] No exact match, trying robust client-side fallback...`);
      const allShopsSnapshot = await getDocs(collection(db, 'retail_shops'));
      
      const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
      const normalizedQuery = normalize(trimmedName);
      
      // First try exact normalized match
      let match = allShopsSnapshot.docs.find(doc => {
        const data = doc.data();
        const normalizedName = normalize(data.shop_name || data.shopName || '');
        const normalizedSlug = normalize(data.shop_slug || data.shopSlug || '');
        return normalizedName === normalizedQuery || normalizedSlug === normalizedQuery;
      });
      
      // If still no match, try substring match
      if (!match) {
        console.log(`[RESELLER_CONTEXT] No exact normalized match, trying substring match...`);
        match = allShopsSnapshot.docs.find(doc => {
          const data = doc.data();
          const normalizedName = normalize(data.shop_name || data.shopName || '');
          const normalizedSlug = normalize(data.shop_slug || data.shopSlug || '');
          return normalizedName.includes(normalizedQuery) || normalizedSlug.includes(normalizedQuery);
        });
      }
      
      if (match) {
        console.log(`[RESELLER_CONTEXT] Found match: "${match.data().shop_name}"`);
        return await fetchResellerById(match.id, match.data());
      }
      
      console.log(`[RESELLER_CONTEXT] No shop found for: "${trimmedName}"`);
      return null;
    } catch (error) {
      console.error("Error fetching reseller by name:", error);
      return null;
    }
  };

  const fetchResellerById = async (userId: string, shopData: unknown): Promise<ResellerProfile | null> => {
    try {
      // Fetch selection (publicly readable)
      const selectionQuery = query(collection(db, 'reseller_product_selection'), where('reseller_id', '==', userId));
      const selectionSnapshot = await getDocs(selectionQuery);
      const selectedProductIds = selectionSnapshot.docs.map(doc => doc.data().product_id);

      // Note: We cannot fetch reseller_profiles or users if not staff/owner due to security rules.
      // We rely on retail_shops for public storefront data.
      
      const data = shopData as {
        shop_name?: string;
        shopName?: string;
        shop_slug?: string;
        shopSlug?: string;
        shop_logo?: string;
        shopLogo?: string;
        shop_hero_banner?: string;
        shopHeroBanner?: string;
        store_theme?: string;
        storeTheme?: string;
        star_rating?: number;
        starRating?: number;
        credit_score?: number;
        creditScore?: number;
        level?: string;
        product_limit?: number;
        productLimit?: number;
      };

      return {
        ...DEFAULT_PROFILE_TEMPLATE,
        id: userId,
        shopName: data.shop_name || data.shopName || 'My Shop',
        shopSlug: data.shop_slug || data.shopSlug || userId, // Fallback to UID if slug is missing
        shopLogo: data.shop_logo || data.shopLogo || '',
        shopHeroBanner: data.shop_hero_banner || data.shopHeroBanner || '',
        storeTheme: (data.store_theme || data.storeTheme || 'minimal') as StoreTheme,
        starRating: data.star_rating || data.starRating || 2.0,
        creditScore: data.credit_score || data.creditScore || 100,
        level: data.level || "VIP-0",
        productLimit: data.product_limit || data.productLimit || 20,
        selectedProductIds,
        verified: true, // If they have a shop, we consider them active
      } as ResellerProfile;
    } catch (error) {
      console.error("Error in fetchResellerById:", error);
      return null;
    }
  };

  return (
    <ResellerContext.Provider value={{ reseller, loading, login, register, logout, updateProfile, toggleProduct, getMyProducts, getResellerBySlug, fetchResellerBySlug, fetchResellerByName }}>
      {loading ? <AppLoading text="Loading your store..." /> : children}
    </ResellerContext.Provider>
  );
}

