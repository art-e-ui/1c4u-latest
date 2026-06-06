/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./app";

export const TABLE_COLUMNS: Record<string, string[]> = {
  categories: ["id", "name", "description", "image", "created_at", "updated_at"],
  products: ["id", "name", "description", "price", "image", "images", "category_id", "stock", "status", "created_at", "updated_at"],
  users: ["id", "email", "role", "first_name", "last_name", "phone_number", "status", "system_upgraded_reset", "created_at", "updated_at"],
  reseller_profiles: [
    "id", "reseller_id", "full_name", "first_name", "last_name", "phone", "verified", "status", 
    "balance", "unpicked_balance", "password_reset_requested", "has_requested_password_reset", 
    "member_of_admin_id", "referred_by_staff_id", "referral_code", "total_earnings", 
    "total_deposits", "total_withdrawals", "total_orders", "pending_balance", "usdt_address", "bank_info",
    "profile_picture", "shop_logo", "shop_hero_banner", "shop_slug", "store_theme",
    "system_upgraded_reset", "created_at", "updated_at"
  ],
  retail_shops: ["id", "shop_name", "level", "product_limit", "domain", "reseller_id", "star_rating", "credit_score", "created_at", "updated_at"],
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

export function filterColumnsForTable(tableName: string, data: any): any {
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return data;

  const filtered: any = {};
  for (const col of allowed) {
    if (data[col] !== undefined) {
      filtered[col] = data[col];
    }
  }
  return filtered;
}

export function packJsonColumns(data: any, tableName: string): any {
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

export function unpackJsonColumns(row: any, tableName: string): any {
  if (!row) return row;
  if (["system_settings", "sla_admins", "sla_staff", "virtual_customer_profiles", "virtual_profiles", "seasonal_themes"].includes(tableName)) {
    const jsonCol = ["system_settings", "sla_admins", "sla_staff"].includes(tableName) ? "value" : "config";
    let nested = row[jsonCol];
    if (typeof nested === "string") {
      try {
        nested = JSON.parse(nested);
      } catch (e) {
        nested = null;
      }
    }
    if (nested && typeof nested === "object") {
      const { [jsonCol]: _, ...rest } = row;
      return {
        ...rest,
        ...nested
      };
    }
  }
  return row;
}

export function packMetadata(data: any, tableName: string): any {
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return data;

  const cleanData: any = {};
  const extra: any = {};

  for (const key of Object.keys(data)) {
    if (allowed.includes(key)) {
      cleanData[key] = data[key];
    } else {
      extra[key] = data[key];
    }
  }


  if (Object.keys(extra).length > 0) {
    if (tableName === 'reseller_profiles') {
      const existing = typeof cleanData.bank_info === 'object' && cleanData.bank_info !== null ? cleanData.bank_info : {};
      cleanData.bank_info = { ...existing, _extra_metadata: extra };
    }
  }
  return cleanData;
}

export function unpackMetadata(row: any, tableName: string): any {
  if (!row) return row;
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return row;

  let unpacked = { ...row };


  if (tableName === 'reseller_profiles' && typeof unpacked.bank_info === 'object' && unpacked.bank_info !== null && unpacked.bank_info._extra_metadata) {
    const extra = unpacked.bank_info._extra_metadata;
    delete unpacked.bank_info._extra_metadata;
    unpacked = { ...unpacked, ...extra };
  }
  return unpacked;
}

export function translateQueryField(field: string, tableName: string): string {
  if (tableName === "users" || tableName === "reseller_profiles") {
    if (field === "uid") return "id";
  }
  // Removed translations for reseller_id, account_id, and staff_id to allow querying actual columns/fields
  if (tableName === "system_settings") {
    if (field === "key") return "id";
  }
  
  const PACKED_TABLES: Record<string, string> = {
    system_settings: "value",
    sla_admins: "value",
    sla_staff: "value",
    virtual_customer_profiles: "config",
    virtual_profiles: "config",
    seasonal_themes: "config"
  };
  
  if (PACKED_TABLES[tableName] && field !== "id" && field !== "created_at" && field !== "updated_at") {
    return `${PACKED_TABLES[tableName]}->>${field}`;
  }
  
  return field;
}

// Utility to extract ID from a row
export function getRowId(row: any, tableName: string): string {
  if (!row) return "";
  if (row.id !== undefined && row.id !== null) return String(row.id);
  
  if (tableName === "users" || tableName === "reseller_profiles") {
    return String(row.uid || row.user_id || row.id || "");
  }
  if (tableName === "retail_shops") {
    return String(row.reseller_id || row.uid || row.id || "");
  }
  if (tableName === "sla_admins") {
    return String(row.account_id || row.id || "");
  }
  if (tableName === "sla_staff") {
    return String(row.staff_id || row.id || "");
  }
  if (tableName === "system_settings") {
    return String(row.key || row.id || "");
  }
  
  const possibleKeys = ['id', 'uid', 'doc_id', 'req_id', 'id_key', 'account_id', 'staff_id', 'slug'];
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null) return String(row[k]);
  }
  return "";
}

