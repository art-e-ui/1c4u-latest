import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, auth } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export function useFcmToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const requestPermission = async () => {
      if (!messaging || typeof window === 'undefined') return;
      
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Get the existing service worker registration from Vite PWA
          const registration = await navigator.serviceWorker.ready;
          
          // IMPORTANT: Replace with your actual VAPID public key from Firebase Console
          // Project Settings > Cloud Messaging > Web Push certificates
          const currentToken = await getToken(messaging, {
            vapidKey: 'BF-NeDmQHHkqXpJjtmbq1KJbuN4kh-J5ql4sB7EJOK06I6XZBgA1NZgfHIZCGvJEEIua3e3w-LrPDqakTIofzYU',
            serviceWorkerRegistration: registration
          });
          
          if (currentToken) {
            setToken(currentToken);
            console.log('[FCM] Token generated:', currentToken);
            
            // Store token in reseller profile if logged in
            if (auth.currentUser) {
              try {
                const resellerRef = doc(db, 'reseller_profiles', auth.currentUser.uid);
                await updateDoc(resellerRef, {
                  fcm_tokens: arrayUnion(currentToken),
                  last_token_update: new Date().toISOString()
                });
                console.log('[FCM] Token saved to Firestore');
              } catch (e) {
                console.error('[FCM] Failed to save token to Firestore:', e);
              }
            }
          } else {
            console.warn('[FCM] No registration token available. Request permission to generate one.');
          }
        } else {
          console.warn('[FCM] Notification permission denied');
        }
      } catch (error) {
        console.error('[FCM] An error occurred while retrieving token:', error);
      }
    };

    // Only run if user is authenticated
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        requestPermission();
      }
    });

    if (messaging) {
      const unsubscribeMessage = onMessage(messaging, (payload) => {
        console.log('[FCM] Foreground message received:', payload);
        // You can show a toast or custom notification here if needed
        if (payload.notification) {
          // Standard browser notification if tab is active but maybe user is looking elsewhere
          new Notification(payload.notification.title || 'New Notification', {
            body: payload.notification.body,
            icon: '/brand/icon-192.png'
          });
        }
      });
      return () => {
        unsubscribeAuth();
        unsubscribeMessage();
      };
    }

    return () => unsubscribeAuth();
  }, []);

  return token;
}
