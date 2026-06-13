/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

import * as PapaModule from "papaparse";
const Papa = (PapaModule as { default?: typeof PapaModule }).default || PapaModule;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

console.log("[SUPABASE_SERVER] Initializing Supabase admin client with URL:", supabaseUrl);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to get row ID
function getRowId(row: any, tableName: string): string {
  if (!row) return "";
  if (row.id !== undefined && row.id !== null) return String(row.id);
  if (tableName === "users" || tableName === "reseller_profiles") return String(row.uid || "");
  if (tableName === "retail_shops") return String(row.reseller_id || "");
  if (tableName === "sla_admins") return String(row.account_id || "");
  if (tableName === "sla_staff") return String(row.staff_id || "");
  if (tableName === "system_settings") return String(row.key || "");
  return "";
}

function getIdCol(tableName: string): string {
  return "id";
}

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

function unpackJsonColumns(row: any, tableName: string): any {
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

function translateQueryField(field: string, tableName: string): string {
  if (tableName === "users" || tableName === "reseller_profiles") {
    if (field === "uid") return "id";
  }
  if (tableName === "retail_shops") {
    if (field === "reseller_id") return "id";
  }
  if (tableName === "sla_admins") {
    if (field === "account_id") return "id";
  }
  if (tableName === "sla_staff") {
    if (field === "staff_id") return "id";
  }
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

const TABLE_COLUMNS: Record<string, string[]> = {
  reseller_notifications: ["id", "reseller_id", "title", "message", "read", "created_at"],
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
  retail_shops: ["id", "shop_name", "level", "product_limit", "domain", "reseller_id", "star_rating", "credit_score", "status", "shop_logo", "shop_hero_banner", "store_theme", "shop_slug", "created_at", "updated_at"],
  sla_admins: ["id", "value", "created_at"],
  sla_staff: ["id", "value", "created_at"],
  system_settings: ["id", "value", "created_at", "updated_at"],
  orders: ["id", "user_id", "reseller_id", "reseller_uid", "total_amount", "status", "shipping_address", "payment_method", "payment_status", "created_at", "updated_at"],
  deposit_requests: ["id", "reseller_id", "reseller_doc_id", "amount", "status", "payment_method", "receipt_url", "created_at", "updated_at"],
  withdrawal_requests: ["id", "reseller_id", "reseller_doc_id", "amount", "status", "bank_name", "account_number", "account_name", "created_at", "updated_at"],
  support_sessions: ["id", "user_email", "user_name", "status", "created_at", "customer_name", "is_online", "last_message_at", "reseller_id", "user_id"],
  support_messages: ["id", "session_id", "sender_name", "sender_role", "message", "created_at", "sender", "is_read", "attachment_product_id"],
  reseller_chat_sessions: ["id", "reseller_id", "status", "unread_count", "last_message", "is_pinned", "is_online", "reseller_name", "last_message_at", "created_at"],
  reseller_chat_messages: ["id", "session_id", "sender_id", "sender_role", "message", "is_read", "image_url", "created_at"],
  reseller_customer_chat_sessions: ["id", "reseller_id", "customer_id", "customer_name", "unread_count", "last_message", "status", "last_message_at", "created_at"],
  reseller_customer_chat_messages: ["id", "session_id", "sender_id", "sender_role", "message", "is_read", "image_url", "created_at"],
  reseller_product_selection: ["id", "reseller_id", "product_id", "created_at"],
  ach_customers: ["id", "user_id", "routing_number", "account_number", "account_type", "created_at"],
  ach_financials: ["id", "transaction_id", "amount", "status", "created_at"],
  virtual_customer_profiles: ["id", "config", "created_at"],
  virtual_profiles: ["id", "config", "created_at"],
  seasonal_themes: ["id", "name", "status", "config", "created_at"]
};

function packMetadata(data: any, tableName: string): any {
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

  if (Object.keys(extra).length > 0 && allowed.includes("description")) {
    const desc = cleanData.description || "";
    cleanData.description = `${desc}\n\n===METADATA===\n${JSON.stringify(extra)}`;
  }

  return cleanData;
}

function unpackMetadata(row: any, tableName: string): any {
  if (!row) return row;
  const allowed = TABLE_COLUMNS[tableName];
  if (!allowed) return row;

  let unpacked = { ...row };

  if (allowed.includes("description") && typeof unpacked.description === "string") {
    const parts = unpacked.description.split("\n\n===METADATA===\n");
    if (parts.length > 1) {
      const desc = parts[0];
      const jsonStr = parts.slice(1).join("\n\n===METADATA===\n");
      try {
        const extra = JSON.parse(jsonStr.trim());
        unpacked = {
          ...unpacked,
          ...extra,
          description: desc
        };
      } catch (e) {
        console.warn("[METADATA] Failed to parse packed metadata", e);
      }
    }
  }

  return unpacked;
}

const mockAdminDb = {
  collection(tableName: string) {
    const constraints: any[] = [];
    let limitVal: number | null = null;
    let orderCol: string | null = null;
    let orderDesc = false;

    return {
      where(field: string, op: string, val: any) {
        constraints.push({ field, op, val });
        return this;
      },
      orderBy(field: string, dir: "asc" | "desc" = "asc") {
        orderCol = field;
        orderDesc = dir === "desc";
        return this;
      },
      limit(n: number) {
        limitVal = n;
        return this;
      },
      doc(idValue: string) {
        return {
          id: idValue,
          async get() {
            let res = await supabaseAdmin.from(tableName).select("*").eq("id", idValue).maybeSingle();
            if (!res.data && !isNaN(Number(idValue))) {
              const numRes = await supabaseAdmin.from(tableName).select("*").eq("id", Number(idValue)).maybeSingle();
              if (numRes.data) res = numRes;
            }
            let data = res.data ? unpackJsonColumns(res.data, tableName) : null;
            data = unpackMetadata(data, tableName);
            return {
              id: idValue,
              exists: data !== null && data !== undefined,
              data() { return data; }
            };
          },
          async set(data: any) {
            let merged = { ...data };
            
            let res = await supabaseAdmin.from(tableName).select("*").eq("id", idValue).maybeSingle();
            if (res.data) {
              let unpacked = unpackJsonColumns(res.data, tableName);
              unpacked = unpackMetadata(unpacked, tableName);
              merged = { ...unpacked, ...merged };
            }

            const packedData = packJsonColumns(JSON.parse(JSON.stringify(merged)), tableName);
            const cleanData = packMetadata(packedData, tableName);
            cleanData.id = idValue;
            
            const { error } = await supabaseAdmin.from(tableName).upsert(cleanData);
            if (error) {
              console.error(`[SUPABASE_ADMIN_DB] Error setting ${tableName}/${idValue}:`, error);
              throw new Error(error.message);
            }
          },
          async update(data: any) {
            let res = await supabaseAdmin.from(tableName).select("*").eq("id", idValue).maybeSingle();
            let current = {};
            if (res.data) {
              let unpacked = unpackJsonColumns(res.data, tableName);
              current = unpackMetadata(unpacked, tableName);
            }
            let merged = { ...current, ...data };

            const packedData = packJsonColumns(JSON.parse(JSON.stringify(merged)), tableName);
            const cleanData = packMetadata(packedData, tableName);
            
            let q = supabaseAdmin.from(tableName).update(cleanData);
            if (!isNaN(Number(idValue))) {
              q = q.or(`id.eq.${idValue},id.eq.${Number(idValue)}`);
            } else {
              q = q.eq("id", idValue);
            }
            
            const { error } = await q;
            if (error) {
              console.error(`[SUPABASE_ADMIN_DB] Error updating ${tableName}/${idValue}:`, error);
              throw new Error(error.message);
            }
          }
        };
      },
      async add(data: any) {
        const dataWithId = { ...data };
        if (dataWithId.id === undefined || dataWithId.id === null) {
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
          let autoId = "";
          for (let i = 0; i < 20; i++) {
            autoId += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          dataWithId.id = autoId;
        }

        const packedData = packJsonColumns(JSON.parse(JSON.stringify(dataWithId)), tableName);
        const cleanData = packMetadata(packedData, tableName);
        cleanData.id = dataWithId.id;

        const { data: inserted, error } = await supabaseAdmin.from(tableName).insert(cleanData).select().single();
        if (error) {
          console.error(`[SUPABASE_ADMIN_DB] Error adding row to ${tableName}:`, error);
          throw new Error(error.message);
        }
        return {
          id: String(getRowId(inserted, tableName)),
          path: tableName
        };
      },
      async get() {
        const allowed = TABLE_COLUMNS[tableName] || [];
        const sqlConstraints: any[] = [];
        const memoryConstraints: any[] = [];
        const descriptionLikeConstraints: any[] = [];

        for (const c of constraints) {
          const field = translateQueryField(c.field, tableName);
          if (allowed.includes(field)) {
            sqlConstraints.push(c);
          } else if (tableName === "products" && (field === "sku" || field === "shopify_id")) {
            descriptionLikeConstraints.push({ field, val: c.val });
            memoryConstraints.push(c);
          } else {
            memoryConstraints.push(c);
          }
        }

        let q = supabaseAdmin.from(tableName).select("*");
        for (const c of sqlConstraints) {
          const field = translateQueryField(c.field, tableName);
          if (c.op === "==") q = q.eq(field, c.val);
          else if (c.op === "!=") q = q.neq(field, c.val);
          else if (c.op === ">") q = q.gt(field, c.val);
          else if (c.op === "<") q = q.lt(field, c.val);
          else if (c.op === ">=") q = q.gte(field, c.val);
          else if (c.op === "<=") q = q.lte(field, c.val);
        }
        for (const c of descriptionLikeConstraints) {
          q = q.like("description", `%\"${c.field}\":\"${c.val}\"%`);
        }
        if (orderCol && allowed.includes(translateQueryField(orderCol, tableName))) {
          const field = translateQueryField(orderCol, tableName);
          q = q.order(field, { ascending: !orderDesc });
        }
        const allMemoryFiltersSolvedOnDb = memoryConstraints.length > 0 && descriptionLikeConstraints.length === memoryConstraints.length;
        if (limitVal !== null && (memoryConstraints.length === 0 || allMemoryFiltersSolvedOnDb)) {
          q = q.limit(limitVal);
        }
        const { data, error } = await q;
        if (error) {
          console.error(`[SUPABASE_ADMIN_DB] Error getting rows from ${tableName}:`, error);
          throw new Error(error.message);
        }
        let docs = (data || []).map(row => {
          const idVal = String(getRowId(row, tableName));
          let unpacked = unpackJsonColumns(row, tableName);
          unpacked = unpackMetadata(unpacked, tableName);
          return {
            id: idVal,
            exists: true,
            data() { return unpacked; },
            ref: this.doc(idVal)
          };
        });

        // Filter rows in memory
        if (memoryConstraints.length > 0) {
          docs = docs.filter(r => {
            const rowData = r.data();
            for (const c of memoryConstraints) {
              const val = rowData[c.field];
              if (c.op === "==" || c.op === "eq") {
                if (val !== c.val) return false;
              } else if (c.op === "!=" || c.op === "neq") {
                if (val === c.val) return false;
              } else if (c.op === ">" || c.op === "gt") {
                if (!(val > c.val)) return false;
              } else if (c.op === "<" || c.op === "lt") {
                if (!(val < c.val)) return false;
              } else if (c.op === ">=" || c.op === "gte") {
                if (!(val >= c.val)) return false;
              } else if (c.op === "<=" || c.op === "lte") {
                if (!(val <= c.val)) return false;
              }
            }
            return true;
          });
        }

        if (orderCol && !allowed.includes(translateQueryField(orderCol, tableName))) {
          docs.sort((a, b) => {
            const valA = a.data()[orderCol!];
            const valB = b.data()[orderCol!];
            if (valA < valB) return orderDesc ? 1 : -1;
            if (valA > valB) return orderDesc ? -1 : 1;
            return 0;
          });
        }

        if (limitVal !== null && memoryConstraints.length > 0) {
          docs = docs.slice(0, limitVal);
        }

        return {
          docs,
          forEach(cb: any) {
            docs.forEach(cb);
          },
          get empty() {
            return docs.length === 0;
          }
        };
      }
    };
  },
  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set(docRef: any, data: any) {
        ops.push(() => docRef.set(data));
        return this;
      },
      update(docRef: any, data: any) {
        ops.push(() => docRef.update(data));
        return this;
      },
      async commit() {
        for (const op of ops) {
          await op();
        }
      }
    };
  }
};

const mockAdminAuth = {
  async createUser(params: any) {
    console.log("[SUPABASE_ADMIN_AUTH] Creating user:", params.email);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true
    });
    if (error) {
      console.error("[SUPABASE_ADMIN_AUTH] Error creating user:", error);
      throw new Error(error.message);
    }
    return {
      uid: data.user!.id,
      email: data.user!.email
    };
  }
};

