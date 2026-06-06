import { useState, useEffect, useRef } from 'react';
import { auth, db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';

export const SESSION_KEY = 'support_session_id';

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: string;
  message: string;
  attachment_product_id: string | null;
  is_read: boolean;
  created_at: string;
}

// Notification sound
export function playNotificationSound() {
  try {
    const AudioContextClass = (window.AudioContext || (window as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.error("Audio playback failed", err);
  }
}

let flashInterval: ReturnType<typeof setInterval> | null = null;
export function startTabFlash() {
  if (flashInterval) return;
  const original = document.title;
  let on = false;
  flashInterval = setInterval(() => {
    document.title = on ? '💬 New Support Reply!' : original;
    on = !on;
  }, 800);
  const stop = () => {
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
    document.title = original;
    window.removeEventListener('focus', stop);
  };
  window.addEventListener('focus', stop);
}

export function useUnreadSupport() {
  const [count, setCount] = useState(0);
  const prevCount = useRef(0);
  const isInitialRender = useRef(true);
  
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem(SESSION_KEY));
  
  useEffect(() => {
    // Check for session ID changes periodically or via custom event
    const checkSession = () => {
      const current = localStorage.getItem(SESSION_KEY);
      if (current !== sessionId) setSessionId(current);
    };
    const interval = setInterval(checkSession, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const messagesQuery = query(
      collection(db, 'support_messages'),
      where('session_id', '==', sessionId),
      where('sender', '==', 'support'),
      where('is_read', '==', false)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newCount = snapshot.docs.length;
      if (newCount > prevCount.current) {
        if (!isInitialRender.current) {
          playNotificationSound();
          if (document.hidden) startTabFlash();
        }
      }
      prevCount.current = newCount;
      setCount(newCount);
      isInitialRender.current = false;
    });

    return () => unsubscribe();
  }, [sessionId]);
  
  return count;
}

export async function getOrCreateSession(userName?: string, resellerId?: string): Promise<string> {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    try {
      // Verify it still exists
      const sessionDoc = await getDoc(doc(db, 'support_sessions', existing));
      if (sessionDoc.exists()) {
        // Mark online
        const updates: Record<string, string | boolean | null> = { is_online: true };
        if (userName && sessionDoc.data().customer_name !== userName) {
          updates.customer_name = userName;
        }
        if (resellerId && sessionDoc.data().reseller_id !== resellerId) {
          updates.reseller_id = resellerId;
        }
        await updateDoc(doc(db, 'support_sessions', existing), updates);
        return existing;
      }
    } catch (e) {
      console.error("Error verifying existing session", e);
    }
  }
  
  // Create new session
  const name = userName || ('Customer ' + Math.floor(Math.random() * 9000 + 1000));
  try {
    const user = auth.currentUser;
    const sessionData = { 
      customer_name: name, 
      is_online: true,
      last_message_at: new Date().toISOString(),
      user_id: user?.uid ?? null,
      reseller_id: resellerId || null
    };
    
    const docRef = await addDoc(collection(db, 'support_sessions'), sessionData);
    
    const id = docRef.id;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch (err) {
    console.error("Exception creating support session", err);
    return '';
  }
}