// Helper to determine the ID column for a specific table
function getIdColumnName(tableName: string): string {
  // All PostgreSQL tables use the "id" column as primary key
  return "id";
}

export const db = {
  type: "firestore_mock",
};

export const getFirestore = () => {
  return db;
};

export const initializeFirestore = () => {
  return db;
};

export const clearIndexedDbPersistence = async () => {};
export const terminate = async () => {};
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});

export interface QueryConstraint {
  type: "where" | "orderBy" | "limit" | "or";
  field?: string;
  op?: string;
  val?: any;
  direction?: "asc" | "desc";
  limitVal?: number;
  conditions?: QueryConstraint[];
}

export function collection(database: any, path: string) {
  return { type: "collection", path };
}

export function doc(first: any, second?: any, third?: any) {
  let finalPath = "";
  let finalId = "";

  if (third !== undefined) {
    finalPath = second;
    finalId = third;
  } else if (typeof first === "object" && first.type === "collection") {
    finalPath = first.path;
    finalId = second;
  } else if (first && typeof first === "object" && first.type === "firestore_mock") {
    if (typeof second === "string") {
      const parts = second.split("/");
      finalPath = parts[0];
      finalId = parts.slice(1).join("/");
    } else {
      finalPath = "";
      finalId = "";
    }
  } else if (typeof first === "string") {
    const parts = first.split("/");
    finalPath = parts[0];
    finalId = parts.slice(1).join("/");
  } else {
    finalPath = first;
    finalId = second;
  }

  return { type: "doc", path: finalPath, id: finalId };
}

export function where(field: string, op: string, val: any): QueryConstraint {
  return { type: "where", field, op, val };
}

export function orderBy(field: string, direction: "asc" | "desc" = "asc"): QueryConstraint {
  return { type: "orderBy", field, direction };
}

export function limit(val: number): QueryConstraint {
  return { type: "limit", limitVal: val };
}

export function or(...constraints: QueryConstraint[]): QueryConstraint {
  return { type: "or", conditions: constraints };
}

export function query(ref: any, ...constraints: QueryConstraint[]) {
  return {
    type: "query",
    path: ref.path,
    constraints,
  };
}

// Convert Supabase query results to Firestore-like Snapshots
export function wrapDoc(row: any, path: string) {
  if (!row) {
    return {
      id: "",
      exists: () => false,
      data: () => null,
      get: (field: string) => undefined,
      ref: { id: "", path }
    };
  }

  const idValue = getRowId(row, path) || String(row.id || "");
  let docData = unpackJsonColumns(row, path);
  docData = unpackMetadata(docData, path);
  
  docData = {
    ...docData,
    id: idValue
  };
  
  if (path === "users" || path === "reseller_profiles") {
    docData.uid = idValue;
  }
  if (path === "retail_shops") {
    docData.reseller_id = docData.reseller_id || idValue;
  }
  if (path === "sla_admins") {
    docData.account_id = docData.account_id || idValue;
  }
  if (path === "sla_staff") {
    docData.staff_id = docData.staff_id || idValue;
  }
  if (path === "system_settings") {
    docData.key = idValue;
  }

  return {
    id: idValue,
    exists: () => true,
    data: () => docData,
    get: (field: string) => docData[field],
    ref: { id: idValue, path }
  };
}

export function wrapDocs(rows: any[], path: string) {
  const docs = rows.map(r => wrapDoc(r, path));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach(callback: (doc: any) => void) {
      docs.forEach(callback);
    },
    map<T>(callback: (doc: any, index: number) => T): T[] {
      return docs.map(callback);
    }
  };
}

