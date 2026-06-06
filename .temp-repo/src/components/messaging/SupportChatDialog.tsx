import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Headset, Send, ImagePlus } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { getOrCreateSession, playNotificationSound, startTabFlash, ChatMessage } from '@/hooks/use-support';
import { uploadChatImage, encodeImageAttachment, parseImageAttachment } from '@/lib/chat-image-upload';
import { toast } from 'sonner';

export default function SupportChatDialog({ open, onClose, userName, resellerId }: { open: boolean; onClose: () => void; userName?: string; resellerId?: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Init session
  useEffect(() => {
    if (open) {
      getOrCreateSession(userName, resellerId).then(setSessionId);
    }
  }, [open, userName, resellerId]);

  // Realtime messages
  useEffect(() => {
    if (!sessionId) return;
    
    const messagesQuery = query(
      collection(db, 'support_messages'),
      where('session_id', '==', sessionId),
      orderBy('created_at', 'asc')
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          session_id: data.session_id,
          sender: data.sender,
          message: data.message,
          attachment_product_id: data.attachment_product_id || null,
          is_read: data.is_read || false,
          created_at: data.created_at,
        } as ChatMessage;
      });
      
      setMessages(prev => {
        if (!isInitialLoad) {
          // Check if there are new messages from support to play sound
          const prevIds = new Set(prev.map(m => m.id));
          const newSupportMsgs = newMessages.filter(m => !prevIds.has(m.id) && m.sender === 'support');
          if (newSupportMsgs.length > 0) {
            playNotificationSound();
            if (document.hidden) startTabFlash();
          }
        }
        return newMessages;
      });
      isInitialLoad = false;
    });

    return () => unsubscribe();
  }, [sessionId]);

  // Mark support messages as read
  useEffect(() => {
    if (!open || !sessionId || messages.length === 0) return;
    
    const unreadSupportMessages = messages.filter(m => m.sender === 'support' && !m.is_read);
    
    if (unreadSupportMessages.length > 0) {
      unreadSupportMessages.forEach(msg => {
        updateDoc(doc(db, 'support_messages', msg.id), { is_read: true }).catch(console.error);
      });
    }
  }, [open, sessionId, messages]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Set offline on close
  useEffect(() => {
    if (!open && sessionId) {
      updateDoc(doc(db, 'support_sessions', sessionId), { is_online: false }).catch(console.error);
    }
  }, [open, sessionId]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;
    const msg = input.trim();
    setInput('');
    
    try {
      await addDoc(collection(db, 'support_messages'), {
        session_id: sessionId,
        sender: 'customer',
        message: msg,
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      // Update last_message_at
      await updateDoc(doc(db, 'support_sessions', sessionId), { 
        last_message_at: new Date().toISOString() 
      });

      // Send push notification to reseller if applicable
      if (resellerId) {
        fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: resellerId,
            title: `New message from ${userName || 'Customer'}`,
            body: msg,
            data: {
              type: 'chat',
              sessionId: sessionId
            }
          })
        }).catch(err => console.error("[FCM] Failed to send push notification:", err));
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      if (url) {
        const msgText = input.trim();
        await addDoc(collection(db, 'support_messages'), {
          session_id: sessionId,
          sender: 'customer',
          message: encodeImageAttachment(url, msgText),
          is_read: false,
          created_at: new Date().toISOString()
        });
        
        await updateDoc(doc(db, 'support_sessions', sessionId), { 
          last_message_at: new Date().toISOString() 
        });
        
        setInput('');
        toast.success("Image sent");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md h-[75vh] sm:h-[500px] bg-background rounded-t-2xl sm:rounded-2xl border border-border shadow-xl flex flex-col animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Headset className="h-5 w-5 text-primary-foreground" />
            <div>
              <h2 className="font-bold text-sm text-primary-foreground">Customer Support</h2>
              <p className="text-[10px] text-primary-foreground/70">We typically reply within minutes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors">
            <X className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Headset className="h-10 w-10 mx-auto mb-3 opacity-30" />
              Start a conversation with support
            </div>
          ) : (
            messages.map(m => {
              const { text: imgText, imageUrl } = parseImageAttachment(m.message);
              
              return (
                <div key={m.id} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.sender === 'customer'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}>
                    {imgText && <p className="leading-relaxed">{imgText}</p>}
                    {!imgText && !imageUrl && <p className="leading-relaxed">{m.message}</p>}
                    
                    {imageUrl && (
                      <img 
                        src={imageUrl} 
                        alt="attachment" 
                        className="w-full h-auto mt-2 rounded-lg object-contain border cursor-pointer"
                        onClick={() => window.open(imageUrl, "_blank")}
                      />
                    )}
                    <p className={`text-[9px] mt-1 ${m.sender === 'customer' ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
              title="Attach image"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={uploading ? "Uploading..." : "Type a message..."}
              className="flex-1 bg-transparent text-sm py-1.5 focus:outline-none placeholder:text-muted-foreground"
              disabled={uploading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() && !uploading}
              className="p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
