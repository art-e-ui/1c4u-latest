import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

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

console.log(`Connecting to Firestore database [${databaseId}]...`);
const firestoreDb = getFirestore(firebaseApp, databaseId);

async function inspect() {
  console.log("Fetching reseller_profiles from Firestore...");
  const snapshot = await firestoreDb.collection('reseller_profiles').get();
  console.log(`Found ${snapshot.size} profiles.`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`UID: ${doc.id}`);
    console.log("  reseller_id:", data.reseller_id);
    console.log("  profile_picture exists:", !!(data.profile_picture || data.profilePicture));
    if (data.profile_picture || data.profilePicture) {
      const pic = data.profile_picture || data.profilePicture;
      console.log("  profile_picture length:", pic.length);
      console.log("  profile_picture preview:", pic.substring(0, 100));
    }
    console.log("  shop_logo exists:", !!data.shop_logo);
    console.log("  shop_hero_banner exists:", !!data.shop_hero_banner);
    console.log("  shop_slug:", data.shop_slug);
    console.log("  store_theme:", data.store_theme);
    console.log("  level:", data.level);
    console.log("----------------------------------------");
  });
}

inspect().catch(console.error);