// Standard Firestore-to-Supabase Query builder
async function executeSupabaseQuery(queryObj: any) {
  const path = queryObj.path;
  let qClient = supabase.from(path).select("*");

  const constraints: QueryConstraint[] = queryObj.constraints || [];
  
  for (const c of constraints) {
    if (c.type === "where" && c.field && c.op) {
      const field = translateQueryField(c.field, path);
      const op = c.op;
      const val = c.val;

      if (op === "==") {
        qClient = qClient.eq(field, val);
      } else if (op === "!=") {
        qClient = qClient.neq(field, val);
      } else if (op === ">") {
        qClient = qClient.gt(field, val);
      } else if (op === "<") {
        qClient = qClient.lt(field, val);
      } else if (op === ">=") {
        qClient = qClient.gte(field, val);
      } else if (op === "<=") {
        qClient = qClient.lte(field, val);
      } else if (op === "in") {
        qClient = qClient.in(field, Array.isArray(val) ? val : [val]);
      } else if (op === "array-contains") {
        // Simple fallback for array-contains using cs (contains)
        qClient = qClient.contains(field, [val]);
      }
    } else if (c.type === "or" && c.conditions) {
      const orStrings = c.conditions.map((cond: any) => {
        if (cond.type === "where" && cond.field && cond.op) {
          const f = translateQueryField(cond.field, path);
          const v = cond.val;
          let opStr = "eq";
          if (cond.op === "==") opStr = "eq";
          else if (cond.op === "!=") opStr = "neq";
          else if (cond.op === ">") opStr = "gt";
          else if (cond.op === "<") opStr = "lt";
          else if (cond.op === ">=") opStr = "gte";
          else if (cond.op === "<=") opStr = "lte";
          
          return `${f}.${opStr}.${v}`;
        }
        return "";
      }).filter(Boolean);
      
      if (orStrings.length > 0) {
        qClient = qClient.or(orStrings.join(","));
      }
    } else if (c.type === "orderBy" && c.field) {
      const field = translateQueryField(c.field, path);
      qClient = qClient.order(field, { ascending: c.direction !== "desc" });
    } else if (c.type === "limit" && c.limitVal !== undefined) {
      qClient = qClient.limit(c.limitVal);
    }
  }

  const { data, error } = await qClient;
  if (error) {
    console.error(`[SUPABASE_FIRESTORE] Error fetching from ${path}:`, error);
    return [];
  }
  return data || [];
}

export async function getDocs(queryObj: any) {
  const path = queryObj.path;
  console.log("[SUPABASE_FIRESTORE] getDocs called for:", path);
  if (path === "_connection_test_") {
    return wrapDocs([{ id: "ping" }], path);
  }
  
  // Create single query and execute
  const qObj = queryObj.type === "query" ? queryObj : { type: "query", path, constraints: [] };
  const rows = await executeSupabaseQuery(qObj);
  return wrapDocs(rows, path);
}

export async function getDoc(docObj: any) {
  const path = docObj.path;
  const id = docObj.id;
  console.log(`[SUPABASE_FIRESTORE] getDoc called for table: ${path}, ID: ${id}`);
  if (path === "_connection_test_") {
    return wrapDoc({ id: id || "ping", exists: true, ping: "pong" }, path);
  }

  let res = await supabase.from(path).select("*").eq("id", id).maybeSingle();
  if (!res.data && !isNaN(Number(id))) {
    const numRes = await supabase.from(path).select("*").eq("id", Number(id)).maybeSingle();
    if (numRes.data) res = numRes;
  }

  if (path === "users" && !res?.data) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user;
      if (authUser && authUser.email && authUser.id === id) {
        const normalizedEmail = authUser.email.toLowerCase().trim();
        const legacyRes = await supabase.from("users").select("*").eq("email", normalizedEmail).maybeSingle();
        if (legacyRes.data && legacyRes.data.id !== id) {
          console.log(`[SUPABASE_FIRESTORE] Migrating legacy user ID from ${legacyRes.data.id} to new UUID ${id} for email ${normalizedEmail}`);
          const { error: updateError } = await supabase.from("users").update({ id: id }).eq("id", legacyRes.data.id);
          if (updateError) {
             console.error(`[SUPABASE_FIRESTORE] Failed to migrate user ID:`, updateError);
          } else {
             res = await supabase.from("users").select("*").eq("id", id).maybeSingle();
             console.log(`[SUPABASE_FIRESTORE] Re-fetch legacy user successful!`);
          }
        }
      }
    } catch (err) {
       console.warn(`[SUPABASE_FIRESTORE] Error checking/migrating legacy user in getDoc:`, err);
    }
  }

  if (res.error) {
    console.error(`[SUPABASE_FIRESTORE] Error from getDoc for ${path}/${id}:`, res.error);
  }

  return wrapDoc(res.data, path);
}

