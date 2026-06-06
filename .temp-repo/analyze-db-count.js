import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getCountFromServer } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, "global-cart-prod-us");

async function investigateSize() {
  const collections = [
    'orders', 
    'reseller_chat_messages', 
    'reseller_customer_chat_messages',
    'support_messages',
    'reseller_profiles', 
    'users',
    'deposit_requests',
    'withdrawal_requests',
    'system_settings',
    'products',
    'reviews',
    'reseller_chat_sessions'
  ];

  console.log("--- Collection Count Analysis ---");
  
  for (const colName of collections) {
    try {
      const coll = collection(db, colName);
      const snapshot = await getCountFromServer(coll);
      console.log(`${colName}: ${snapshot.data().count} documents`);
    } catch (e) {
      console.error(`Error counting ${colName}:`, e.message);
    }
  }
  process.exit(0);
}

investigateSize();
