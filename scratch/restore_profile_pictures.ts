import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Firebase Setup
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("Missing service-account.json");
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const firebaseApp = !getApps().length ? initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
}) : getApps()[0];

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfigFile = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
const databaseId = firebaseConfigFile.firestoreDatabaseId || "(default)";
const firestoreDb = getFirestore(firebaseApp, databaseId);

async function run() {
  console.log("=== STEP 1: Fetching Firebase data ===");
  const usersSnapshot = await firestoreDb.collection('users').get();
  const firestoreUsers = new Map(); // firestoreUid -> email
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.email) firestoreUsers.set(doc.id, data.email.toLowerCase().trim());
  });
  console.log(`Loaded ${firestoreUsers.size} users from Firestore.`);

  const profilesSnapshot = await firestoreDb.collection('reseller_profiles').get();
  console.log(`Loaded ${profilesSnapshot.size} reseller profiles from Firestore.`);

  console.log("=== STEP 2: Fetching Supabase users ===");
  const { data: supabaseUsers, error: sbUsersError } = await supabase.from('users').select('id, email');
  if (sbUsersError) {
    console.error("Error fetching Supabase users:", sbUsersError);
    return;
  }
  const emailToSupabaseId = new Map(); // email -> supabaseUuid
  supabaseUsers.forEach(u => {
    if (u.email) emailToSupabaseId.set(u.email.toLowerCase().trim(), u.id);
  });
  console.log(`Loaded ${emailToSupabaseId.size} users from Supabase.`);

  console.log("=== STEP 3: Restoring customizations to Supabase columns ===");
  let restoredCount = 0;
  for (const doc of profilesSnapshot.docs) {
    const data = doc.data();
    const firestoreUid = doc.id;
    const email = firestoreUsers.get(firestoreUid);
    
    if (!email) {
      console.warn(`No email found for Firestore UID ${firestoreUid}`);
      continue;
    }

    const supabaseId = emailToSupabaseId.get(email);
    if (!supabaseId) {
      console.warn(`No matching Supabase user found for email ${email}`);
      continue;
    }

    const profilePicture = data.profile_picture || data.profilePicture || "";
    const shopLogo = data.shop_logo || data.shopLogo || "";
    const shopHeroBanner = data.shop_hero_banner || data.shopHeroBanner || "";
    const shopSlug = data.shop_slug || "";
    const storeTheme = data.store_theme || "";

    if (profilePicture || shopLogo || shopHeroBanner || shopSlug || storeTheme) {
      console.log(`Restoring customization fields for email: ${email} (Supabase ID: ${supabaseId})`);
      
      const updates: any = {};
      if (profilePicture) updates.profile_picture = profilePicture;
      if (shopLogo) updates.shop_logo = shopLogo;
      if (shopHeroBanner) updates.shop_hero_banner = shopHeroBanner;
      if (shopSlug) updates.shop_slug = shopSlug;
      if (storeTheme) updates.store_theme = storeTheme;

      const { error: updateError } = await supabase
        .from('reseller_profiles')
        .update(updates)
        .eq('id', supabaseId);

      if (updateError) {
        console.error(`  ❌ Failed to update Supabase reseller profile for ${email}:`, updateError.message);
      } else {
        console.log(`  ✅ Successfully updated columns in Supabase!`);
        restoredCount++;
      }
    }
  }

  console.log(`=== Done! Restored ${restoredCount} reseller profiles customization columns. ===`);
}

run().catch(console.error);
