/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// -------------------------------------------------------------
// 1. Initializing Connections & Settings
// -------------------------------------------------------------
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfigFile = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};

const serviceAccountPath = path.join(process.cwd(), "service-account.json");
let firebaseApp: App;

if (fs.existsSync(serviceAccountPath)) {
  console.log("Found service-account.json! Initializing Firestore Admin SDK with service account...");
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  firebaseApp = !getApps().length ? initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  }) : getApps()[0];
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log("Found FIREBASE_SERVICE_ACCOUNT environment variable! Initializing Firestore Admin with cert credentials...");
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  firebaseApp = !getApps().length ? initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  }) : getApps()[0];
} else {
  console.error("No service account credentials file found.");
  process.exit(1);
}

const databaseId = firebaseConfigFile.firestoreDatabaseId || "(default)";
console.log(`Connecting to Firestore database [${databaseId}]...`);
const firestoreDb = getFirestore(firebaseApp, databaseId);

// Supabase Init
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase URL or Service Role Key in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// -------------------------------------------------------------
// 2. Tables Schema Catalog (Exact PostgreSQL Columns)
// -------------------------------------------------------------
const TABLE_COLUMNS: Record<string, string[]> = {
  categories: ["id", "name", "description", "image", "created_at", "updated_at"],
  products: ["id", "name", "description", "price", "image", "images", "category_id", "stock", "status", "created_at", "updated_at"],
  users: ["id", "email", "role", "first_name", "last_name", "phone_number", "status", "created_at", "updated_at"],
  reseller_profiles: [
    "id", "reseller_id", "full_name", "first_name", "last_name", "phone", "verified", "status", 
    "balance", "unpicked_balance", "password_reset_requested", "has_requested_password_reset", 
    "member_of_admin_id", "referred_by_staff_id", "referral_code", "total_earnings", 
    "total_deposits", "total_withdrawals", "total_orders", "pending_balance", "usdt_address", "bank_info",
    "created_at", "updated_at"
  ],
  retail_shops: ["id", "shop_name", "level", "product_limit", "domain", "created_at", "updated_at"],
  sla_admins: ["id", "value", "created_at"],
  sla_staff: ["id", "value", "created_at"],
  system_settings: ["id", "value", "created_at", "updated_at"],
  orders: ["id", "user_id", "reseller_id", "reseller_uid", "total_amount", "status", "shipping_address", "payment_method", "payment_status", "created_at", "updated_at"],
  deposit_requests: ["id", "reseller_id", "reseller_doc_id", "amount", "status", "payment_method", "receipt_url", "created_at", "updated_at"],
  withdrawal_requests: ["id", "reseller_id", "reseller_doc_id", "amount", "status", "bank_name", "account_number", "account_name", "created_at", "updated_at"],
  support_sessions: ["id", "user_email", "user_name", "status", "created_at"],
  support_messages: ["id", "session_id", "sender_name", "sender_role", "message", "created_at"],
  reseller_chat_sessions: ["id", "reseller_id", "status", "last_message_at", "created_at"],
  reseller_chat_messages: ["id", "session_id", "sender_id", "sender_role", "message", "image_url", "created_at"],
  reseller_customer_chat_sessions: ["id", "reseller_id", "customer_id", "customer_name", "last_message_at", "created_at"],
  reseller_customer_chat_messages: ["id", "session_id", "sender_id", "sender_role", "message", "image_url", "created_at"],
  reseller_product_selection: ["id", "reseller_id", "product_id", "created_at"],
  ach_customers: ["id", "user_id", "routing_number", "account_number", "account_type", "created_at"],
  ach_financials: ["id", "transaction_id", "amount", "status", "created_at"],
  virtual_customer_profiles: ["id", "config", "created_at"],
  virtual_profiles: ["id", "config", "created_at"],
  seasonal_themes: ["id", "name", "status", "config", "created_at"]
};

