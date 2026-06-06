import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("=== FIRESTORE RESELLERS ===");
  const fsSnap = await getDocs(collection(db, "reseller_profiles"));
  fsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.unpicked_balance > 0 || data.status === "Pending" || !data.verified) {
      console.log(`ID: ${doc.id}, Name: ${data.full_name || data.firstName}, Shop: ${data.shop_name}, Unpicked Balance: ${data.unpicked_balance}, Status: ${data.status}, Verified: ${data.verified}`);
    }
  });

  console.log("\n=== SUPABASE RESELLERS ===");
  const { data: sbResellers, error } = await supabase
    .from("reseller_profiles")
    .select("*");
  
  if (error) {
    console.error("Supabase Error:", error);
    return;
  }

  sbResellers.forEach((r) => {
    if (r.unpicked_balance > 0 || r.status === "Pending" || !r.verified) {
      console.log(`ID: ${r.id}, Name: ${r.full_name}, Phone: ${r.phone}, Unpicked Balance: ${r.unpicked_balance}, Status: ${r.status}, Verified: ${r.verified}`);
    }
  });
}

check().catch(console.error);
