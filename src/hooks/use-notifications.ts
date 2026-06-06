import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useReseller } from '@/lib/reseller-context-hooks';
import { detectPortal } from '@/lib/subdomain';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  department: string;
  timestamp: string;
  read: boolean;
  type?: string;
}

const READ_KEY = 'broadcast_read_ids';

export function getReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch { return new Set(); }
}

export function markAsRead(ids: string[]) {
  try {
    const existing = getReadIds();
    ids.forEach(id => existing.add(id));
    localStorage.setItem(READ_KEY, JSON.stringify([...existing]));
  } catch (e) {
    console.warn("Failed to mark notifications as read in localStorage", e);
  }
}

let flashInterval: ReturnType<typeof setInterval> | null = null;
export function startTabFlash() {
  if (flashInterval) return;
  const original = document.title;
  let on = false;
  flashInterval = setInterval(() => {
    document.title = on ? '🔔 New Message!' : original;
    on = !on;
  }, 800);
  const stop = () => {
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
    document.title = original;
    window.removeEventListener('focus', stop);
  };
  window.addEventListener('focus', stop);
}

export function playNotificationSound() {
  try {
    const AudioContextClass = (window.AudioContext || (window as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio context errors
  }
}

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const prevCount = useRef(0);
  const isInitialRender = useRef(true);
  const { reseller } = useReseller();
  const portal = detectPortal();
  const isResellerPortal = portal === 'reseller';

  const { data: notifications = [] } = useQuery({
    queryKey: ['broadcast_notifications_unread', reseller?.id, isResellerPortal],
    queryFn: async () => {
      const q = query(collection(db, 'broadcast_notifications'), where('is_archived', '==', false));
      const snapshot = await getDocs(q);
      const broadcastIds = snapshot.docs.map(doc => ({ id: doc.id }));

      let resellerIds: { id: string }[] = [];
      if (reseller?.id && isResellerPortal) {
        const rq = query(
          collection(db, 'reseller_notifications'), 
          where('reseller_id', '==', reseller.id),
          where('read', '==', false)
        );
        const rSnapshot = await getDocs(rq);
        resellerIds = rSnapshot.docs.map(doc => ({ id: doc.id }));
      }

      return [...broadcastIds, ...resellerIds];
    },
    refetchInterval: 2 * 60 * 1000, // 2 minutes instead of 15 seconds
  });

  useEffect(() => {
    const readIds = getReadIds();
    const unread = notifications.filter(n => !readIds.has(n.id));
    const newCount = unread.length;
    
    if (newCount > prevCount.current) {
      if (!isInitialRender.current) {
        playNotificationSound();
        if (document.hidden) startTabFlash();
      }
    }
    
    prevCount.current = newCount;
    setCount(newCount);
    isInitialRender.current = false;
  }, [notifications]);

  return count;
}
