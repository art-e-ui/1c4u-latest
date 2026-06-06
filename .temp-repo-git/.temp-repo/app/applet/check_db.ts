import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const snap = await getDocs(collection(db, "virtual_customer_profiles"));
  console.log("Found", snap.docs.length, "profiles in DB");
  snap.docs.slice(0, 5).forEach(doc => {
    console.log(doc.id, doc.data().name);
  });
  process.exit(0);
}
check();
