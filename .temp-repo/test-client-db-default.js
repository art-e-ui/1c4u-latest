import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app); // uses default

async function test() {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    console.log('Success, docs found in default:', snapshot.size);
    process.exit(0);
  } catch(e) {
    console.error('Error default:', e.message);
    process.exit(1);
  }
}

test();
