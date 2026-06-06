import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, ImagePlus, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getOrCreateResellerChatSession, useResellerChat } from '@/hooks/use-reseller-chat';
import { uploadChatImage, encodeImageAttachment, parseImageAttachment } from '@/lib/chat-image-upload';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface ResellerChatDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  resellerId: string;
  resellerName: string;
}

export default function ResellerChatDialog({ 
  open, 
  onClose, 
  customerId, 
  customerName, 
  resellerId, 
  resellerName 
}: ResellerChatDialogProps) {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, loading, sendMessage } = useResellerChat(sessionId);

  // Init session
  useEffect(() => {
    if (open && customerId && resellerId) {
      setInitializing(true);
      getOrCreateResellerChatSession(customerId, customerName, resellerId)
        .then(setSessionId)
        .catch(err => {
          console.error("Failed to init reseller chat session:", err);
          toast.error(t('common.errorOccurred'));
        })
        .finally(() => setInitializing(false));
    }
  }, [open, customerId, customerName, resellerId, t]);

  // Mark reseller messages as read
  useEffect(() => {
    if (!open || !sessionId || messages.length === 0) return;
    
    const unreadResellerMessages = messages.filter(m => m.sender === 'reseller' && !m.is_read);
    
    if (unreadResellerMessages.length > 0) {
      unreadResellerMessages.forEach(msg => {
        updateDoc(doc(db, 'reseller_customer_chat_messages', msg.id), { is_read: true }).catch(console.error);
      });
    }
  }, [open, sessionId, messages]);

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;
    const msg = input.trim();
    setInput('');
    
    try {
      await sendMessage(msg, 'customer');
      
      // Send push notification to reseller
      fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resellerId,
          title: `Message from ${customerName}`,
          body: msg,
          data: {
            type: 'chat',
            sessionId: sessionId
          }
        })
      }).catch(err => console.error("[FCM] Failed to send push notification:", err));
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(t('common.errorOccurred'));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error(t('common.selectImageFile'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('common.imageUnder5MB'));
      return;
    }

    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      if (url) {
        const msgText = input.trim();
        await sendMessage(encodeImageAttachment(url, msgText), 'customer');
        setInput('');
        toast.success(t('reseller.imageSent'));
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error(t('common.failedToUploadImage'));
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
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
            <div>
              <h2 className="font-bold text-sm text-primary-foreground">{resellerName}</h2>
              <p className="text-[10px] text-primary-foreground/70">{t('common.seller')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors">
            <X className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {initializing || loading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2 opacity-20" />
              <p className="text-xs">{t('common.loading')}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              {t('reseller.startChattingWithSeller')}
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
              disabled={uploading || initializing}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || initializing}
              className="p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
              title={t('reseller.attachImage')}
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={uploading ? t('common.uploading') : t('reseller.typeAMessage')}
              className="flex-1 bg-transparent text-sm py-1.5 focus:outline-none placeholder:text-muted-foreground"
              disabled={uploading || initializing}
            />
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !uploading) || initializing}
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
