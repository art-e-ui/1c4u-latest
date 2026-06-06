import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const messagesSnap = await getDocs(collection(db, "reseller_chat_messages"));
  messagesSnap.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.sender === "admin" && data.message && data.message.startsWith("[")) {
      console.log(data.message.substring(0, 30));
    }
  });
  process.exit(0);
}
check();
