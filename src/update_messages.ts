import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const OLD_NAMES = [
  "John Doe", "Jane Smith", "Michael Johnson", "Emily Davis", "David Brown",
  "Sarah Wilson", "James Taylor", "Jessica Anderson", "Robert Thomas", "Linda Jackson",
  "William White", "Elizabeth Harris", "Richard Martin", "Mary Thompson", "Joseph Garcia",
  "Susan Martinez", "Charles Robinson", "Margaret Clark", "Thomas Rodriguez", "Dorothy Lewis",
  "Christopher Lee", "Lisa Walker", "Daniel Hall", "Nancy Allen", "Matthew Young",
  "Karen Hernandez", "Anthony King", "Betty Wright", "Mark Lopez", "Helen Hill",
  "Donald Scott", "Sandra Green", "Steven Adams", "Donna Baker", "Paul Gonzalez",
  "Carol Nelson", "Andrew Carter", "Ruth Mitchell", "Joshua Perez", "Sharon Roberts",
  "Kenneth Turner", "Michelle Phillips", "Kevin Campbell", "Laura Parker", "Brian Evans",
  "Sarah Edwards", "George Collins", "Kimberly Stewart", "Edward Sanchez", "Deborah Morris"
];

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
  const messagesSnap = await getDocs(collection(db, "reseller_chat_messages"));
  let updatedMessages = 0;
  for (const docSnap of messagesSnap.docs) {
    const data = docSnap.data();
    if (data.sender === "admin" && data.message) {
      let newMessage = data.message;
      for (let i = 0; i < OLD_NAMES.length; i++) {
        const oldName = OLD_NAMES[i];
        const newName = STATIC_VIRTUAL_PROFILES[i].name;
        if (newMessage.includes(`[${oldName}]:`)) {
          newMessage = newMessage.replace(`[${oldName}]:`, `[${newName}]:`);
          await updateDoc(doc(db, "reseller_chat_messages", docSnap.id), {
            message: newMessage
          });
          updatedMessages++;
          break;
        }
      }
    }
  }
  console.log(`Updated ${updatedMessages} messages`);

  process.exit(0);
}
updateDb();
