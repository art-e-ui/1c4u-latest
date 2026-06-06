import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, or } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, 'global-cart-prod-us');

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "arkarnaung009@gmail.com", "password");
    console.log("Logged in UID:", cred.user.uid);
    // test query 1
    const q1 = query(collection(db, "orders"), where("reseller_id", "==", cred.user.uid));
    const s1 = await getDocs(q1);
    console.log("Q1 docs:", s1.size);
    // test query 2
    const q2 = query(collection(db, "orders"), where("resellerId", "==", cred.user.uid));
    const s2 = await getDocs(q2);
    console.log("Q2 docs:", s2.size);
  } catch(e) {
    console.error("Error:", e.message);
  }
}
run();