export async function addDoc(collectionObj: any, data: any) {
  const path = collectionObj.path;
  console.log("[SUPABASE_FIRESTORE] addDoc for path:", path, data);
  if (path === "_connection_test_") {
    return { id: "mock_test_id", path };
  }

  const dataWithId = { ...data };
  if (dataWithId.id === undefined || dataWithId.id === null) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let autoId = "";
    for (let i = 0; i < 20; i++) {
      autoId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    dataWithId.id = autoId;
  }

  const packedData = packJsonColumns(JSON.parse(JSON.stringify(dataWithId)), path);
  const cleanData = filterColumnsForTable(path, packMetadata(packedData, path));
  cleanData.id = dataWithId.id;

  const { data: inserted, error } = await supabase.from(path).insert(cleanData).select().single();

  if (error) {
    console.error(`[SUPABASE_FIRESTORE] Error on addDoc for ${path}:`, error);
    throw new Error(error.message);
  }

  const newId = getRowId(inserted, path);
  return { id: newId, path };
}

export async function updateDoc(docObj: any, data: any) {
  const path = docObj.path;
  const idValue = docObj.id;
  console.log(`[SUPABASE_FIRESTORE] updateDoc for path: ${path}, ID: ${idValue}`, data);
  if (path === "_connection_test_") {
    return;
  }

  // Extract any increment values before stringification
  const increments: Record<string, number> = {};
  const dataCopy = { ...data };
  for (const key of Object.keys(dataCopy)) {
    const val = dataCopy[key];
    if (val && typeof val === "object" && val.__is_increment__) {
      increments[key] = val.value;
      delete dataCopy[key];
    }
  }

  // Get current state for merging packed JSON columns or incrementing values
  const docSnap = await getDoc(docObj);
  const currentData = docSnap.exists() ? docSnap.data() : {};
  
  const mergedData = { ...currentData, ...dataCopy };

  // Apply increments
  if (Object.keys(increments).length > 0) {
    for (const key of Object.keys(increments)) {
      const currentVal = Number(currentData[key] || 0);
      mergedData[key] = currentVal + increments[key];
    }
  }

  const packedData = packJsonColumns(JSON.parse(JSON.stringify(mergedData)), path);
  const cleanData = filterColumnsForTable(path, packMetadata(packedData, path));

  let q = supabase.from(path).update(cleanData);
  if (!isNaN(Number(idValue))) {
    q = q.or(`id.eq.${idValue},id.eq.${Number(idValue)}`);
  } else {
    q = q.eq("id", idValue);
  }

  const { error } = await q;
  if (error) {
    console.error(`[SUPABASE_FIRESTORE] Error updating ${path}/${idValue}:`, error);
    throw new Error(error.message);
  }
}

export async function setDoc(docObj: any, data: any, options?: any) {
  const path = docObj.path;
  const idValue = docObj.id;
  console.log(`[SUPABASE_FIRESTORE] setDoc for path: ${path}, ID: ${idValue}`, data, options);
  if (path === "_connection_test_") {
    return;
  }

  if (path === "users") {
    try {
      const email = data?.email || data?.email_address;
      if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        const legacyRes = await supabase.from("users").select("*").eq("email", normalizedEmail).maybeSingle();
        if (legacyRes.data && legacyRes.data.id !== idValue) {
          console.log(`[SUPABASE_FIRESTORE] Migrating legacy user ID from ${legacyRes.data.id} to new UUID ${idValue} for email ${normalizedEmail} during setDoc`);
          const { error: updateError } = await supabase.from("users").update({ id: idValue }).eq("id", legacyRes.data.id);
          if (updateError) {
            console.error(`[SUPABASE_FIRESTORE] Failed to migrate user ID during setDoc:`, updateError);
          }
        }
      }
    } catch (err) {
      console.warn(`[SUPABASE_FIRESTORE] Error during setDoc user migration:`, err);
    }
  }

  let mergedData = { ...data };
  const merge = options?.merge === true;

  if (merge) {
    const docSnap = await getDoc(docObj);
    if (docSnap.exists()) {
      mergedData = {
        ...docSnap.data(),
        ...mergedData
      };
    }
  }

  const packedData = packJsonColumns(JSON.parse(JSON.stringify(mergedData)), path);
  const cleanData = filterColumnsForTable(path, packMetadata(packedData, path));
  cleanData.id = idValue;

  const { error } = await supabase.from(path).upsert(cleanData);
  if (error) {
    console.error(`[SUPABASE_FIRESTORE] Error setting ${path}/${idValue}:`, error);
    throw new Error(error.message);
  }
}

