import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import * as cheerio from "cheerio";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import fs from "fs";
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

import * as PapaModule from "papaparse";
const Papa = (PapaModule as { default?: typeof PapaModule }).default || PapaModule;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config for server-side usage
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfigFile = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};

const firebaseConfig = {
  apiKey: firebaseConfigFile.apiKey || process.env.FIREBASE_API_KEY,
  authDomain: firebaseConfigFile.authDomain || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigFile.projectId || process.env.FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigFile.storageBucket || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigFile.messagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigFile.appId || process.env.FIREBASE_APP_ID,
  firestoreDatabaseId: firebaseConfigFile.firestoreDatabaseId || process.env.FIREBASE_FIRESTORE_DATABASE_ID
};

// Initialize Firebase on the server
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

const db = getFirestore(firebaseApp, databaseId);

// Initialize Firebase Admin
console.log(`[FIREBASE] Config Project ID: ${firebaseConfig.projectId}`);
console.log(`[FIREBASE] Env Project ID: ${process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'Not Set'}`);
console.log(`[FIREBASE] Env Project ID (AIS): ${process.env.AIS_PROJECT_ID || 'Not Set'}`);

// Force the project ID in the environment to ensure Admin SDK uses the correct one
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
  process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
}

// Initialize Firebase Admin with a specific name to avoid conflicts and ensure correct project
const ADMIN_APP_NAME = 'shopify-sync-admin';
let adminApp;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log(`[FIREBASE] Initializing Admin SDK with Service Account for project: ${serviceAccount.project_id}`);
    adminApp = !getAdminApps().find(app => app.name === ADMIN_APP_NAME)
      ? initializeAdminApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id
        }, ADMIN_APP_NAME)
      : getAdminApps().find(app => app.name === ADMIN_APP_NAME)!;
  } catch (err) {
    console.error("[FIREBASE] Failed to parse FIREBASE_SERVICE_ACCOUNT secret:", err);
  }
}

if (!adminApp) {
  adminApp = !getAdminApps().find(app => app.name === ADMIN_APP_NAME)
    ? initializeAdminApp({
        projectId: firebaseConfig.projectId
      }, ADMIN_APP_NAME) 
    : getAdminApps().find(app => app.name === ADMIN_APP_NAME)!;
}

// Use the same databaseId as the client SDK
console.log(`[FIREBASE] Initializing Admin SDK (${ADMIN_APP_NAME}) with Project ID: ${firebaseConfig.projectId} and Database ID: ${databaseId}`);
let adminDb = getAdminFirestore(adminApp, databaseId);
const adminAuth = getAdminAuth(adminApp);

