import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, clearIndexedDbPersistence, terminate, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, type Messaging } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

export const getFirebaseConfig = () => ({
  apiKey: firebaseConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
});

const config = getFirebaseConfig();
const app: FirebaseApp = initializeApp(config);
export const auth: Auth = getAuth(app);

// Initialize Messaging
let messagingInstance: Messaging | null = null;
if (typeof window !== 'undefined') {
  try {
    messagingInstance = getMessaging(app);
  } catch (e) {
    console.error("[FIREBASE] Messaging init failed:", e);
  }
}
export const messaging = messagingInstance;

// Use the correct database ID from config as primary source
// In AI Studio, the named database is usually where rules are deployed.
const databaseId = firebaseConfig.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

console.log('[FIREBASE_INIT] Project ID:', firebaseConfig.projectId);
console.log('[FIREBASE_INIT] Database ID:', databaseId);

// Check for clearCache parameter
const isClearCache = typeof window !== 'undefined' && window.location.search.includes('clearCache=true');

// Initialize Firestore with settings to handle proxied environments
let dbInstance: Firestore;
try {
  if (isClearCache) {
    console.log("[FIREBASE] Clear cache requested via URL parameter...");
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin + window.location.pathname;
    // This is just a fallback, the code below won't execute due to redirect
    dbInstance = getFirestore(app, databaseId);
  } else {
    // Use initializeFirestore with local cache enabled to significantly reduce read costs
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
    }, databaseId !== '(default)' ? databaseId : undefined);
    console.log("[FIREBASE] Firestore initialized with persistent local cache enabled.");
  }
} catch (e) {
  console.error("[FIREBASE] Init failed:", e);
  // Fallback to basic getFirestore if initialize fails (e.g. if already initialized)
  dbInstance = getFirestore(app, databaseId);
}

export const db: Firestore = dbInstance!;

// Add a helper to clear cache manually if needed
if (typeof window !== 'undefined') {
  (window as unknown as { clearFirebaseCache: () => Promise<void> }).clearFirebaseCache = async () => {
    try {
      console.log("[FIREBASE] Attempting to clear cache...");
      // Clear all local storage and indexedDB related to Firebase
      localStorage.clear();
      sessionStorage.clear();
      
      // Terminate the instance first to allow clearing persistence
      try {
        await terminate(db);
      } catch (termErr) {
        console.warn("[FIREBASE] Terminate failed (might already be terminated):", termErr);
      }
      
      await clearIndexedDbPersistence(db);
      console.log("[FIREBASE] Cache cleared successfully.");
      window.location.href = window.location.origin + window.location.pathname + '?reset=' + Date.now();
    } catch (e) {
      console.error("[FIREBASE] Failed to clear cache:", e);
      // Fallback: just reload
      window.location.reload();
    }
  };
}

export const storage: FirebaseStorage = getStorage(app);

// Connection test as per critical constraint
async function testConnection() {
  try {
    // 1. Test read from public collection
    // Use a timeout to avoid hanging indefinitely
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Firestore connection timeout")), 15000)
    );
    
    await Promise.race([
      getDocFromServer(doc(db, '_connection_test_', 'ping')),
      timeoutPromise
    ]);
    
    console.log("[FIREBASE_TEST] Firestore connection test successful.");

    // 2. Test write if authenticated
    const { onAuthStateChanged } = await import('firebase/auth');
    const { setDoc } = await import('firebase/firestore');
    
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("[FIREBASE_TEST] User authenticated, testing write access...");
        try {
          const testWritePath = `_connection_test_/write_${user.uid}`;
          await setDoc(doc(db, testWritePath), {
            timestamp: new Date().toISOString(),
            uid: user.uid
          });
          console.log("[FIREBASE_TEST] Write access success at:", testWritePath);
        } catch (e) {
          console.error("[FIREBASE_TEST] Write access failed:", e);
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable') || error.message.includes('permission'))) {
      console.error("CRITICAL: Firestore connection or permission failed. Error:", error.message);
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error Details:', {
    message: errInfo.error,
    path: errInfo.path,
    op: errInfo.operationType,
    uid: errInfo.authInfo.userId,
    email: errInfo.authInfo.email
  });
  throw new Error(JSON.stringify(errInfo));
}
