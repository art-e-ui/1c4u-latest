import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfigFile = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};

const adminApp = !getAdminApps().length 
  ? initializeAdminApp({ projectId: firebaseConfigFile.projectId }) 
  : getAdminApps()[0];

const databaseId = firebaseConfigFile.firestoreDatabaseId || "(default)";
const adminDb = getAdminFirestore(adminApp, databaseId);

async function test() {
  try {
    const snapshot = await adminDb.collection('reseller_profiles').orderBy('reseller_id', 'desc').limit(1).get();
    console.log("Success! Read reseller_profiles.");
  } catch (e) {
    console.error("Failed to read reseller_profiles:", e);
  }
}

test().catch(console.error);
