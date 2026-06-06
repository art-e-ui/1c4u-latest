import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  projectId: config.projectId,
});

const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    console.log(`Testing connection to project: ${config.projectId}, database: ${config.firestoreDatabaseId}`);
    const snapshot = await db.collection('users').limit(1).get();
    console.log('Connection successful. Documents found:', snapshot.size);
  } catch (e) {
    console.error('Connection failed:', e);
  }
}

test();
