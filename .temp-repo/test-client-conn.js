import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const docRef = doc(db, '_connection_test_', 'ping');
    const docSnap = await getDoc(docRef);
    console.log('Success, doc test result exists:', docSnap.exists());
    process.exit(0);
  } catch(e) {
    console.error('Error test:', e);
    process.exit(1);
  }
}

test();