// -------------------------------------------------------------
// 3. Helpers for Schema Conversion and JSON Columns
// -------------------------------------------------------------
function packJsonColumns(data: any, tableName: string): any {
  if (["system_settings", "sla_admins", "sla_staff", "virtual_customer_profiles", "virtual_profiles", "seasonal_themes"].includes(tableName)) {
    const jsonCol = ["system_settings", "sla_admins", "sla_staff"].includes(tableName) ? "value" : "config";
    const cleanData: any = {};
    const jsonPayload: any = {};
    
    if (data.id !== undefined) cleanData.id = data.id;
    if (data.created_at !== undefined) cleanData.created_at = data.created_at;
    if (data.updated_at !== undefined) cleanData.updated_at = data.updated_at;
    
    for (const key of Object.keys(data)) {
      if (key !== "id" && key !== "created_at" && key !== "updated_at" && key !== jsonCol) {
        jsonPayload[key] = data[key];
      }
    }
    
    cleanData[jsonCol] = jsonPayload;
    return cleanData;
  }
  return data;
}

// Convert Firestore timestamp types or nested dates into ISO string
function sanitizeTimestamps(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data === "object") {
    // Check if Firestore Timestamp object
    if (data._seconds !== undefined && data._nanoseconds !== undefined) {
      return new Date(data._seconds * 1000).toISOString();
    }
    if (typeof data.toDate === "function") {
      return data.toDate().toISOString();
    }
    
    // Recursively convert objects and arrays
    const result: any = Array.isArray(data) ? [] : {};
    for (const key of Object.keys(data)) {
      result[key] = sanitizeTimestamps(data[key]);
    }
    return result;
  }
  return data;
}