// Test Admin SDK connection on startup and set working adminDb
async function testAdminConnection() {
  const databasesToTry = [databaseId, "(default)"].filter((v, i, a) => a.indexOf(v) === i);
  
  for (const dbId of databasesToTry) {
    try {
      console.log(`[FIREBASE] Testing Admin SDK connection for database: ${dbId} in project: ${firebaseConfig.projectId}...`);
      console.log(`[FIREBASE] Using Service Account: ${!!process.env.FIREBASE_SERVICE_ACCOUNT}`);
      const testDb = getAdminFirestore(adminApp, dbId);
      await testDb.collection("system_settings").doc("connection_test").set({
        lastTest: new Date().toISOString(),
        message: `Admin SDK connection test for ${dbId} in ${firebaseConfig.projectId}`,
        databaseId: dbId,
        projectId: firebaseConfig.projectId
      }, { merge: true });
      console.log(`[FIREBASE] Admin SDK connection test successful for ${dbId} in ${firebaseConfig.projectId}.`);
      
      // Update the global adminDb to the working one
      adminDb = testDb;
      return;
    } catch (error) {
      console.error(`[FIREBASE] Admin SDK connection test FAILED for ${dbId}:`, error);
    }
  }
}
testAdminConnection();

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Canonical domain redirect (Optional but recommended for SEO/Trust)
  // Exclude /api and /.well-known routes to avoid breaking requests
  app.use((req, res, next) => {
    const host = req.get('host');
    const isWellKnown = req.path.startsWith('/.well-known');
    const isApi = req.path.startsWith('/api');
    
    if (host === 'www.globalcart-onlineshop.com' && !isApi && !isWellKnown) {
      return res.redirect(301, `https://globalcart-onlineshop.com${req.originalUrl}`);
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
        sender: "admin",
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
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || clientId.includes("YOUR_") || clientId === "placeholder" || clientId === "127a80974002ad59f3af568dc0c54723") {
      const msg = clientId === "127a80974002ad59f3af568dc0c54723" 
        ? `Shopify Client ID "127a80974002ad59f3af568dc0c54723" is invalid or deleted.`
        : "Shopify credentials not configured or using placeholders.";
      console.warn(`[SHOPIFY] ${msg} Sync will be skipped.`);
      throw new Error(`${msg} Please update SHOPIFY_CLIENT_ID in Settings.`);
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
        
        const response = await fetch(endpoint, {
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

        const text = await response.text();
        if (response.ok) {
          try {
            const data = JSON.parse(text) as { access_token: string; expires_in: number };
            console.log(`[SHOPIFY] Auth Success at ${endpoint}. Token expires in:`, data.expires_in);
            shopifyToken = {
              value: data.access_token,
              expires: Date.now() + (data.expires_in * 1000) - 60000,
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

  app.get("/api/shopify/search", async (req, res) => {
    try {
      const { query: q, limit: l = "10" } = req.query;
      const token = await getShopifyToken();
      const catalogId = process.env.SHOPIFY_CATALOG_ID || "01knz28jz17m4j38nhhkeqaefe";

      const searchUrl = `https://discover.shopifyapps.com/global/v2/search/${catalogId}?query=${encodeURIComponent(String(q))}&limit=${l}`;
      console.log(`[SHOPIFY] Searching: ${searchUrl}`);
      
      const response = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await response.text();
      if (!response.ok) {
        console.error(`[SHOPIFY] Search Failed (${response.status}):`, text.slice(0, 500));
        throw new Error(`Shopify Search Failed: ${text.slice(0, 100)}`);
      }

      try {
        const data = JSON.parse(text);
        console.log("[SHOPIFY] Full Response Structure:", JSON.stringify(data).slice(0, 1000));
        
        // Flexible product extraction
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

        console.log(`[SHOPIFY] Search Success. Extracted ${products.length} products.`);
        if (products.length > 0) {
          console.log("[SHOPIFY] First product sample:", JSON.stringify(products[0]).slice(0, 200));
        }
        
        res.json({ products });
      } catch (e) {
        console.error("[SHOPIFY] Non-JSON response:", text.slice(0, 500));
        throw new Error("Shopify returned an invalid response format (HTML instead of JSON). Please check your Catalog ID.");
      }
    } catch (error) {
      console.error("[SHOPIFY] Search Error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Shopify search failed" });
    }
  });

  // Periodic Sync Function with Category Rotation
  let currentCategoryIndex = 0;
  const SYNC_CATEGORIES = ["Gadgets", "Clothing", "Accessories", "Furniture", "Watches", "Kitchen Utensils"];

  async function performShopifySync() {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    // Silently skip if not configured or using known invalid placeholder
    if (!clientId || clientId.includes("YOUR_") || clientId === "placeholder" || clientId === "127a80974002ad59f3af568dc0c54723") {
      return;
    }

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

      const catalogId = process.env.SHOPIFY_CATALOG_ID || "01knz28jz17m4j38nhhkeqaefe";
      
      const searchUrl = `https://discover.shopifyapps.com/global/v2/search/${catalogId}?query=${encodeURIComponent(category)}&limit=10`;
      
      const response = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const text = await response.text();
      console.log(`[SHOPIFY] Periodic Sync Response (${response.status}) for ${searchUrl}:`, text.slice(0, 200));
      if (!response.ok) {
        console.error("[SHOPIFY] Sync Search Failed:", text.slice(0, 500));
        throw new Error(`Shopify Sync Search Failed (${response.status}): ${text.slice(0, 100)}`);
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("[SHOPIFY] Sync Search returned non-JSON:", text.slice(0, 500));
        throw new Error("Shopify returned an invalid response format (HTML instead of JSON).");
      }

      // Flexible product extraction
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

          await adminDb.collection("products").add({
            name: productName,
            price: price || 0,
            stock: 100, // Default stock for synced products
            category_slug: productCategory,
            sku: sku,
            image_url: imageUrl || "",
            description: product.body_html || product.description || product.summary || "",
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
  setInterval(performShopifySync, SYNC_INTERVAL);
  
  // Initial sync after server start (delayed to ensure everything is ready)
  setTimeout(performShopifySync, 10000); // 10 seconds after startup for faster testing

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
