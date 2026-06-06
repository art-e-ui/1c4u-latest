import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const STATIC_VIRTUAL_PROFILES = [
  { id: "vp-1", name: "Budi Santoso" },
  { id: "vp-2", name: "Siti Aminah" },
  { id: "vp-3", name: "Agus Setiawan" },
  { id: "vp-4", name: "Sri Wahyuni" },
  { id: "vp-5", name: "Bambang Hermawan" },
  { id: "vp-6", name: "Ratna Sari" },
  { id: "vp-7", name: "Dedi Kurniawan" },
  { id: "vp-8", name: "Ani Lestari" },
  { id: "vp-9", name: "Hendra Wijaya" },
  { id: "vp-10", name: "Maya Puspita" },
  { id: "vp-11", name: "Juan Dela Cruz" },
  { id: "vp-12", name: "Maria Clara" },
  { id: "vp-13", name: "Jose Rizal" },
  { id: "vp-14", name: "Angel Locsin" },
  { id: "vp-15", name: "Manny Pacquiao" },
  { id: "vp-16", name: "Catriona Gray" },
  { id: "vp-17", name: "Ferdinand Marcos" },
  { id: "vp-18", name: "Corazon Aquino" },
  { id: "vp-19", name: "Rodrigo Duterte" },
  { id: "vp-20", name: "Leni Robredo" },
  { id: "vp-21", name: "Mohammed Al-Farsi" },
  { id: "vp-22", name: "Fatima Zahra" },
  { id: "vp-23", name: "Ahmed Hassan" },
  { id: "vp-24", name: "Aisha Mahmoud" },
  { id: "vp-25", name: "Omar Al-Khattab" },
  { id: "vp-26", name: "Layla Ibrahim" },
  { id: "vp-27", name: "Khalid bin Walid" },
  { id: "vp-28", name: "Mariam Mansour" },
  { id: "vp-29", name: "Yusuf Ali" },
  { id: "vp-30", name: "Zainab Hassan" },
  { id: "vp-31", name: "Eko Prasetyo" },
  { id: "vp-32", name: "Dewi Sartika" },
  { id: "vp-33", name: "Rizky Ramadhan" },
  { id: "vp-34", name: "Putri Indah" },
  { id: "vp-35", name: "Aditya Wijaya" },
  { id: "vp-36", name: "Paolo Santos" },
  { id: "vp-37", name: "Liza Soberano" },
  { id: "vp-38", name: "Daniel Padilla" },
  { id: "vp-39", name: "Kathryn Bernardo" },
  { id: "vp-40", name: "Piolo Pascual" },
  { id: "vp-41", name: "Abdullah Al-Sayed" },
  { id: "vp-42", name: "Noor Al-Falah" },
  { id: "vp-43", name: "Mustafa Kamal" },
  { id: "vp-44", name: "Yasmin Rashid" },
  { id: "vp-45", name: "Ibrahim Khalil" },
  { id: "vp-46", name: "Siti Nurhaliza" },
  { id: "vp-47", name: "Lee Hsien Loong" },
  { id: "vp-48", name: "Prayut Chan-o-cha" },
  { id: "vp-49", name: "Nguyen Xuan Phuc" },
  { id: "vp-50", name: "Hun Sen" }
];

async function updateDb() {
  const ordersSnap = await getDocs(collection(db, "orders"));
  let updatedOrders = 0;
  for (const docSnap of ordersSnap.docs) {
    const data = docSnap.data();
    if (data.user_id) {
      const profile = STATIC_VIRTUAL_PROFILES.find(p => p.id === data.user_id);
      if (profile && data.profileName !== profile.name) {
        await updateDoc(doc(db, "orders", docSnap.id), {
          profileName: profile.name,
          customerName: profile.name
        });
        updatedOrders++;
      }
    }
  }
  console.log(`Updated ${updatedOrders} orders`);

  process.exit(0);
}
updateDb();