// -------------------------------------------------------------
// 4. Mapping Logic: Firestore Objects -> Standardized Supabase Data
// -------------------------------------------------------------
function mapFirestoreToSupabase(docId: string, rawData: any, table: string, usersMap: Map<string, any>, chatSessionsMap: Map<string, any>, idMap: Map<string, string>): any {
  
  if (['users', 'reseller_profiles', 'retail_shops', 'sla_admins', 'sla_staff'].includes(table) && idMap.has(docId)) {
    docId = idMap.get(docId);
  }
  const data = sanitizeTimestamps({ id: docId, ...rawData });
  
  let mapped: any = { ...data };

  if (table === "products") {
    mapped = {
      id: docId,
      name: data.name,
      description: data.description || "",
      price: data.price || 0,
      image: data.image || data.image_url || "",
      images: data.images || (data.image_url ? [data.image_url] : null),
      category_id: data.category_id || data.category_slug || data.category || "",
      stock: data.stock !== undefined ? data.stock : 0,
      status: data.status || (data.in_stock ? "Active" : "Draft"),
      created_at: data.created_at || data.createdAt || new Date().toISOString(),
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
    };
  } else if (table === "users") {
    mapped = {
      id: docId,
      email: data.email || "",
      role: data.role || "reseller",
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      phone_number: data.phone_number || data.phone || "",
      status: data.status || "Active",
      created_at: data.created_at || data.createdAt || new Date().toISOString(),
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
    };
  } else if (table === "reseller_profiles") {
    const userDoc = usersMap.get(docId);
    const fullName = data.full_name || data.reseller_name || (userDoc ? `${userDoc.first_name || ""} ${userDoc.last_name || ""}`.trim() : "Reseller");
    mapped = {
      id: docId,
      reseller_id: idMap.get(data.reseller_id || docId) || data.reseller_id || docId,
      full_name: fullName,
      first_name: data.first_name || userDoc?.first_name || "",
      last_name: data.last_name || userDoc?.last_name || "",
      phone: data.phone || (userDoc ? userDoc.phone || userDoc.phone_number : null) || "",
      verified: data.verified !== undefined ? data.verified : false,
      status: data.status || "Approved",
      balance: data.balance !== undefined ? data.balance : 0,
      unpicked_balance: data.unpicked_balance !== undefined ? data.unpicked_balance : 0,
      password_reset_requested: data.password_reset_requested !== undefined ? data.password_reset_requested : false,
      has_requested_password_reset: data.has_requested_password_reset !== undefined ? data.has_requested_password_reset : false,
      member_of_admin_id: data.member_of_admin_id || "",
      referred_by_staff_id: data.referred_by_staff_id || "",
      referral_code: data.referral_code || data.referral_id || "",
      total_earnings: data.total_earnings !== undefined ? data.total_earnings : 0,
      total_deposits: data.total_deposits !== undefined ? data.total_deposits : 0,
      total_withdrawals: data.total_withdrawals !== undefined ? data.total_withdrawals : 0,
      total_orders: data.total_orders !== undefined ? data.total_orders : 0,
      pending_balance: data.pending_balance !== undefined ? data.pending_balance : 0,
      usdt_address: data.usdt_address || "",
      bank_info: data.bank_info || data.bankInfo || {},
      created_at: data.created_at || data.createdAt || data.registration_date || new Date().toISOString(),
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
    };
  } else if (table === "retail_shops") {
    mapped = {
      id: docId,
      shop_name: data.shop_name || "Retail Shop",
      level: data.level || 1,
      product_limit: data.product_limit || 50,
      domain: data.domain || data.shop_slug || "",
      created_at: data.created_at || data.createdAt || new Date().toISOString(),
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
    };
  } else if (table === "orders") {
    mapped = {
      id: docId,
      user_id: idMap.get(data.user_id) || data.user_id || "",
      reseller_id: idMap.get(data.reseller_id || data.resellerId) || data.reseller_id || data.resellerId || "",
      reseller_uid: idMap.get(data.resellerDocId || data.reseller_id || data.resellerId) || data.resellerDocId || data.reseller_id || data.resellerId || "",
      total_amount: data.total_amount || 0,
      status: data.status || "Pending",
      shipping_address: data.shipping_address || data.shippingAddress || "",
      payment_method: data.payment_method || "Bank Transfer",
      payment_status: data.payment_status || "Paid",
      created_at: data.created_at || data.createdAt || new Date().toISOString(),
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
    };
  } else if (table === "deposit_requests") {
    mapped = {
      id: docId,
      reseller_id: data.resellerId || data.reseller_id || "",
      reseller_doc_id: idMap.get(data.resellerDocId) || data.resellerDocId || "",
      amount: data.amount || 0,
      status: (data.status || "pending").toLowerCase(), // Lowercase strictly for Postgres check constraint!
      payment_method: data.payment_method || data.method || "Bank Transfer",
      receipt_url: data.receipt_url || data.proofImage || "",
      created_at: data.created_at || data.createdAt || new Date().toISOString(),
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
    };
  } else if (table === "withdrawal_requests") {
    mapped = {
      id: docId,
      reseller_id: data.resellerId || data.reseller_id || "",
      reseller_doc_id: idMap.get(data.resellerDocId) || data.resellerDocId || "",
      amount: data.amount || 0,
      status: (data.status || "pending").toLowerCase(), // Lowercase strictly for Postgres check constraint!
      bank_name: data.bankInfo?.bankName || data.bank_name || "",
      account_number: data.bankInfo?.accountNumber || data.account_number || "",
      account_name: data.bankInfo?.accountName || data.account_name || "",
      created_at: data.created_at || data.createdAt || new Date().toISOString(),
      updated_at: data.updated_at || data.updatedAt || new Date().toISOString()
    };
  } else if (table === "support_sessions") {
    mapped = {
      id: docId,
      user_email: data.user_email || (data.user_id ? usersMap.get(data.user_id)?.email : "") || "",
      user_name: data.customer_name || data.user_name || "Customer",
      status: data.status || "active",
      created_at: data.created_at || data.last_message_at || new Date().toISOString()
    };
  } else if (table === "support_messages") {
    mapped = {
      id: docId,
      session_id: data.session_id || "",
      sender_name: data.sender_name || data.sender || "staff",
      sender_role: data.sender_role || (data.sender === "customer" ? "customer" : "staff"),
      message: data.message || "",
      created_at: data.created_at || new Date().toISOString()
    };
  } else if (table === "reseller_chat_sessions") {
    mapped = {
      id: docId,
      reseller_id: idMap.get(data.reseller_id) || data.reseller_id || "",
      status: data.status || "active",
      last_message_at: data.last_message_at || data.created_at || new Date().toISOString(),
      created_at: data.created_at || new Date().toISOString()
    };
  } else if (table === "reseller_chat_messages") {
    const session = chatSessionsMap.get(data.session_id);
    const rawSenderId = data.sender_id || (data.sender === "reseller" ? (session?.reseller_id || "") : "admin");
    const mappedSenderId = idMap.get(rawSenderId) || rawSenderId;
    mapped = {
      id: docId,
      session_id: data.session_id || "",
      sender_id: mappedSenderId,
      sender_role: data.sender_role || data.sender || "admin",
      message: data.message || "",
      image_url: data.image_url || null,
      created_at: data.created_at || new Date().toISOString()
    };
  } else if (table === "reseller_customer_chat_sessions") {
    mapped = {
      id: docId,
      reseller_id: idMap.get(data.reseller_id) || data.reseller_id || "",
      customer_name: data.customer_name || "Customer",
      last_message_at: data.last_message_at || data.created_at || new Date().toISOString(),
      created_at: data.created_at || new Date().toISOString()
    };
  } else if (table === "reseller_customer_chat_messages") {
    mapped = {
      id: docId,
      session_id: data.session_id || "",
      sender_id: idMap.get(data.sender_id) || data.sender_id || "",
      sender_role: data.sender_role || data.sender || "customer",
      message: data.message || "",
      image_url: data.image_url || null,
      created_at: data.created_at || new Date().toISOString()
    };
  } else if (table === "reseller_product_selection") {
    mapped = {
      id: docId,
      reseller_id: idMap.get(data.reseller_id) || data.reseller_id || "",
      product_id: data.product_id || "",
      created_at: data.created_at || new Date().toISOString()
    };
  } else if (table === "ach_customers") {
    mapped = {
      id: docId,
      user_id: idMap.get(data.user_id) || data.user_id || "",
      routing_number: data.routing_number || "",
      account_number: data.account_number || "",
      account_type: data.account_type || "Checking",
      created_at: data.created_at || new Date().toISOString()
    };
  } else if (table === "ach_financials") {
    mapped = {
      id: docId,
      transaction_id: data.transaction_id || "",
      amount: data.amount || 0,
      status: data.status || "Pending",
      created_at: data.created_at || new Date().toISOString()
    };
  } else if (["system_settings", "sla_admins", "sla_staff", "virtual_customer_profiles", "virtual_profiles", "seasonal_themes"].includes(table)) {
    mapped = packJsonColumns(data, table);
  }

  // Strictly filter properties to match PostgreSQL column names exactly
  const allowed = TABLE_COLUMNS[table];
  if (allowed) {
    const filtered: any = {};
    for (const key of allowed) {
      if (mapped[key] !== undefined) {
        filtered[key] = mapped[key];
      }
    }
    return filtered;
  }

  return mapped;
}