export function onSnapshot(queryObj: any, onNext: (snapshot: any) => void, onError?: (error: any) => void) {
  const path = queryObj.path;
  console.log("[SUPABASE_FIRESTORE] onSnapshot subscribed for table:", path);
  if (path === "_connection_test_") {
    setTimeout(() => {
      onNext(queryObj.type === "doc" ? wrapDoc({ id: "ping", exists: true, ping: "pong" }, path) : wrapDocs([{ id: "ping" }], path));
    }, 50);
    return () => {};
  }

  let active = true;

  // 1. Initial Fetch
  const executeAndNotify = async () => {
    try {
      if (queryObj.type === "doc") {
        const docSnap = await getDoc(queryObj);
        if (active) onNext(docSnap);
      } else {
        const docsSnap = await getDocs(queryObj);
        if (active) onNext(docsSnap);
      }
    } catch (err) {
      if (active && onError) onError(err);
    }
  };

  executeAndNotify();

  // 2. Setup Realtime Listener
  const subscription = supabase
    .channel(`rt-${path}-${Math.random().toString(36).substring(2, 9)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: path },
      (payload) => {
        console.log(`[SUPABASE_FIRESTORE] Realtime change seen for table: ${path}`, payload.eventType);
        if (active) {
          executeAndNotify();
        }
      }
    )
    .subscribe();

  // Return unsubscribe hook
  return () => {
    console.log("[SUPABASE_FIRESTORE] onSnapshot unsubscribed for table:", path);
    active = false;
    subscription.unsubscribe();
  };
}

// Convert Firestore arrayUnion wrapper to Supabase array appending style
export const arrayUnion = (...elements: any[]) => {
  return elements;
};

// Mock Server Timestamp
export const serverTimestamp = () => {
  return new Date().toISOString();
};

export const getDocFromServer = getDoc;

export async function deleteDoc(docObj: any) {
  const path = docObj.path;
  const idValue = docObj.id;
  console.log(`[SUPABASE_FIRESTORE] deleteDoc for path: ${path}, ID: ${idValue}`);
  const idCol = getIdColumnName(path);
  
  let q = supabase.from(path).delete();
  if (idCol === "uid") {
    q = q.or(`uid.eq.${idValue},id.eq.${idValue}`);
  } else if (idCol === "reseller_id") {
    q = q.or(`reseller_id.eq.${idValue},id.eq.${idValue}`);
  } else if (idCol === "account_id") {
    q = q.or(`account_id.eq.${idValue},id.eq.${idValue}`);
  } else if (idCol === "staff_id") {
    q = q.or(`staff_id.eq.${idValue},id.eq.${idValue}`);
  } else if (idCol === "key") {
    q = q.or(`key.eq.${idValue},id.eq.${idValue}`);
  } else {
    if (!isNaN(Number(idValue))) {
      q = q.or(`id.eq.${idValue},id.eq.${Number(idValue)}`);
    } else {
      q = q.eq("id", idValue);
    }
  }
  const { error } = await q;
  if (error) {
    console.error(`[SUPABASE_FIRESTORE] Error deleting ${path}/${idValue}:`, error);
    throw new Error(error.message);
  }
}

export function writeBatch(database?: any) {
  const operations: Array<() => Promise<void>> = [];
  return {
    set(docObj: any, data: any) {
      operations.push(() => setDoc(docObj, data));
      return this;
    },
    update(docObj: any, data: any) {
      operations.push(() => updateDoc(docObj, data));
      return this;
    },
    delete(docObj: any) {
      operations.push(() => deleteDoc(docObj));
      return this;
    },
    async commit() {
      for (const op of operations) {
        await op();
      }
    }
  };
}

export async function runTransaction(mockDb: any, updateFunction: (transaction: any) => Promise<any>) {
  const transaction = {
    async get(docObj: any) {
      return getDoc(docObj);
    },
    set(docObj: any, data: any) {
      setDoc(docObj, data);
      return this;
    },
    update(docObj: any, data: any) {
      updateDoc(docObj, data);
      return this;
    },
    delete(docObj: any) {
      deleteDoc(docObj);
      return this;
    }
  };
  return updateFunction(transaction);
}

export function increment(n: number = 1) {
  return { __is_increment__: true, value: n };
}