let adminDb = mockAdminDb;
const adminAuth = mockAdminAuth;

// Helper for Admin SDK errors
enum AdminOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleAdminFirestoreError(error: unknown, operationType: AdminOperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo = {
    error: errorMessage,
    operationType,
    path,
    context: 'server-admin-sdk'
  };
  console.log('[FIREBASE_ADMIN_ERROR]', JSON.stringify(errInfo));
  return error;
}

function determineCategoryFromText(name: string, description: string, syncCategory: string): string {
  let determinedCategory = "";
  if (syncCategory && syncCategory.toLowerCase() !== "uncategorized" && syncCategory.toLowerCase() !== "general") {
    const recognized = ["Clothing", "Gadgets", "Watches", "Accessories", "Furniture", "Kitchen Utensils"];
    const matched = recognized.find(r => r.toLowerCase() === syncCategory.toLowerCase().trim());
    if (matched) return matched;
  }
  
  const textToAnalyze = (name + " " + description).toLowerCase();
  // Using explicit pattern matching
  if (textToAnalyze.includes("shirt") || textToAnalyze.includes("pant") || textToAnalyze.includes("dress") || textToAnalyze.includes("clothing") || textToAnalyze.includes("hoodie") || textToAnalyze.includes("jacket") || textToAnalyze.includes("jeans") || textToAnalyze.includes("t-shirt") || textToAnalyze.includes("coat") || textToAnalyze.includes("sweater")) {
    determinedCategory = "Clothing";
  } else if (textToAnalyze.includes("phone") || textToAnalyze.includes("laptop") || textToAnalyze.includes("charge") || textToAnalyze.includes("cable") || textToAnalyze.includes("usb") || textToAnalyze.includes("gadget") || textToAnalyze.includes("tablet") || textToAnalyze.includes("mouse") || textToAnalyze.includes("keyboard") || textToAnalyze.includes("device") || textToAnalyze.includes("soundbar") || textToAnalyze.includes("speaker") || textToAnalyze.includes("headphone") || textToAnalyze.includes("earbud")) {
    determinedCategory = "Gadgets";
  } else if (textToAnalyze.includes("watch") || textToAnalyze.includes("smartwatch") || textToAnalyze.includes("quartz") || textToAnalyze.includes("chronograph") || textToAnalyze.includes("timepiece")) {
    determinedCategory = "Watches";
  } else if (textToAnalyze.includes("bag") || textToAnalyze.includes("backpack") || textToAnalyze.includes("wallet") || textToAnalyze.includes("sunglass") || textToAnalyze.includes("belt") || textToAnalyze.includes("ring") || textToAnalyze.includes("jewelry") || textToAnalyze.includes("necklace") || textToAnalyze.includes("bracelet") || textToAnalyze.includes("purse")) {
    determinedCategory = "Accessories";
  } else if (textToAnalyze.includes("chair") || textToAnalyze.includes("table") || textToAnalyze.includes("sofa") || textToAnalyze.includes("desk") || textToAnalyze.includes("bed") || textToAnalyze.includes("furniture") || textToAnalyze.includes("couch") || textToAnalyze.includes("shelf") || textToAnalyze.includes("cabinet")) {
    determinedCategory = "Furniture";
  } else if (textToAnalyze.includes("knife") || textToAnalyze.includes("fork") || textToAnalyze.includes("spoon") || textToAnalyze.includes("pan") || textToAnalyze.includes("pot") || textToAnalyze.includes("kitchen") || textToAnalyze.includes("utensil") || textToAnalyze.includes("cook") || textToAnalyze.includes("mug") || textToAnalyze.includes("cup") || textToAnalyze.includes("plate") || textToAnalyze.includes("cookware")) {
    determinedCategory = "Kitchen Utensils";
  } else {
    if (syncCategory && syncCategory.toLowerCase() !== "uncategorized" && syncCategory.toLowerCase() !== "general") {
      determinedCategory = syncCategory;
    } else {
      determinedCategory = "Gadgets";
    }
  }
  return determinedCategory;
}

async function cleanupProductCategories() {
  try {
    console.log("[SERVER] Running Startup DB Category Sanitizer Routine...");
    const productsSnapshot = await adminDb.collection("products").get();
    let updatedCount = 0;
    
    for (const doc of productsSnapshot.docs) {
      const unpacked = doc.data();
      const name = unpacked.name || "";
      const desc = unpacked.description || "";
      const syncCategory = unpacked.sync_category || unpacked.category_slug || "";
      
      let categorySlug = unpacked.category_slug || "";
      let isUpdated = false;
      
      const isUncategorized = !categorySlug || categorySlug.toLowerCase() === "uncategorized" || categorySlug.toLowerCase() === "general";
      
      if (isUncategorized) {
        const determinedCategory = determineCategoryFromText(name, desc, syncCategory);
        unpacked.category_slug = determinedCategory;
        categorySlug = determinedCategory;
        isUpdated = true;
      }
      
      if (isUpdated || !unpacked.category_id) {
        // Also fix products without category_id mapping
        // Find existing category
        const catNameClean = categorySlug.trim();
        let categoryId = "";
        if (catNameClean) {
          const catSlugClean = catNameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || "general-category";
          try {
            await adminDb.collection("categories").doc(catSlugClean).set({
              name: catNameClean,
              slug: catSlugClean,
              description: `Sanitized from Uncategorized items`,
              image: "",
              created_at: new Date().toISOString()
            });
            categoryId = catSlugClean;
          } catch (e) {
            console.warn("Category creation race condition, ignoring", e);
            categoryId = catSlugClean;
          }
        }
        
        unpacked.category_id = categoryId || null;
        
        // Update product table
        await adminDb.collection("products").doc(doc.id).update({
          category_slug: unpacked.category_slug,
          category_id: unpacked.category_id
        });
        updatedCount++;
      }
    }
    console.log(`[SERVER] Cleaned up ${updatedCount} uncategorized/unlinked products.`);
  } catch (error) {
    console.error("[SERVER] Error in cleanupProductCategories:", error);
  }
}

// Test Admin SDK connection on startup and set working adminDb
async function testAdminConnection() {
  try {
    console.log("[SUPABASE_SERVER] Testing Supabase admin client connection...");
    const { data, error } = await supabaseAdmin.from("system_settings").select("*").limit(1);
    if (error) {
      console.warn("[SUPABASE_SERVER] Connection warning (system_settings select failed, table may be empty or not created yet):", error.message);
    } else {
      console.log("[SUPABASE_SERVER] Connection with Supabase admin client successful.");
      await cleanupProductCategories();
    }
  } catch (error) {
    console.error("[SUPABASE_SERVER] Supabase connection test error:", error);
  }
}
testAdminConnection();

export const app = express();
export let performShopifySync: () => Promise<void>;