// -------------------------------------------------------------
// 5. Main Sequential Migration Runner
// -------------------------------------------------------------
const TABLES_TO_MIGRATE = [
  "users",
  "categories",
  "products",
  "reseller_profiles",
  "retail_shops",
  "sla_admins",
  "sla_staff",
  "system_settings",
  "orders",
  "deposit_requests",
  "withdrawal_requests",
  "support_sessions",
  "support_messages",
  "reseller_chat_sessions",
  "reseller_chat_messages",
  "reseller_customer_chat_sessions",
  "reseller_customer_chat_messages",
  "reseller_product_selection",
  "ach_customers",
  "ach_financials",
  "virtual_customer_profiles",
  "virtual_profiles",
  "seasonal_themes"
];

async function runMigration() {
  console.log("\n========================================================");
  console.log("            STARTING BATCH-MAPPED DATABASE MIGRATION");
  console.log("========================================================\n");

  // Step A: Load referenced tables up front for lookups
  console.log("Preloading lookup registries...");
  
  let usersSnap = { docs: [] }; try { usersSnap = await firestoreDb.collection("users").get(); } catch (e) { console.warn("Cannot fetch users ref", e.message); }
  const usersMap = new Map<string, any>();
  for (const doc of usersSnap.docs) {
    usersMap.set(doc.id, doc.data());
  }
  console.log(`  - Loaded ${usersMap.size} users for reference.`);


  // Step B: Sanitize and pre-register ANY Virtual Customers who own orders or chats
  console.log("\nDetecting Virtual Customers/Profiles in orders & sessions...");
  const virtualCustomerIds = new Set<string>();

  try {
    // 1. Scan orders
    const ordersSnap = await firestoreDb.collection("orders").get();
    for (const doc of ordersSnap.docs) {
      const uId = doc.data().user_id;
      if (uId && !usersMap.has(uId)) {
        virtualCustomerIds.add(uId);
      }
    }
    
    // 2. Scan support_sessions
    const supportSessionsSnap = await firestoreDb.collection("support_sessions").get();
    for (const doc of supportSessionsSnap.docs) {
      const uId = doc.data().user_id;
      if (uId && !usersMap.has(uId)) {
        virtualCustomerIds.add(uId);
      }
    }

    console.log(`  - Found ${virtualCustomerIds.size} unregistered user profiles referenced in operations.`);
    
    if (virtualCustomerIds.size > 0) {
      console.log(`  - Automatically registering stubs in the 'users' primary registry to satisfy foreign key checks...`);
      const userPayloads = Array.from(virtualCustomerIds).map(uId => {
        const isVirtual = uId.startsWith("vp-") || uId.startsWith("vc-");
        return {
          id: uId,
          email: `${uId}@virtual-customer.com`,
          role: isVirtual ? "customer" : "reseller",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      const { error: userErr } = await supabase.from('users').upsert(userPayloads, { onConflict: 'email', ignoreDuplicates: true });
      if (userErr) {
        console.error("  ❌ Virtual users auto-registration failed:", userErr.message);
      } else {
        console.log(`  - Successfully pre-registered ${userPayloads.length} stubs in Supabase 'users' table.`);
        // Add to our runtime map so subsequent mapping functions can lookup successfully
        for (const p of userPayloads) {
          usersMap.set(p.id, p);
        }
      }
    }
  } catch (err: any) {
    console.error("  ⚠️ Error while pre-registering virtual user stubs:", err.message);
  }

  let chatSessionsSnap = { docs: [] }; try { chatSessionsSnap = await firestoreDb.collection("reseller_chat_sessions").get(); } catch (e) { console.warn("Cannot fetch reseller_chat_sessions ref", e.message); }
  const chatSessionsMap = new Map<string, any>();
  for (const doc of chatSessionsSnap.docs) {
    chatSessionsMap.set(doc.id, doc.data());
  }
  console.log(`  - Loaded ${chatSessionsMap.size} chat sessions for reference.`);
  
  console.log('Fetching existing users from Supabase to resolve ID mappings...');
  const { data: existingSupabaseUsers, error: fetchErr } = await supabase.from('users').select('id, email');
  if (fetchErr) console.warn('Warning fetching existing users:', fetchErr);
  
  const idMap = new Map(); // firestoreId -> supabaseId
  
  for (const [docId, data] of usersMap.entries()) {
    let email = (data.email || '').toLowerCase().trim();
    if (!email && (docId.startsWith('vp-') || docId.startsWith('vc-'))) {
        email = `${docId}@virtual-customer.com`;
    }
    if (email && existingSupabaseUsers) {
      const match = existingSupabaseUsers.find(u => (u.email || '').toLowerCase().trim() === email);
      if (match) {
        idMap.set(docId, match.id);
      }
    }
  }
  console.log(`  - Mapped ${idMap.size} existing users by email.`);
  

  // Step C: Extract and satisfy Categories FOREIGN KEY check before product insertion
  console.log("\nAnalyzing unique categories from products to satisfy Foreign Key constraints...");
  try {
    const productsSnap = await firestoreDb.collection("products").get();
    const uniqueCategories = new Set<string>();
    
    for (const doc of productsSnap.docs) {
      const pData = doc.data();
      const cat = pData.category_id || pData.category_slug || pData.category || "";
      if (cat) {
        uniqueCategories.add(String(cat).trim());
      }
    }
    console.log(`  - Found ${uniqueCategories.size} unique categories listed across products.`);

    if (uniqueCategories.size > 0) {
      const categoryPayloads = Array.from(uniqueCategories).map(catId => ({
        id: catId,
        name: catId,
        description: `Autogenerated category: ${catId}`,
        image: ""
      }));

      const { error: catErr } = await supabase.from("categories").upsert(categoryPayloads);
      if (catErr) {
        console.error("  ❌ Category foreign-key preparation failed:", catErr.message);
      } else {
        console.log(`  - Successfully established ${categoryPayloads.length} parent categories in Supabase.`);
      }
    }
  } catch (err: any) {
    console.error("  ⚠️ Skipping dynamic category generation:", err.message);
  }

  // Step C-2: Register missing product stubs to satisfy reseller product selection Foreign Key constraint
  console.log("\nDetecting missing products referenced in reseller product selections...");
  try {
    const productsSnap = await firestoreDb.collection("products").get();
    const firestoreProductIds = new Set(productsSnap.docs.map(doc => doc.id));
    
    const selectionSnap = await firestoreDb.collection("reseller_product_selection").get();
    const missingProductIds = new Set<string>();
    for (const doc of selectionSnap.docs) {
      const pId = doc.data().product_id;
      if (pId && !firestoreProductIds.has(pId)) {
        missingProductIds.add(pId);
      }
    }
    
    if (missingProductIds.size > 0) {
      console.log(`  - Found ${missingProductIds.size} missing products referenced in selections.`);
      const productPayloads = Array.from(missingProductIds).map(pId => ({
        id: pId,
        name: "Archived Product (Stub)",
        description: "This product was selected by a reseller but is no longer active in the catalog.",
        price: 0,
        image: "",
        images: [],
        category_id: "Uncategorized",
        stock: 0,
        status: "Draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Add Uncategorized to categories if not already there
      const { error: catErr } = await supabase.from("categories").upsert({
        id: "Uncategorized",
        name: "Uncategorized",
        description: "Category for archived or unlinked products",
        image: ""
      });
      if (catErr) {
        console.error("  ❌ Failed to ensure 'Uncategorized' category:", catErr.message);
      }

      const { error: prodErr } = await supabase.from("products").upsert(productPayloads);
      if (prodErr) {
        console.error("  ❌ Failed to insert missing product stubs:", prodErr.message);
      } else {
        console.log(`  - Successfully registered ${productPayloads.length} product stubs in Supabase.`);
      }
    } else {
      console.log("  - No missing products detected.");
    }
  } catch (err: any) {
    console.error("  ⚠️ Error satisfying missing products:", err.message);
  }

  // Step D: Loop through tables sequentially
  for (const table of TABLES_TO_MIGRATE) {
    console.log(`\n>>> Migrating [${table}]...`);
    
    let docsSnap;
    try {
      docsSnap = await firestoreDb.collection(table).get();
      console.log(`Found ${docsSnap.size} documents in Firestore [${table}] collection.`);
    } catch (err: any) {
      console.warn(`  ⚠️ Skipping ${table}: Could not fetch. Error: ${err.message}`);
      continue;
    }

    if (docsSnap.empty) {
      console.log(`  Collection [${table}] is empty. Skipping.`);
      continue;
    }

    const docItems = docsSnap.docs;
    let successCount = 0;
    let failedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < docItems.length; i += batchSize) {
      const chunk = docItems.slice(i, i + batchSize);
      
      const packedChunk = chunk.map(doc => {
        return mapFirestoreToSupabase(doc.id, doc.data(), table, usersMap, chatSessionsMap, idMap);
      });

      console.log(`  Upserting batch ${i / batchSize + 1} (${packedChunk.length} records) to [${table}]...`);
      const { error } = await supabase.from(table).upsert(packedChunk);

      if (error) {
        console.warn(`  ⚠️ Batch upsert for ${packedChunk.length} records in [${table}] failed: ${error.message}. Retrying row-by-row...`);
        
        // Falling back to single upserts so failure in one item doesn't drop the other 99 valid ones
        for (const item of packedChunk) {
          const { error: singleErr } = await supabase.from(table).upsert(item);
          if (singleErr) {
            console.error(`  ❌ Row upsert failed for ID [${item.id}] in [${table}]:`, singleErr.message);
            failedCount++;
          } else {
            successCount++;
          }
        }
      } else {
        successCount += packedChunk.length;
      }
    }

    console.log(`Finished migrating [${table}]: Successfully copied ${successCount}/${docsSnap.size} records. (Failed/Skipped: ${failedCount})`);
  }

  console.log("\n========================================================");
  console.log("          MIGRATION COMPLETED SUCCESSFULLY");
  console.log("========================================================\n");
}

runMigration().catch(err => {
  console.error("FATAL: Migration runner failed completely:", err);
});
