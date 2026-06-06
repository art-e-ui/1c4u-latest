import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

const configPath = './firebase-applet-config.json';
const firebaseConfigFile = JSON.parse(fs.readFileSync(configPath, "utf8"));

let app;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
} else {
  app = initializeApp({ projectId: firebaseConfigFile.projectId });
}

const db = getFirestore(app, firebaseConfigFile.firestoreDatabaseId || "(default)");

async function check() {
  const doc = await db.collection('system_settings').doc('shopify_sync').get();
  console.log(doc.data());
}
check().catch(console.error);
