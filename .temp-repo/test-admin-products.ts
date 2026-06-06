import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

// Initialize with application default credentials or just config if possible?
// Since it's App Engine/Cloud Run environment, initializeApp() uses default credentials.
const app = initializeApp({
  projectId: config.projectId,
});

const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const snapshot = await db.collection('products').get();
    console.log('Admin success, docs found:', snapshot.size);
    process.exit(0);
  } catch(e) {
    console.error('Error admin:', e.message);
    process.exit(1);
  }
}

test();
