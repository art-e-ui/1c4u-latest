import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
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
import { playNotificationSound, startTabFlash } from './use-support';

export interface CustomerChatMessage {
  id: string;
  session_id: string;
  sender: 'customer' | 'reseller';
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatSession {
  id: string;
  reseller_id: string;
  customer_id: string;
  customer_name: string;
  last_message_at: string;
  created_at: string;
}

export async function getOrCreateResellerChatSession(
  customerId: string, 
  customerName: string, 
  resellerId: string
): Promise<string> {
  try {
    // Query for existing session between this customer and this reseller
    const q = query(
      collection(db, 'reseller_customer_chat_sessions'),
      where('reseller_id', '==', resellerId),
      where('customer_id', '==', customerId)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    
    // Create new session
    const docRef = await addDoc(collection(db, 'reseller_customer_chat_sessions'), {
      reseller_id: resellerId,
      customer_id: customerId,
      customer_name: customerName,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error in getOrCreateResellerChatSession:", error);
    throw error;
  }
}

export function useResellerChat(sessionId: string | null) {
  const [messages, setMessages] = useState<CustomerChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'reseller_customer_chat_messages'),
      where('session_id', '==', sessionId)
    );

    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CustomerChatMessage));

      // Sort in memory to avoid composite index
      const sortedMessages = [...allMessages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(prev => {
        if (!isInitialLoad) {
          const prevIds = new Set(prev.map(m => m.id));
          const newResellerMsgs = sortedMessages.filter(m => !prevIds.has(m.id) && m.sender === 'reseller');
          if (newResellerMsgs.length > 0) {
            playNotificationSound();
            if (document.hidden) startTabFlash();
          }
        }
        return sortedMessages;
      });
      
      setLoading(false);
      isInitialLoad = false;
    });

    return () => unsubscribe();
  }, [sessionId]);

  const sendMessage = async (message: string, sender: 'customer' | 'reseller' = 'customer') => {
    if (!sessionId || !message.trim()) return;

    try {
      await addDoc(collection(db, 'reseller_customer_chat_messages'), {
        session_id: sessionId,
        sender,
        message: message.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      });

      await updateDoc(doc(db, 'reseller_customer_chat_sessions', sessionId), {
        last_message_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  return { messages, loading, sendMessage };
}
