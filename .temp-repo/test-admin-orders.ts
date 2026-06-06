import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, 'global-cart-prod-us');

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, "arkarnaung009@gmail.com", "123456");
    console.log("Admin Logged in UID:", cred.user.uid);
    const s1 = await getDocs(collection(db, "orders"));
    console.log("Total Orders:", s1.size);
    let sample = 0;
    s1.forEach(d => {
      if(sample++ < 3) {
        console.log("Order:", d.id, "reseller_id:", d.data().reseller_id, "resellerId:", d.data().resellerId);
      }
    });

  } catch(e) {
    console.error("Error:", e.message);
  }
}
run();
