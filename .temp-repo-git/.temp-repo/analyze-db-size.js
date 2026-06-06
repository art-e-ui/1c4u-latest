import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, "global-cart-prod-us");

async function investigateSize() {
  const collections = [
    'orders', 
    'reseller_chat_messages', 
    'reseller_profiles', 
    'users',
    'deposit_requests',
    'withdrawal_requests',
    'system_settings'
  ];

  console.log("--- Collection Density Analysis ---");
  
  for (const colName of collections) {
    try {
      const q = query(collection(db, colName), limit(1));
      const snap = await getDocs(q);
      console.log(`${colName}: Found at least ${snap.size} documents (limit 1 test)`);
    } catch (e) {
      console.error(`Error counting ${colName}:`, e.message);
    }
  }
  process.exit(0);
}

investigateSize();