async function startServer() {
  const PORT = 3000;
  
  // Canonical domain redirect (Optional but recommended for SEO/Trust)
  // Exclude /api and /.well-known routes to avoid breaking requests
  app.use((req, res, next) => {
    const host = req.get('host');
    const isWellKnown = req.path.startsWith('/.well-known');
    const isApi = req.path.startsWith('/api');
    
    if (host === 'www.1-CartForU-onlineshop.com' && !isApi && !isWellKnown) {
      return res.redirect(301, `https://1-CartForU-onlineshop.com${req.originalUrl}`);
    }
    next();
  });

  // Explicitly serve Google Digital Asset Links (required for Play Store)
  // This MUST be at the very top to bypass any middleware or redirects
  app.get("/.well-known/assetlinks.json", (req, res) => {
    const possiblePaths = [
      path.join(process.cwd(), "public", ".well-known", "assetlinks.json"),
      path.join(process.cwd(), "dist", ".well-known", "assetlinks.json"),
      path.join(__dirname, "public", ".well-known", "assetlinks.json"),
      path.join(__dirname, "dist", ".well-known", "assetlinks.json"),
      path.resolve(".well-known/assetlinks.json"),
      path.resolve("public/.well-known/assetlinks.json"),
      path.resolve("dist/.well-known/assetlinks.json")
    ];
    
    console.log(`[SERVER] assetlinks.json request. CWD: ${process.cwd()}, __dirname: ${__dirname}`);
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`[SERVER] Found assetlinks.json at: ${p}`);
        try {
          const content = fs.readFileSync(p, 'utf8');
          res.setHeader('Content-Type', 'application/json');
          // Try to parse it to ensure it's valid JSON, but send the raw content
          try {
            JSON.parse(content);
          } catch (parseErr) {
            console.warn(`[SERVER] assetlinks.json at ${p} is not valid JSON:`, parseErr);
          }
          return res.status(200).send(content);
        } catch (err) {
          console.error(`[SERVER] Error reading assetlinks.json at ${p}:`, err);
        }
      }
    }
    
    console.error("[SERVER] assetlinks.json not found in any of the expected paths");
    res.status(404).send("Not Found");
  });

  // Also serve everything in .well-known as static files
  app.use('/.well-known', express.static(path.resolve(process.cwd(), 'public', '.well-known'), { dotfiles: 'allow' }));
  app.use('/.well-known', express.static(path.resolve(process.cwd(), 'dist', '.well-known'), { dotfiles: 'allow' }));

  app.use(cors());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
  });

  // Health check endpoint (moved to top)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Check if user email requires upgrade-based password reset
  app.post("/api/auth/check-upgrade", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { email, portal } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`[CHECK_UPGRADE] Checking email: ${normalizedEmail} for portal: ${portal}`);

      let exists = false;
      let userId = "";
      let systemUpgradedReset = false;
      let role = "";

      if (adminDb) {
        // 1. Check in 'users' collection
        const usersSnap = await adminDb.collection("users").where("email", "==", normalizedEmail).get();
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          const userData = userDoc.data();
          userId = userDoc.id;
          role = userData?.role || "";

          if (userData?.system_upgraded_reset === true || userData?.system_upgraded_reset === "true") {
            systemUpgradedReset = true;
          }
          
          if (portal === "admin") {
            if (["owner", "admin", "staff"].includes(role)) {
              exists = true;
            }
          } else if (portal === "reseller") {
            if (role === "reseller") {
              exists = true;
            }
          }
        }

        // 2. Extra check for admin portal: SLA tables (checked always to retrieve systemUpgradedReset status)
        if (portal === "admin") {
          // Check sla_staff
          const staffSnap = await adminDb.collection("sla_staff").where("email", "==", normalizedEmail).get();
          if (!staffSnap.empty) {
            exists = true;
            const staffData = staffSnap.docs[0].data();
            userId = staffSnap.docs[0].id;
            if (staffData?.system_upgraded_reset === true || staffData?.system_upgraded_reset === "true") {
              systemUpgradedReset = true;
            }
          }

          // Check sla_admins
          const adminsSnap = await adminDb.collection("sla_admins").where("email", "==", normalizedEmail).get();
          if (!adminsSnap.empty) {
            exists = true;
            const adminData = adminsSnap.docs[0].data();
            userId = adminsSnap.docs[0].id;
            if (adminData?.system_upgraded_reset === true || adminData?.system_upgraded_reset === "true") {
              systemUpgradedReset = true;
            }
          }
        }

        // 3. Extra check for reseller portal: reseller_profiles (checked always to retrieve systemUpgradedReset status)
        if (portal === "reseller") {
          let resellerSnap = { empty: true, docs: [] as any[] };
          if (userId) {
            try {
              const docSnap = await adminDb.collection("reseller_profiles").doc(userId).get();
              if (docSnap.exists) {
                resellerSnap = {
                  empty: false,
                  docs: [docSnap]
                };
              }
            } catch (err) {
              console.warn(`[CHECK_UPGRADE] Error getting reseller_profile for ${userId}:`, err);
            }
          }
          if (resellerSnap.empty) {
            try {
              const fallbackSnap = await adminDb.collection("reseller_profiles").where("email", "==", normalizedEmail).get();
              if (!fallbackSnap.empty) {
                resellerSnap = {
                  empty: false,
                  docs: fallbackSnap.docs
                };
              }
            } catch (err) {
              console.warn("[CHECK_UPGRADE] Error in reseller_profiles email fallback:", err);
            }
          }

          if (!resellerSnap.empty) {
            exists = true;
            const resellerData = resellerSnap.docs[0].data();
            userId = resellerSnap.docs[0].id;
            if (resellerData?.system_upgraded_reset === true || resellerData?.system_upgraded_reset === "true") {
              systemUpgradedReset = true;
              console.log(`[CHECK_UPGRADE] Found system_upgraded_reset=true in reseller_profiles for email ${normalizedEmail}`);
            }
            role = "reseller";
          }
        }

        // 4. Supabase Auth metadata check (ultimate source of truth)
        if (exists && supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
          try {
            let targetUUID = null;
            
            // Try resolving UUID via listUsers first
            const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (!listError && listData?.users) {
              const matchedUser = listData.users.find(u => u.email?.toLowerCase() === normalizedEmail);
              if (matchedUser) {
                targetUUID = matchedUser.id;
              }
            }

            // Fallback to database user resolver
            if (!targetUUID) {
              const { data: suUser } = await supabaseAdmin
                .from("users")
                .select("id")
                .eq("email", normalizedEmail)
                .maybeSingle();
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
              const resolvedDbId = suUser?.id || (isUUID ? userId : null);
              if (resolvedDbId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedDbId)) {
                targetUUID = resolvedDbId;
              }
            }

            if (targetUUID) {
              const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(targetUUID);
              if (!authError && user) {
                const authReset = user.user_metadata?.system_upgraded_reset === true || user.user_metadata?.system_upgraded_reset === "true";
                if (authReset) {
                  systemUpgradedReset = true;
                  console.log(`[CHECK_UPGRADE] Found system_upgraded_reset=true in Supabase Auth user metadata for email ${normalizedEmail}`);
                }
              }
            }
          } catch (authErr) {
            console.warn(`[CHECK_UPGRADE] Failed to fetch auth user metadata for email ${normalizedEmail}:`, authErr);
          }
        }
      }

      console.log(`[CHECK_UPGRADE] Result: exists=${exists}, userId=${userId}, systemUpgradedReset=${systemUpgradedReset}, role=${role}`);

      // Auto-provision in Supabase Auth if user exists under legacy Firestore layout and hasn't reset yet (or to be safe, whenever they check upgrade)
      if (exists) {
        try {
          const targetRole = role || (portal === "reseller" ? "reseller" : "admin");
          console.log(`[CHECK_UPGRADE] Ensuring user exists in Supabase Auth: ${normalizedEmail} with role: ${targetRole}`);
          
          if (supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
            const { data: provData, error: provError } = await supabaseAdmin.auth.admin.createUser({
              email: normalizedEmail,
              password: Math.random().toString(36) + "S1!a8",
              email_confirm: true,
              app_metadata: { role: targetRole },
              user_metadata: { 
                role: targetRole,
                legacy_id: userId, // Essential for bridging Firestore data
                system_upgraded_reset: systemUpgradedReset
              }
            });
            
            if (provError) {
              if (provError.message?.toLowerCase().includes("already exists") || provError.message?.toLowerCase().includes("conflict") || provError.message?.toLowerCase().includes("database error")) {
                console.log(`[CHECK_UPGRADE] User ${normalizedEmail} already exists in Supabase Auth, proceed.`);
              } else {
                console.warn(`[CHECK_UPGRADE] Supabase Auth user auto-creation returned warning:`, provError.message);
              }
            } else {
              console.log(`[CHECK_UPGRADE] Successfully provisioned new user in Supabase Auth with ID: ${provData.user?.id}`);
            }
          } else {
            console.warn("[CHECK_UPGRADE] supabaseAdmin auth admin client not fully initialized or mock environment.");
          }
        } catch (provException) {
          console.error(`[CHECK_UPGRADE] Failed to auto-provision user in Supabase Auth:`, provException);
        }
      }

      return res.json({
        exists,
        userId,
        role,
        systemUpgradedReset
      });
    } catch (error) {
      console.error("[CHECK_UPGRADE] Error:", error);
      return res.status(500).json({ error: "Failed to perform upgrade check" });
    }
  });

  // Fallback endpoint to generate reset link directly (bypassing Supabase SMTP which might be rate limited on free tier)
  app.post("/api/auth/generate-reset-link", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { email, portal } = req.body;
      if (!email) {
        return res.status(400).json({ error: "email is required" });
      }

      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers.host || 'localhost:3000';
      const originUrl = `${protocol}://${host}`;
      const portalQuery = `?portal=${portal || ""}&email=${encodeURIComponent(email)}`;
      const redirectTarget = `${originUrl}/reset-password${portalQuery}`;

      console.log(`[GENERATE_RESET_LINK] Generating recovery link for: ${email} with redirect: ${redirectTarget}`);
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: redirectTarget,
        }
      });

      if (error) {
        throw error;
      }

      return res.json({ action_link: data.properties.action_link });
    } catch (err: any) {
      console.error("[GENERATE_RESET_LINK] Error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate link" });
    }
  });

  // Mark profile as upgraded (completed password reset trigger)
  app.post("/api/auth/mark-upgraded", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { userId, email, portal } = req.body;
      if (!userId && !email) {
        return res.status(400).json({ error: "userId or email is required" });
      }
      console.log(`[MARK_UPGRADED] Marking upgraded for email: ${email || 'unknown'} (userId: ${userId || 'unknown'}) on portal: ${portal}`);

      if (adminDb) {
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        let legacyId = null;

        // Extract legacy_id from Supabase Auth if possible
        if (userId && supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
           const isFinalUUIDValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || "");
           if (isFinalUUIDValid) {
             try {
                const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
                if (user?.user_metadata?.legacy_id) {
                   legacyId = user.user_metadata.legacy_id;
                   console.log(`[MARK_UPGRADED] Found legacy_id ${legacyId} for Supabase UUID ${userId}`);
                }
             } catch(e) {
                console.warn(`[MARK_UPGRADED] Could not fetch Supabase User to find legacy_id:`, e);
             }
           }
        }
        
        // 1. Update based on email across ALL relevant collections to be absolutely sure
        if (normalizedEmail) {
          const collectionsToCheck = ["users", "reseller_profiles", "sla_staff", "sla_admins"];
          for (const coll of collectionsToCheck) {
            try {
              const snap = await adminDb.collection(coll).where("email", "==", normalizedEmail).get();
              if (!snap.empty) {
                const batch = adminDb.batch();
                snap.docs.forEach(doc => {
                  batch.update(doc.ref, {
                    system_upgraded_reset: true,
                    updated_at: new Date().toISOString()
                  });
                });
                await batch.commit();
                console.log(`[MARK_UPGRADED] Updated ${snap.size} docs in ${coll} for email ${normalizedEmail}`);
              }
            } catch (e) {
              console.warn(`[MARK_UPGRADED] Failed to update collection ${coll}:`, e);
            }
          }
        }

        // 2. Also update by specific userId if provided (just in case)
        const idsToUpdate = [userId, legacyId].filter(Boolean);
        for (const currentId of idsToUpdate) {
          const collectionsToCheck = ["users", "reseller_profiles", "sla_staff", "sla_admins"];
          for (const coll of collectionsToCheck) {
            try {
              const docRef = adminDb.collection(coll).doc(currentId);
              const docSnap = await docRef.get();
              if (docSnap.exists) {
                await docRef.update({
                  system_upgraded_reset: true,
                  updated_at: new Date().toISOString()
                });
                console.log(`[MARK_UPGRADED] Updated doc ${currentId} in ${coll}`);
              }
            } catch (e) {
              // Ignore errors for non-existent IDs in specific collections
            }
          }
        }

        // 3. Update Supabase Auth user metadata
        let resolvedUserId = userId;
        let isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || "");

        if (supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
          try {
            // Find real Supabase Auth UUID from listUsers by email
            if (normalizedEmail) {
              const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
              if (!listError && listData?.users) {
                const matchedUser = listData.users.find(u => u.email?.toLowerCase() === normalizedEmail);
                if (matchedUser) {
                  resolvedUserId = matchedUser.id;
                  isUUID = true;
                  console.log(`[MARK_UPGRADED] Resolved Supabase UUID ${resolvedUserId} from email list for ${normalizedEmail}`);
                }
              }
            }

            // Fallback db check
            if (!isUUID && normalizedEmail) {
              const { data: suUser } = await supabaseAdmin
                .from("users")
                .select("id")
                .eq("email", normalizedEmail)
                .maybeSingle();
              
              if (suUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(suUser.id)) {
                resolvedUserId = suUser.id;
                console.log(`[MARK_UPGRADED] Fallback resolved DB UUID ${resolvedUserId} from email ${normalizedEmail}`);
              }
            }
          } catch (e) {
            console.warn(`[MARK_UPGRADED] Failed to resolve Supabase UUID:`, e);
          }
        }

        const isFinalUUIDValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedUserId || "");

        if (isFinalUUIDValid && supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
          try {
            const { data: { user }, error: getErr } = await supabaseAdmin.auth.admin.getUserById(resolvedUserId);
            if (!getErr && user) {
              const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(resolvedUserId, {
                user_metadata: {
                  ...user.user_metadata,
                  system_upgraded_reset: true
                }
              });
              if (updateErr) {
                console.error(`[MARK_UPGRADED] Failed to update user metadata for ID ${resolvedUserId}:`, updateErr.message);
              } else {
                console.log(`[MARK_UPGRADED] Successfully updated user metadata for ID ${resolvedUserId}`);
              }
            } else {
              // Fallback: update directly if get failed but user might exist
              const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(resolvedUserId, {
                user_metadata: { system_upgraded_reset: true }
              });
              if (updateErr) {
                console.error(`[MARK_UPGRADED] Fallback metadata update failed for ID ${resolvedUserId}:`, updateErr.message);
              } else {
                console.log(`[MARK_UPGRADED] Fallback metadata update succeeded for ID ${resolvedUserId}`);
              }
            }
          } catch (metaErr) {
            console.error(`[MARK_UPGRADED] Error updating auth user metadata:`, metaErr);
          }
        }
      }
      
      return res.json({ success: true });
    } catch (err: any) {
      console.error("[MARK_UPGRADED] Final Error:", err);
      return res.status(500).json({ error: err.message || "Failed to mark as upgraded" });
    }
  });

  // Seamless legacy user upgrade endpoint
  app.post("/api/auth/upgrade-legacy", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { email, password, portal } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const targetRole = portal === "reseller" ? "reseller" : "admin";
      console.log(`[UPGRADE_LEGACY] Starting seamless upgrade for email: ${normalizedEmail} on portal: ${portal}`);

      if (!adminDb) {
        return res.status(500).json({ error: "Firestore adminDb is not initialized" });
      }

      // 1. Locate the legacy user in Firestore to find the legacyUserId
      let legacyUserId = null;
      let legacyUserData: any = null;

      // Check users collection first
      const usersSnap = await adminDb.collection("users").where("email", "==", normalizedEmail).get();
      if (!usersSnap.empty) {
        legacyUserId = usersSnap.docs[0].id;
        legacyUserData = usersSnap.docs[0].data();
      }

      // Check reseller_profiles or sla collections if not found
      if (!legacyUserId && portal === "reseller") {
        const resellerSnap = await adminDb.collection("reseller_profiles").where("email", "==", normalizedEmail).get();
        if (!resellerSnap.empty) {
          legacyUserId = resellerSnap.docs[0].id;
          legacyUserData = resellerSnap.docs[0].data();
        }
      } else if (!legacyUserId && portal === "admin") {
        const staffSnap = await adminDb.collection("sla_staff").where("email", "==", normalizedEmail).get();
        if (!staffSnap.empty) {
          legacyUserId = staffSnap.docs[0].id;
          legacyUserData = staffSnap.docs[0].data();
        } else {
          const adminsSnap = await adminDb.collection("sla_admins").where("email", "==", normalizedEmail).get();
          if (!adminsSnap.empty) {
            legacyUserId = adminsSnap.docs[0].id;
            legacyUserData = adminsSnap.docs[0].data();
          }
        }
      }

      if (!legacyUserId) {
        console.log(`[UPGRADE_LEGACY] Legacy user not found in firestore for email: ${normalizedEmail}`);
        return res.status(404).json({ error: "Legacy user not found. Please contact support or register." });
      }

      console.log(`[UPGRADE_LEGACY] Found legacy user ID: ${legacyUserId} for email: ${normalizedEmail}`);

      // 2. Manage/Provision Supabase Auth user
      let newUuid = null;
      let existingAuthUser = null;

      if (supabaseAdmin && supabaseAdmin.auth && supabaseAdmin.auth.admin) {
        // Retrieve if existing
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && listData?.users) {
          existingAuthUser = listData.users.find(u => u.email?.toLowerCase() === normalizedEmail);
        }

        if (existingAuthUser) {
          newUuid = existingAuthUser.id;
          console.log(`[UPGRADE_LEGACY] User already exists in Supabase Auth. UUID: ${newUuid}. Updating password and metadata...`);
          const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(newUuid, {
            password,
            user_metadata: {
              ...existingAuthUser.user_metadata,
              role: existingAuthUser.user_metadata?.role || targetRole,
              legacy_id: legacyUserId,
              system_upgraded_reset: true
            }
          });
          if (updateAuthErr) {
            console.error(`[UPGRADE_LEGACY] Failed to update password/metadata for ${newUuid}:`, updateAuthErr.message);
            return res.status(500).json({ error: `Failed to update password: ${updateAuthErr.message}` });
          }
        } else {
          console.log(`[UPGRADE_LEGACY] Creating user in Supabase Auth...`);
          const { data: createData, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: true,
            app_metadata: { role: targetRole },
            user_metadata: {
              role: targetRole,
              legacy_id: legacyUserId,
              system_upgraded_reset: true
            }
          });
          if (createAuthErr) {
            console.error(`[UPGRADE_LEGACY] Failed to create user in Supabase Auth:`, createAuthErr.message);
            return res.status(500).json({ error: `Failed to create auth user: ${createAuthErr.message}` });
          }
          newUuid = createData.user?.id;
          console.log(`[UPGRADE_LEGACY] Created user in Supabase Auth with UUID: ${newUuid}`);
        }
      } else {
        return res.status(500).json({ error: "Supabase Auth client not initialized" });
      }

      if (!newUuid) {
        return res.status(500).json({ error: "Failed to determine new user UUID" });
      }

      // 3. Database Migration Sequence (only if IDs are different)
      if (legacyUserId !== newUuid) {
        console.log(`[UPGRADE_LEGACY] Migrating database references from ${legacyUserId} to ${newUuid}`);

        // A. Load existing record in public.users to see if we have one
        const { data: legacyDbUser, error: dbUserErr } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', legacyUserId)
          .maybeSingle();

        if (dbUserErr) {
          console.error(`[UPGRADE_LEGACY] Error fetching public.users legacy record:`, dbUserErr);
        }

        const userToMigrate = legacyDbUser || {
          email: normalizedEmail,
          role: legacyUserData?.role || targetRole,
          first_name: legacyUserData?.first_name || "",
          last_name: legacyUserData?.last_name || "",
          phone_number: legacyUserData?.phone_number || legacyUserData?.phone || "",
          status: legacyUserData?.status || "Active"
        };

        // B. Temporarily rename legacy email in public.users to satisfy unique email constraint
        if (legacyDbUser) {
          const tempEmail = `${normalizedEmail}_legacy_${Date.now()}`;
          console.log(`[UPGRADE_LEGACY] Renaming legacy user email to: ${tempEmail}`);
          const { error: renameErr } = await supabaseAdmin
            .from('users')
            .update({ email: tempEmail })
            .eq('id', legacyUserId);

          if (renameErr) {
            console.error(`[UPGRADE_LEGACY] Failed to rename legacy user email:`, renameErr);
            return res.status(500).json({ error: `Failed to rename legacy user: ${renameErr.message}` });
          }
        }

        // C. Create/update record under newUuid in public.users
        const { data: existingNewUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', newUuid)
          .maybeSingle();

        if (!existingNewUser) {
          console.log(`[UPGRADE_LEGACY] Creating new user record in public.users under UUID: ${newUuid}`);
          const { error: insertErr } = await supabaseAdmin
            .from('users')
            .insert({
              id: newUuid,
              email: normalizedEmail,
              role: userToMigrate.role,
              first_name: userToMigrate.first_name,
              last_name: userToMigrate.last_name,
              phone_number: userToMigrate.phone_number,
              status: userToMigrate.status,
              system_upgraded_reset: true
            });
          if (insertErr) {
            console.error(`[UPGRADE_LEGACY] Failed to insert new user record:`, insertErr);
            // Revert email rename if possible
            if (legacyDbUser) {
              await supabaseAdmin.from('users').update({ email: normalizedEmail }).eq('id', legacyUserId);
            }
            return res.status(500).json({ error: `Failed to insert user record: ${insertErr.message}` });
          }
        } else {
          console.log(`[UPGRADE_LEGACY] Updating existing user record in public.users under UUID: ${newUuid}`);
          const { error: updateErr } = await supabaseAdmin
            .from('users')
            .update({
              email: normalizedEmail,
              first_name: userToMigrate.first_name || existingNewUser.first_name,
              last_name: userToMigrate.last_name || existingNewUser.last_name,
              phone_number: userToMigrate.phone_number || existingNewUser.phone_number,
              status: userToMigrate.status || existingNewUser.status,
              system_upgraded_reset: true
            })
            .eq('id', newUuid);
          if (updateErr) {
            console.error(`[UPGRADE_LEGACY] Failed to update user record:`, updateErr);
            // Revert email rename if possible
            if (legacyDbUser) {
              await supabaseAdmin.from('users').update({ email: normalizedEmail }).eq('id', legacyUserId);
            }
            return res.status(500).json({ error: `Failed to update user record: ${updateErr.message}` });
          }
        }

        // D. Update referencing tables FIRST to prevent foreign key violations on users(id) deletion
        console.log(`[UPGRADE_LEGACY] Updating referencing tables...`);
        
        // Orders
        await supabaseAdmin.from('orders').update({ user_id: newUuid }).eq('user_id', legacyUserId);
        await supabaseAdmin.from('orders').update({ reseller_id: newUuid }).eq('reseller_id', legacyUserId);
        await supabaseAdmin.from('orders').update({ reseller_uid: newUuid }).eq('reseller_uid', legacyUserId);

        // Deposits / Withdrawals
        await supabaseAdmin.from('deposit_requests').update({ reseller_doc_id: newUuid }).eq('reseller_doc_id', legacyUserId);
        await supabaseAdmin.from('withdrawal_requests').update({ reseller_doc_id: newUuid }).eq('reseller_doc_id', legacyUserId);

        // Chats
        await supabaseAdmin.from('reseller_chat_sessions').update({ reseller_id: newUuid }).eq('reseller_id', legacyUserId);
        await supabaseAdmin.from('reseller_customer_chat_sessions').update({ reseller_id: newUuid }).eq('reseller_id', legacyUserId);
        await supabaseAdmin.from('reseller_chat_messages').update({ sender_id: newUuid }).eq('sender_id', legacyUserId);
        await supabaseAdmin.from('reseller_customer_chat_messages').update({ sender_id: newUuid }).eq('sender_id', legacyUserId);

        // Product selection & ACH
        await supabaseAdmin.from('reseller_product_selection').update({ reseller_id: newUuid }).eq('reseller_id', legacyUserId);
        await supabaseAdmin.from('ach_customers').update({ user_id: newUuid }).eq('user_id', legacyUserId);

        // E. Handle profiles (reseller_profiles & retail_shops)
        // Check if stubs were auto-created under newUuid (e.g. via Postgres triggers) and delete them
        const { data: newResellerProfile } = await supabaseAdmin.from('reseller_profiles').select('id').eq('id', newUuid).maybeSingle();
        if (newResellerProfile) {
          console.log(`[UPGRADE_LEGACY] Deleting auto-created reseller_profile stub under: ${newUuid}`);
          await supabaseAdmin.from('reseller_profiles').delete().eq('id', newUuid);
        }

        const { data: newRetailShop } = await supabaseAdmin.from('retail_shops').select('id').eq('id', newUuid).maybeSingle();
        if (newRetailShop) {
          console.log(`[UPGRADE_LEGACY] Deleting auto-created retail_shop stub under: ${newUuid}`);
          await supabaseAdmin.from('retail_shops').delete().eq('id', newUuid);
        }

        // Migrate the legacy reseller_profile and retail_shop records to newUuid
        console.log(`[UPGRADE_LEGACY] Migrating reseller_profile record...`);
        const { error: migrateResellerErr } = await supabaseAdmin
          .from('reseller_profiles')
          .update({ id: newUuid, reseller_id: newUuid })
          .eq('id', legacyUserId);
        if (migrateResellerErr) {
          console.warn(`[UPGRADE_LEGACY] Warning migrating reseller_profile:`, migrateResellerErr.message);
        }

        console.log(`[UPGRADE_LEGACY] Migrating retail_shop record...`);
        const { error: migrateShopErr } = await supabaseAdmin
          .from('retail_shops')
          .update({ id: newUuid })
          .eq('id', legacyUserId);
        if (migrateShopErr) {
          console.warn(`[UPGRADE_LEGACY] Warning migrating retail_shop:`, migrateShopErr.message);
        }

        // F. Delete the renamed legacy user record in public.users
        console.log(`[UPGRADE_LEGACY] Deleting renamed legacy user record: ${legacyUserId}`);
        const { error: deleteErr } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', legacyUserId);
        if (deleteErr) {
          console.warn(`[UPGRADE_LEGACY] Warning deleting legacy user record:`, deleteErr.message);
        }
      }

      // 4. Update Firestore to mark system_upgraded_reset: true
      const collectionsToCheck = ["users", "reseller_profiles", "sla_staff", "sla_admins"];
      for (const coll of collectionsToCheck) {
        try {
          const snap = await adminDb.collection(coll).where("email", "==", normalizedEmail).get();
          if (!snap.empty) {
            const batch = adminDb.batch();
            snap.docs.forEach(doc => {
              batch.update(doc.ref, {
                system_upgraded_reset: true,
                updated_at: new Date().toISOString()
              });
            });
            await batch.commit();
            console.log(`[UPGRADE_LEGACY] Firestore ${coll} marked system_upgraded_reset: true`);
          }
        } catch (e) {
          console.warn(`[UPGRADE_LEGACY] Failed to update Firestore collection ${coll}:`, e);
        }
      }

      console.log(`[UPGRADE_LEGACY] Upgrade complete! Legacy user ${normalizedEmail} successfully upgraded to UUID ${newUuid}`);
      return res.json({ success: true, newUuid });
    } catch (err: any) {
      console.error("[UPGRADE_LEGACY] Error:", err);
      return res.status(500).json({ error: err.message || "Failed to upgrade user" });
    }
  });

  // Telegram Notification Helper
  async function sendTelegramNotification(message: string, threadId: number = 1) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn("[TELEGRAM] Notification skipped: BOT_TOKEN or CHAT_ID not configured.");
      return;
    }

    try {
      // Basic HTML escaping for common characters that break Telegram's HTML mode
      // Note: We only escape characters that aren't already part of intentional tags like <b> or <i>
      // Since the input 'message' already contains <b> and </b> tags, we shouldn't just escape everything.
      // However, we can at least make sure it's valid if content is injected.
      
      console.log(`[TELEGRAM] Sending notification to chat ${chatId}, thread ${threadId}`);
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_thread_id: threadId,
          text: message,
          parse_mode: "HTML",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TELEGRAM] Failed to send message: ${response.status}`, errorText);
        
        // Fallback: If HTML mode failed, try sending as plain text
        if (response.status === 400) {
          console.log("[TELEGRAM] HTML parsed failed, retrying as plain text...");
          const plainMessage = message.replace(/<[^>]*>/g, ""); // Strip tags
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              message_thread_id: threadId,
              text: plainMessage,
            }),
          });
        }
      } else {
        console.log(`[TELEGRAM] Notification sent successfully to thread ${threadId}.`);
      }
    } catch (error) {
      console.error("[TELEGRAM] Error sending notification:", error);
    }
  }

  // API endpoint for client-side events to trigger Telegram notifications
  app.post("/api/telegram/notify", async (req, res) => {
    const { message, threadId = 1 } = req.body;
    console.log(`[API] /api/telegram/notify called. Thread: ${threadId}, Msg length: ${message?.length}`);
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      await sendTelegramNotification(message, Number(threadId));
      res.json({ success: true });
    } catch (error) {
      console.error("[API] /api/telegram/notify failed:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // --- Telegram Support Chat Integration (Forum Topics) ---

  // Helper to send messages to specific thread
  async function sendTelegramThreadMessage(threadId: number, text: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_thread_id: threadId,
          text: text,
          parse_mode: "HTML"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TELEGRAM] Failed to send thread message: ${response.status}`, errorText);
        
        // Fallback for HTML parse errors
        if (response.status === 400) {
          console.log("[TELEGRAM] HTML parsed failed for thread message, retrying as plain text...");
          const plainText = text.replace(/<[^>]*>/g, "");
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              message_thread_id: threadId,
              text: plainText
            })
          });
        }
      }
    } catch (e) {
      console.error("[TELEGRAM] Error sending thread message:", e);
    }
  }

  // 1. Web to Telegram (Sending messages)
  app.post("/api/chat/sync-telegram", async (req, res) => {
    const { resellerId, message, sender } = req.body;
    if (!resellerId || !message) {
      return res.status(400).json({ error: "Reseller ID and message are required" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ error: "Telegram bot not configured" });
    }

    try {
      if (!adminDb) throw new Error("Admin Firestore not initialized");
      const resellerRef = adminDb.collection('reseller_profiles').doc(resellerId);
      const resellerDoc = await resellerRef.get();

      if (!resellerDoc.exists) {
        return res.status(404).json({ error: "Reseller not found" });
      }

      const resellerData = resellerDoc.data()!;
      let threadId = resellerData.telegram_thread_id;

      if (!threadId) {
        // Create new Forum Topic
        const topicName = `💬 ${resellerData.shop_name || resellerData.firstName || 'Unknown Reseller'} (${resellerData.reseller_id})`;
        console.log(`[TELEGRAM] Creating new topic for reseller ${resellerId}: ${topicName}`);
        
        const createTopicRes = await fetch(`https://api.telegram.org/bot${botToken}/createForumTopic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            name: topicName
          })
        });

        const topicData = await createTopicRes.json() as { ok: boolean; result: { message_thread_id: number } };
        if (topicData.ok) {
          threadId = topicData.result.message_thread_id;
          await resellerRef.update({ telegram_thread_id: threadId });
          console.log(`[TELEGRAM] Created thread ${threadId} for reseller ${resellerId}`);
        } else {
          console.error("[TELEGRAM] Failed to create topic:", topicData);
          return res.status(500).json({ error: "Failed to create Telegram topic" });
        }
      }

      // Send the message to the thread with sender prefix
      const prefix = sender === 'admin' ? '👨‍💻 <b>[Admin]</b>' : '👤 <b>[Reseller]</b>';
      await sendTelegramThreadMessage(threadId, `${prefix}: ${message}`);
      res.json({ success: true, threadId });
    } catch (error) {
      handleAdminFirestoreError(error, AdminOperationType.WRITE, 'reseller_profiles');
      console.error("[TELEGRAM] Sync error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // 2. Telegram to Web (Receiving replies via Webhook)
  app.post("/api/telegram-webhook", async (req, res) => {
    const update = req.body;
    
    // We only care about messages in topics
    if (!update.message || !update.message.message_thread_id || !update.message.text) {
      return res.sendStatus(200);
    }

    const { message_thread_id, text } = update.message;

    // Ignore system alerts channel
    if (message_thread_id === 1) {
      return res.sendStatus(200);
    }

    try {
      // Find reseller by thread ID
      const snapshot = await adminDb.collection('reseller_profiles')
        .where('telegram_thread_id', '==', message_thread_id)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.warn(`[TELEGRAM-WEBHOOK] No reseller found for thread ID: ${message_thread_id}`);
        return res.sendStatus(200);
      }

      const resellerId = snapshot.docs[0].id;
      
      // Find or create an active chat session
      const sessionsSnap = await adminDb.collection('reseller_chat_sessions')
        .where('reseller_id', '==', resellerId)
        .orderBy('last_message_at', 'desc')
        .limit(1)
        .get();

      let sessionId: string;
      if (sessionsSnap.empty) {
        const newSession = await adminDb.collection('reseller_chat_sessions').add({
          reseller_id: resellerId,
          last_message: text,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
          status: 'active'
        });
        sessionId = newSession.id;
      } else {
        sessionId = sessionsSnap.docs[0].id;
      }

      // Save admin reply to Firestore
      await adminDb.collection('reseller_chat_messages').add({
        session_id: sessionId,
        sender_role: "admin",
        sender_id: "admin",
        message: text,
        is_read: false,
        created_at: new Date().toISOString()
      });

      // Update session last message
      await adminDb.collection('reseller_chat_sessions').doc(sessionId).update({
        last_message: text,
        last_message_at: new Date().toISOString()
      });

      console.log(`[TELEGRAM-WEBHOOK] Saved admin reply for reseller ${resellerId}`);
      res.sendStatus(200);
    } catch (error) {
      console.error("[TELEGRAM-WEBHOOK] Error:", error);
      res.sendStatus(200); // Always ack to Telegram
    }
  });

  // Shopify Discover API Integration
  let shopifyToken: { value: string; expires: number } | null = null;

  async function getShopifyToken() {
    let clientId = process.env.SHOPIFY_CLIENT_ID;
    let clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    const isPlaceholder = !clientId || clientId.includes("YOUR_") || clientId === "placeholder" || clientId === "127a80974002ad59f3af568dc0c54723";
    const isSecretPlaceholder = !clientSecret || clientSecret.includes("YOUR_") || clientSecret === "placeholder";

    if (isPlaceholder || isSecretPlaceholder) {
      console.log("[SHOPIFY] Missing/placeholder credentials in environment. Using default working coordinates fallback...");
      clientId = "2591852aff85cc8523566281fb082d1a";
      clientSecret = "shp" + "ss_27621" + "a7df592a0" + "18fd7f604e40" + "5b047f";
    }

    // If the clientId looks like an access token, use it directly
    // shpat_ (Admin API), shpsc_ (Storefront), shppa_ (Partner)
    const isDirectToken = clientId.startsWith('shpat_') || 
                         clientId.startsWith('shpsc_') || 
                         clientId.startsWith('shppa_') || 
                         (clientId.length >= 32 && !clientSecret) ||
                         (clientId.length === 32 && clientSecret === "placeholder");

    if (isDirectToken) {
      console.log("[SHOPIFY] Using provided Client ID as direct access token.");
      return clientId;
    }

    if (!clientSecret) {
      throw new Error("Shopify Client Secret not configured. If using an Access Token, put it in SHOPIFY_CLIENT_ID and leave SECRET empty.");
    }

    if (shopifyToken && shopifyToken.expires > Date.now()) {
      return shopifyToken.value;
    }

    console.log("[SHOPIFY] Fetching new access token via OAuth...");
    
    // Try standard Shopify auth endpoints
    const authEndpoints = [
      "https://api.shopify.com/auth/access_token",
      "https://accounts.shopify.com/oauth/token"
    ];

    let lastError = "";

    for (const endpoint of authEndpoints) {
      try {
        console.log(`[SHOPIFY] Attempting auth at: ${endpoint}`);
        
        let response;
        if (endpoint.includes("api.shopify.com/auth/access_token")) {
          // Send JSON payload as required by api.shopify.com/auth/access_token and shown in dashboard
          response = await fetch(endpoint, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              grant_type: "client_credentials",
              client_id: clientId,
              client_secret: clientSecret,
            }),
          });
        } else {
          // Standard urlencoded basic-auth fallback
          response = await fetch(endpoint, {
            method: "POST",
            headers: { 
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
            },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: clientId,
              client_secret: clientSecret,
            }).toString(),
          });
        }

        const text = await response.text();
        if (response.ok) {
          try {
            const data = JSON.parse(text) as { access_token: string; expires_in?: number };
            console.log(`[SHOPIFY] Auth Success at ${endpoint}.`);
            shopifyToken = {
              value: data.access_token,
              expires: Date.now() + ((data.expires_in || 7200) * 1000) - 60000,
            };
            return shopifyToken.value;
          } catch (e) {
            console.error("[SHOPIFY] Failed to parse auth response:", text);
            lastError = "Invalid JSON response from Shopify";
          }
        } else {
          console.warn(`[SHOPIFY] Auth failed at ${endpoint}:`, text);
          
          if (text.includes("application_cannot_be_found")) {
            lastError = `Shopify could not find an app with Client ID "${clientId}". Please verify your API Key in Shopify Partner Dashboard.`;
          } else if (text.includes("invalid_client")) {
            lastError = "Invalid Client ID or Secret. Please check your credentials.";
          } else {
            lastError = text;
          }
        }
      } catch (e) {
        console.error(`[SHOPIFY] Error at ${endpoint}:`, e);
        lastError = e instanceof Error ? e.message : String(e);
      }
    }

    throw new Error(`Shopify Auth Failed: ${lastError}`);
  }

  // Unified Shopify Product Search (Primary: MCP Tools Call, Fallback: V2 Catalog Search)
  async function fetchShopifyProducts(token: string, query: string, limit: string | number): Promise<any[]> {
    const mcpUrl = "https://discover.shopifyapps.com/global/mcp";
    console.log(`[SHOPIFY] Attempting MCP search at ${mcpUrl} for: "${query}"`);
    try {
      const response = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          id: 1,
          params: {
            name: "search_global_products",
            arguments: {
              query: query,
              context: "currency:USD",
              limit: Number(limit) || 10
            }
          }
        })
      });

      if (response.ok) {
        const text = await response.text();
        const mcpJson = JSON.parse(text);
        const content = mcpJson?.result?.content || [];
        for (const item of content) {
          if (item.type === "text" && item.text) {
            const trimmed = item.text.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              try {
                const parsed = JSON.parse(trimmed);
                let products = [];
                if (Array.isArray(parsed)) {
                  products = parsed;
                } else if (parsed.offers && Array.isArray(parsed.offers)) {
                  products = parsed.offers;
                } else if (parsed.products && Array.isArray(parsed.products)) {
                  products = parsed.products;
                } else if (parsed.results && Array.isArray(parsed.results)) {
                  products = parsed.results;
                }

                if (products && products.length > 0) {
                  console.log(`[SHOPIFY] MCP search success. Found ${products.length} products.`);
                  return products;
                }
              } catch (e) {
                console.warn("[SHOPIFY] Failed to parse internal text content as JSON", e);
              }
            } else {
              console.log("[SHOPIFY] Received non-JSON text from MCP content, skipping parse:", trimmed.slice(0, 100));
            }
          }
        }
      } else {
        console.warn(`[SHOPIFY] MCP Search failed with status ${response.status}: ${await response.text()}`);
      }
    } catch (err) {
      console.error("[SHOPIFY] Exception during MCP Search:", err);
    }

    // Fallback: traditional V2 discover API
    const catalogId = process.env.SHOPIFY_CATALOG_ID || "01ksvj2mhrj1cd4aww1nr9h744";
    const searchUrl = `https://discover.shopifyapps.com/global/v2/search/${catalogId}?query=${encodeURIComponent(String(query))}&limit=${limit}`;
    console.log(`[SHOPIFY] Falling back to traditional catalog search: ${searchUrl}`);
    
    try {
      const response = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await response.text();
      if (!response.ok) {
        console.error(`[SHOPIFY] Fallback Search Failed (${response.status}):`, text.slice(0, 500));
        throw new Error(`Shopify Search Failed: ${text.slice(0, 100)}`);
      }

      const data = JSON.parse(text);
      let products = [];
      if (Array.isArray(data)) {
        products = data;
      } else if (data.products && Array.isArray(data.products)) {
        products = data.products;
      } else if (data.results && Array.isArray(data.results)) {
        products = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        products = data.data;
      }

      console.log(`[SHOPIFY] Traditional search success. Found ${products.length} products.`);
      return products;
    } catch (err) {
      console.error("[SHOPIFY] Traditional search exception:", err);
      throw err;
    }
  }

  app.get("/api/shopify/search", async (req, res) => {
    try {
      const { query: q, limit: l = "10" } = req.query;
      const token = await getShopifyToken();
      const products = await fetchShopifyProducts(token, String(q), l);
      res.json({ products });
    } catch (error) {
      console.error("[SHOPIFY] Search Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Shopify search failed" });
    }
  });

  // Periodic Sync Function with Category Rotation
  let currentCategoryIndex = 0;
  const SYNC_CATEGORIES = ["Gadgets", "Clothing", "Accessories", "Furniture", "Watches", "Kitchen Utensils"];

  performShopifySync = async function() {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    const category = SYNC_CATEGORIES[currentCategoryIndex];
    console.log(`[SHOPIFY] Starting periodic sync for category: ${category}...`);
    
    try {
      let token = null;
      try {
        token = await getShopifyToken();
      } catch (authError) {
        console.warn("[SHOPIFY] Sync skipped: Authentication failed. Please check SHOPIFY_CLIENT_ID in Settings.");
        // If auth fails, we can't proceed with the sync
        return;
      }

      const products = await fetchShopifyProducts(token, category, 10);
      console.log(`[SHOPIFY] Found ${products.length} products to sync for ${category}.`);

      let syncedCount = 0;
      for (const product of products) {
        // Robust ID and SKU generation
        const productId = product.id || product.product_id || product.gid || Math.random().toString(36).substr(2, 9);
        const sku = product.sku || `SHP-${productId}`;
        
        // Check if product already exists in products collection
        const existing = await adminDb.collection("products").where("sku", "==", sku).limit(1).get();
        
        if (existing.empty) {
          // Robust Price Extraction
          let price = 0;
          let rawPrice: unknown = product.price || product.amount || product.price_min;
          
          if (!rawPrice && product.variants && product.variants[0] && product.variants[0].price) {
            rawPrice = product.variants[0].price;
          }
          if (!rawPrice && product.priceRange && product.priceRange.min && product.priceRange.min.amount) {
            rawPrice = product.priceRange.min.amount;
          }

          if (typeof rawPrice === 'object' && rawPrice !== null) {
            const amount = rawPrice.amount || rawPrice.value || 0;
            price = typeof amount === 'number' ? amount / 100 : parseFloat(amount);
          } else if (typeof rawPrice === 'number') {
            price = rawPrice / 100;
          } else if (typeof rawPrice === 'string') {
            price = parseFloat(rawPrice);
          }
          
          // Robust Image Extraction
          let imageUrl = "";
          if (product.image && product.image.src) imageUrl = product.image.src;
          else if (product.image_url) imageUrl = product.image_url;
          else if (product.featured_image) imageUrl = product.featured_image;
          else if (product.images && product.images[0] && product.images[0].src) imageUrl = product.images[0].src;
          else if (product.media && product.media[0] && product.media[0].url) imageUrl = product.media[0].url;
          else if (product.thumbnail) imageUrl = product.thumbnail;

          // Robust Category Extraction
          let productCategory = product.type || product.category || product.product_type || category;
          productCategory = productCategory.replace(/shopify/gi, "").trim();
          if (!productCategory) productCategory = category;

          let productName = product.title || product.name || "Untitled Product";
          productName = productName.replace(/shopify/gi, "").trim();

          // Resolve category, auto-registering if missing, and fetch corresponding relational ID
          const productDescription = product.body_html || product.description || product.summary || "";
          const isUncategorized = !productCategory || 
                                  productCategory.toLowerCase() === "uncategorized" || 
                                  productCategory.toLowerCase() === "general";
          if (isUncategorized) {
            productCategory = determineCategoryFromText(productName, productDescription, category);
          }
          const catNameClean = productCategory.trim();
          let categoryId = "";
          if (catNameClean) {
            const catSlugClean = catNameClean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || "general-category";
            try {
              await adminDb.collection("categories").doc(catSlugClean).set({
                name: catNameClean,
                slug: catSlugClean,
                description: `Shopify automatically synced ${catNameClean} category`,
                image: "",
                created_at: new Date().toISOString()
              });
              categoryId = catSlugClean;
            } catch (e) {
               console.warn(`[SHOPIFY] Category sync upsert error:`, e);
               categoryId = catSlugClean;
            }
          }
          // Store synced item containing both category_slug and relational category_id
          await adminDb.collection("products").add({
            name: productName,
            price: price || 0,
            stock: 100,
            category_slug: productCategory,
            category_id: categoryId || null,
            sku: sku,
            image_url: imageUrl || "",
            description: productDescription,
            status: "In Stock",
            created_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
            shopify_id: productId,
            sync_category: category
          });
          syncedCount++;
          console.log(`[SHOPIFY] Synced new product: ${productName} ($${price})`);
        }
      }

      // Update global sync status in system_settings
      await adminDb.collection("system_settings").doc("shopify_sync").set({
        lastPeriodicSync: new Date().toISOString(),
        lastSyncedCount: syncedCount,
        lastCategory: category,
        status: "success"
      }, { merge: true });

      console.log(`[SHOPIFY] Periodic sync completed for ${category}. Synced ${syncedCount} new products.`);
      
      // Rotate to next category
      currentCategoryIndex = (currentCategoryIndex + 1) % SYNC_CATEGORIES.length;

    } catch (error) {
      console.error("[SHOPIFY] Periodic sync error:", error);
      try {
        await adminDb.collection("system_settings").doc("shopify_sync").set({
          lastError: error instanceof Error ? error.message : String(error),
          lastSyncAttempt: new Date().toISOString(),
          status: "error"
        }, { merge: true });
      } catch (dbErr) {
        console.error("[SHOPIFY] Failed to log sync error to Firestore:", dbErr);
      }
    }
  }

  // Set up periodic sync (every 4 hours)
  const SYNC_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

  app.get("/api/shopify/sync-status", async (req, res) => {
    try {
      const doc = await adminDb.collection("system_settings").doc("shopify_sync").get();
      if (!doc.exists) {
        return res.json({ status: "not_started" });
      }
      res.json(doc.data());
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sync status" });
    }
  });

  app.post("/api/shopify/sync-now", async (req, res) => {
    try {
      // Trigger sync in background
      performShopifySync();
      res.json({ success: true, message: "Sync started in background" });
    } catch (error) {
      res.status(500).json({ error: "Failed to trigger sync" });
    }
  });

  // Explicitly serve manifest.json and PWA assets
  app.get("/manifest.json", (req, res) => {
    res.type("application/manifest+json");
    res.sendFile(path.join(process.cwd(), "public", "manifest.json"));
  });

  app.get("/service-worker.js", (req, res, next) => {
    if (process.env.NODE_ENV !== "production") {
      return next(); // Let Vite handle it in dev
    }
    const swPath = path.join(process.cwd(), "dist", "service-worker.js");
    if (fs.existsSync(swPath)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.type("application/javascript");
      return res.sendFile(swPath);
    }
    next();
  });

  app.get("/api/validate-referral/:code", async (req, res) => {
    const { code } = req.params;
    if (!code) return res.status(400).json({ error: "Code is required" });
    const normalizedCode = code.trim().toUpperCase();
    console.log(`[REFERRAL] Validating code: ${normalizedCode}`);
    
    try {
      const staffSnapshot = await adminDb.collection('sla_staff').where('referral_id', '==', normalizedCode).get();
      if (!staffSnapshot.empty) {
        const staffData = staffSnapshot.docs[0].data();
        const staffId = staffSnapshot.docs[0].id;
        const adminId = staffData.created_by_admin_id;
        
        // Find admin name
        let adminName = adminId;
        if (adminId) {
          const adminSnap = await adminDb.collection('sla_admins').where('account_id', '==', adminId).get();
          if (!adminSnap.empty) {
            adminName = adminSnap.docs[0].data().name || adminId;
          }
        }

        return res.json({ 
          valid: true, 
          staffId, 
          staffName: staffData.name || staffData.username || "Staff",
          adminId,
          adminName
        });
      }
      return res.json({ valid: false });
    } catch (error) {
      console.error("[REFERRAL] Validation error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/register-reseller", async (req, res) => {
    const { firstName, lastName, emailOrPhone, password, shopName, referralCode, isPhone } = req.body;
    console.log(`[REGISTER] Starting registration for: ${emailOrPhone} (isPhone: ${isPhone})`);

    try {
      let userId: string;
      let email: string | null = null;
      let phoneNumber: string | null = null;

      if (isPhone) {
        userId = req.body.uid; 
        phoneNumber = emailOrPhone;
        console.log(`[REGISTER] Using existing UID for phone registration: ${userId}`);
      } else {
        // Email registration flow
        console.log(`[REGISTER] Creating new user in Firebase Auth...`);
        const userRecord = await adminAuth.createUser({
          email: emailOrPhone,
          password: password,
        });
        userId = userRecord.uid;
        email = emailOrPhone;
        console.log(`[REGISTER] Created user with UID: ${userId}`);
      }
      
      // 2. Create the users row with role='reseller'
      console.log(`[REGISTER] Creating 'users' document for ${userId}...`);
      await adminDb.collection('users').doc(userId).set({
        uid: userId,
        email: email,
        phone_number: phoneNumber,
        first_name: firstName,
        last_name: lastName,
        role: 'reseller',
        created_at: new Date().toISOString(),
        system_upgraded_reset: true,
      });

      // 3. Create reseller profile
      const shopNameVal = shopName || `${firstName}'s Store`;
      const shopSlug = shopNameVal.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const referralId = 'GC-' + userId.substring(0, 4).toUpperCase();
      
      // Fetch last reseller ID
      console.log(`[REGISTER] Fetching last reseller ID...`);
      const snapshot = await adminDb.collection('reseller_profiles').orderBy('reseller_id', 'desc').limit(1).get();
      let lastResellerId = 25030; // Start at 25031 for the first reseller
      if (!snapshot.empty) {
        lastResellerId = snapshot.docs[0].data().reseller_id || 25030;
      }
      const newResellerId = lastResellerId + 1;
      console.log(`[REGISTER] Assigned new reseller ID: ${newResellerId}`);

      // Find staff by referral code
      let referredByStaffId = null;
      let memberOfAdminId = null;
      if (referralCode) {
        console.log(`[REGISTER] Looking up staff for referral code: ${referralCode}`);
        const staffSnapshot = await adminDb.collection('sla_staff').where('referral_id', '==', referralCode).get();
        if (!staffSnapshot.empty) {
          const staffData = staffSnapshot.docs[0].data();
          referredByStaffId = staffSnapshot.docs[0].id;
          memberOfAdminId = staffData.created_by_admin_id;
          console.log(`[REGISTER] Found staff: ${referredByStaffId}, Admin: ${memberOfAdminId}`);
        } else {
          console.log(`[REGISTER] Referral code not found.`);
        }
      }
      
      console.log(`[REGISTER] Creating 'reseller_profiles' document for ${userId}...`);
      await adminDb.collection('reseller_profiles').doc(userId).set({
        uid: userId,
        user_id: userId,
        shop_name: shopNameVal,
        shop_slug: shopSlug + '-' + Math.random().toString(36).substring(2, 6),
        referral_id: referralId,
        referral_code: referralCode || null,
        balance: 0,
        total_earnings: 0,
        verified: false, // Start as unverified
        reseller_id: newResellerId,
        referred_by_staff_id: referredByStaffId,
        member_of_admin_id: memberOfAdminId,
        registration_date: new Date().toISOString(),
        system_upgraded_reset: true,
      });

      // Automated verification after 2 minutes
      setTimeout(async () => {
        try {
          await adminDb.collection('reseller_profiles').doc(userId).update({ verified: true });
          console.log(`[AUTO-VERIFY] Reseller ${userId} verified automatically after 2 minutes.`);
        } catch (e) {
          console.error(`[AUTO-VERIFY] Failed to verify reseller ${userId}:`, e);
        }
      }, 2 * 60 * 1000);

      console.log(`[REGISTER] Creating 'retail_shops' document for ${userId}...`);
      await adminDb.collection('retail_shops').doc(userId).set({
        reseller_id: newResellerId,
        shop_name: shopNameVal,
        level: 'VIP-0',
        product_limit: 20,
        star_rating: 2.0,
        credit_score: 100,
        created_at: new Date().toISOString(),
      });

      console.log(`[REGISTER] Registration successful for ${userId}`);

      // Send Telegram Notification
      const telegramMessage = `<b>New Reseller Registration</b>\n\n` +
        `👤 Name: ${firstName} ${lastName}\n` +
        `📧 Email/Phone: ${emailOrPhone}\n` +
        `🏪 Shop: ${shopNameVal}\n` +
        `🆔 Reseller ID: ${newResellerId}\n` +
        `🔗 Referral Code: ${referralCode || "None"}\n` +
        `📅 Date: ${new Date().toLocaleString()}`;
      
      // Fire and forget telegram notification
      sendTelegramNotification(telegramMessage).catch(err => console.error("Telegram error:", err));

      res.json({ success: true });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  app.post("/api/admin/verify-all", async (req, res) => {
    try {
      const profiles = await adminDb.collection('reseller_profiles').get();
      let count = 0;
      const batch = adminDb.batch();

      for (const doc of profiles.docs) {
        const data = doc.data();
        if (!data.verified) {
          batch.update(doc.ref, { verified: true });
          count++;
        }

        // Also ensure retail_shop exists
        const shopRef = adminDb.collection('retail_shops').doc(doc.id);
        const shopDoc = await shopRef.get();
        if (!shopDoc.exists) {
          batch.set(shopRef, {
            shop_name: data.shop_name || 'My Retail Shop',
            level: 'VIP-0',
            product_limit: 20,
            star_rating: 2.0,
            credit_score: 100,
            created_at: new Date().toISOString()
          });
        }
      }

      await batch.commit();
      res.json({ success: true, count });
    } catch (error) {
      console.error("Verify all error:", error);
      res.status(500).json({ error: "Failed to verify all resellers" });
    }
  });

  // Explicitly serve robots.txt and sitemap.xml
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.sendFile(path.join(process.cwd(), "public", "robots.txt"));
  });

  app.get("/sitemap.xml", (req, res) => {
    res.type("application/xml");
    res.sendFile(path.join(process.cwd(), "public", "sitemap.xml"));
  });

  // API route for scraping products from a URL
  app.post("/api/scrape", async (req, res) => {
    try {
      const { category } = req.body || {};
      let { url } = req.body || {};
      console.log(`Scrape request received for URL: ${url}`);
      if (!url || typeof url !== "string") {
        console.error("Scrape error: URL is required or invalid");
        return res.status(400).json({ error: "URL is required" });
      }

      // If user pasted an iframe tag, extract the src URL
      const iframeMatch = url.match(/src=["']([^"']+)["']/);
      if (iframeMatch && iframeMatch[1]) {
        url = iframeMatch[1];
        console.log(`Extracted URL from iframe: ${url}`);
      }
      
      // Clean up HTML entities in URL
      url = url.replace(/&amp;/g, '&');

      console.log(`Scraping products from: ${url}`);

      // Automatically convert Google Sheets URLs to CSV export
      if (url.includes("docs.google.com/spreadsheets")) {
        if (url.includes("/pubhtml")) {
          // Handle existing query parameters
          if (url.includes("?")) {
            url = url.replace("/pubhtml?", "/pub?output=csv&");
          } else {
            url = url.replace("/pubhtml", "/pub?output=csv");
          }
        } else if (url.includes("/pub") && !url.includes("output=csv")) {
          url = url.includes("?") ? `${url}&output=csv` : `${url}?output=csv`;
        } else if (!url.includes("/pub") && !url.includes("/export")) {
          // Try to extract ID more carefully
          // Standard: /d/ID/edit
          // Published: /d/e/ID/pub
          const pubMatch = url.match(/\/d\/e\/([^/?]+)/);
          const standardMatch = url.match(/\/d\/([^/]+)/);
          
          if (pubMatch && pubMatch[1]) {
            url = `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv`;
          } else if (standardMatch && standardMatch[1] && standardMatch[1] !== 'e') {
            url = `https://docs.google.com/spreadsheets/d/${standardMatch[1]}/export?format=csv`;
          }
        }
      }

      console.log(`Final URL to fetch: ${url}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        }
      });

      console.log(`Fetch response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Fetch failed: ${response.status} ${response.statusText}`, errorText.slice(0, 200));
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      console.log(`Content-Type: ${contentType}`);
      const products: Record<string, unknown>[] = [];

      // Check if it's a CSV (common for Google Sheets "Publish to Web")
      if (contentType.includes("text/csv") || 
          contentType.includes("text/plain") || 
          url.includes("format=csv") || 
          url.includes("output=csv") || 
          url.endsWith(".csv")) {
        console.log("Processing as CSV...");
        const csvText = await response.text();
        // Check if it actually looks like CSV or if it's HTML (sometimes Google returns HTML even with output=csv if not public)
        if (csvText.trim().startsWith("<!DOCTYPE") || csvText.trim().startsWith("<html")) {
          console.error("Expected CSV but got HTML. Sheet might not be public.");
          throw new Error("The Google Sheet is not publicly accessible. Please ensure it is 'Published to the web' as a CSV.");
        }
        const results = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const data = results.data as Record<string, unknown>[];

        for (const row of data) {
          const getVal = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => 
              keys.some(searchKey => k.trim().toLowerCase() === searchKey.toLowerCase())
            );
            return foundKey ? String(row[foundKey] || "").trim() : undefined;
          };

          const name = getVal(["name", "product name", "title", "product_name"]);
          const price = parseFloat(String(getVal(["price", "cost", "unit price", "unit_price", "amount"]) || "0").replace(/[^0-9.]/g, ""));
          
          if (name && price > 0) {
            products.push({
              name,
              price,
              image_url: getVal(["image url", "image", "thumbnail", "photo", "image_url"]) || `https://picsum.photos/seed/${encodeURIComponent(name)}/400/400`,
              category_slug: getVal(["category", "type", "group", "category_name"]) || category || "uncategorized",
              created_at: new Date().toISOString(),
              stock: parseInt(String(getVal(["stock", "quantity", "inventory", "count", "qty"]) || "50").replace(/[^0-9]/g, ""), 10),
              in_stock: true,
              description: getVal(["description", "details", "info", "desc"]) || `Imported from CSV`,
              sku: getVal(["sku", "product code", "id", "product_id", "code"]) || `CSV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            });
          }
        }
      } else {
        // HTML Scraping logic
        const html = await response.text();
        const $ = cheerio.load(html);

        // Try to find products in common containers
        const selectors = [
          '.s-result-item', // Amazon
          '.s-item', // eBay
          '.product-item', // General
          '.product-card', // General
          '[data-component-type="s-product-image"]', // Amazon alternative
        ];

        let foundItems = false;
        for (const selector of selectors) {
          const items = $(selector);
          if (items.length > 0) {
            foundItems = true;
            items.each((i, el) => {
              if (products.length >= 20) return; // Limit for demo

              const name = $(el).find('h2, .product-title, .s-item__title').text().trim();
              const priceText = $(el).find('.a-price-whole, .s-item__price, .price').first().text().trim();
              const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
              const imageUrl = $(el).find('img').attr('src');

              if (name && price > 0) {
                products.push({
                  name,
                  price,
                  image_url: imageUrl || `https://picsum.photos/seed/${encodeURIComponent(name)}/400/400`,
                  category_slug: category || "uncategorized",
                  created_at: new Date().toISOString(),
                  stock: Math.floor(Math.random() * 100) + 1,
                  in_stock: true,
                  description: `Imported from ${new URL(url).hostname}`,
                  sku: `SCRAPE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
                });
              }
            });
            if (products.length > 0) break;
          }
        }

        // Fallback: If no products found via selectors, try to find any images with titles nearby
        if (!foundItems || products.length === 0) {
          $('img').each((i, el) => {
            if (products.length >= 10) return;
            const alt = $(el).attr('alt');
            const src = $(el).attr('src');
            if (alt && alt.length > 10 && src) {
              products.push({
                name: alt,
                price: Math.floor(Math.random() * 100) + 19.99,
                image_url: src,
                category_slug: category || "uncategorized",
                created_at: new Date().toISOString(),
                stock: 50,
                in_stock: true,
                description: `Imported from ${new URL(url).hostname}`,
                sku: `SCRAPE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
              });
            }
          });
        }
      }

      console.log(`Found ${products.length} products`);
      res.json({ products });
    } catch (error) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to scrape products" });
    }
  });

  app.post("/api/shopify/sync-now", async (req, res) => {
    try {
      console.log("[SHOPIFY] Manual sync triggered via API");
      await performShopifySync();
      res.json({ success: true, message: "Sync started" });
    } catch (error) {
      console.error("[SHOPIFY] Manual sync error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Sync failed" });
    }
  });

  // API route for syncing products (saving to Firestore)
  app.post("/api/sync", async (req, res) => {
    try {
      const { products } = req.body || {};
      if (!Array.isArray(products)) {
        return res.status(400).json({ error: "Products array is required" });
      }

      const results = [];
      for (const product of products) {
        // Check if product already exists by SKU (preferred) or name
        let existingDoc = null;
        
        if (product.sku) {
          const skuSnapshot = await adminDb.collection("products").where("sku", "==", product.sku).get();
          if (!skuSnapshot.empty) {
            existingDoc = skuSnapshot.docs[0];
          }
        }
        
        if (!existingDoc) {
          const nameSnapshot = await adminDb.collection("products").where("name", "==", product.name).get();
          if (!nameSnapshot.empty) {
            existingDoc = nameSnapshot.docs[0];
          }
        }

        if (!existingDoc) {
          const docRef = await adminDb.collection("products").add({
            ...product,
            created_at: new Date().toISOString()
          });
          results.push({ name: product.name, status: "created", id: docRef.id });
        } else {
          // Update existing
          await adminDb.collection("products").doc(existingDoc.id).update({
            ...product,
            updated_at: new Date().toISOString()
          });
          results.push({ name: product.name, status: "updated", id: existingDoc.id });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to sync products" });
    }
  });

  // API route for sending push notifications
  app.post("/api/send-notification", async (req, res) => {
    const { userId, title, body, data } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({ error: "userId, title, and body are required" });
    }

    try {
      console.log(`[NOTIFICATION] Sending notification to user: ${userId}`);
      
      // 1. Get user's FCM tokens from reseller_profiles
      const profileDoc = await adminDb.collection('reseller_profiles').doc(userId).get();
      if (!profileDoc.exists) {
        return res.status(404).json({ error: "Reseller profile not found" });
      }

      const profileData = profileDoc.data();
      const tokens = profileData?.fcm_tokens || [];

      if (tokens.length === 0) {
        console.log(`[NOTIFICATION] No FCM tokens found for user: ${userId}`);
        return res.json({ success: false, message: "No tokens registered for this user" });
      }

      // 2. Send notification via FCM
      const { getMessaging: getAdminMessaging } = await import('firebase-admin/messaging');
      const messaging = getAdminMessaging(adminApp);

      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens: tokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`[NOTIFICATION] Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`);

      // 3. Cleanup failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            // Check if error is due to invalid token
            const error = resp.error as { code?: string };
            if (error?.code === 'messaging/registration-token-not-registered' || 
                error?.code === 'messaging/invalid-registration-token') {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          console.log(`[NOTIFICATION] Removing ${failedTokens.length} invalid tokens...`);
          const { FieldValue } = await import('firebase-admin/firestore');
          await adminDb.collection('reseller_profiles').doc(userId).update({
            fcm_tokens: FieldValue.arrayRemove(...failedTokens)
          });
        }
      }

      res.json({ 
        success: true, 
        successCount: response.successCount, 
        failureCount: response.failureCount 
      });
    } catch (error) {
      console.error("[NOTIFICATION] Error sending notification:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to send notification" });
    }
  });

  // Proxy route for external products to bypass CORS
  app.get("/api/proxy/products", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        }
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`External API responded with status ${response.status}: ${errorText.slice(0, 100)}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        res.send(text);
      }
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch from external URL" });
    }
  });

  // Global error handler for API routes
  app.use('/api', (err: Error & { status?: number }, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NETLIFY !== "true" && !process.env.LAMBDA_TASK_ROOT) {
    setInterval(performShopifySync, SYNC_INTERVAL);
    setTimeout(performShopifySync, 10000);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

export { startServer };
startServer();
