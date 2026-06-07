import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Headset, Users, Send, ImagePlus, ShoppingBag } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, getDocs, addDoc, updateDoc, doc, limit, increment } from "firebase/firestore";
import { useReseller } from "@/lib/reseller-context-hooks";
import { cn } from "@/lib/utils";
import { uploadChatImage, encodeImageAttachment, parseImageAttachment } from "@/lib/chat-image-upload";
import { toast } from "sonner";
import { playNotificationSound, startTabFlash } from "@/hooks/use-notifications";
import { useTranslation } from "react-i18next";

interface ChatMessage {
  id: string;
  session_id: string;
  sender: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function ProductAttachmentCard({ product }: { product: { id: string; name: string; price: number; image: string } }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2 mt-1 max-w-[260px]">
      <img
        src={product.image || "/placeholder.svg"}
        alt={product.name}
        className="w-12 h-12 rounded-md object-cover flex-shrink-0 bg-muted"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
        <p className="text-[10px] text-muted-foreground">ID: {product.id.slice(0, 8)}</p>
        <p className="text-xs font-bold text-primary">${product.price.toFixed(2)}</p>
      </div>
    </div>
  );
}

function parseAttachment(message: string): { text: string; product: { id: string; name: string; price: number; image: string } | null } {
  const tag = "[PRODUCT_ATTACH:";
  const idx = message.indexOf(tag);
  if (idx === -1) return { text: message, product: null };
  try {
    const jsonStart = idx + tag.length;
    const jsonEnd = message.indexOf("]", jsonStart);
    const json = message.substring(jsonStart, jsonEnd);
    const product = JSON.parse(json);
    const text = message.substring(0, idx).trim();
    return { text, product };
  } catch {
    return { text: message, product: null };
  }
}

function SupportChatPanel() {
  const { reseller } = useReseller();
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initSession = useCallback(async () => {
    if (!reseller?.id) return;
    const resellerId = reseller.id;
    const resellerName = reseller.shopName || `${reseller.firstName} ${reseller.lastName}`;

    console.log("Initializing support session for reseller:", resellerId);
    try {
      const q = query(
        collection(db, "reseller_chat_sessions"),
        where("reseller_id", "==", resellerId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);

      let sid: string;
      if (!snapshot.empty) {
        sid = snapshot.docs[0].id;
        console.log("Found existing support session:", sid);
      } else {
        console.log("Creating new support session...");
        const docRef = await addDoc(collection(db, "reseller_chat_sessions"), {
          reseller_id: resellerId,
          reseller_name: resellerName,
          is_online: true,
          is_pinned: false,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
        sid = docRef.id;
        console.log("Created new support session with ID:", sid);
      }
      setSessionId(sid);
    } catch (error) {
      console.error("Error in support initSession:", error);
      handleFirestoreError(error, OperationType.GET, "reseller_chat_sessions");
      toast.error(t("reseller.failedToInitializeSupportChat"));
    }
  }, [reseller, t]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (!sessionId) return;
    
    const q = query(
      collection(db, "reseller_chat_messages"),
      where("session_id", "==", sessionId)
    );

    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatMessage));
      
      // Sort in memory to avoid composite index
      const newMessages = [...allMessages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      setMessages(prev => {
        if (!isInitialLoad) {
          const prevIds = new Set(prev.map(m => m.id));
          const newAdminMsgs = newMessages.filter(m => !prevIds.has(m.id) && (m.sender || m.sender_role) === "admin");
          
          if (newAdminMsgs.length > 0) {
            playNotificationSound();
            if (document.hidden) startTabFlash();
          }
        }
        
        return newMessages;
      });
      isInitialLoad = false;
    }, (error) => {
      console.error("Error in support messages onSnapshot:", error);
      toast.error(t("reseller.failedToLoadSupportMessages"));
    });

    return () => unsubscribe();
  }, [sessionId, t]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || !sessionId) return;
    if (!text) setInput("");
    
    try {
      await addDoc(collection(db, "reseller_chat_messages"), {
        session_id: sessionId,
        sender: "reseller",
        message: msg,
        is_read: false,
        created_at: new Date().toISOString()
      });
      
      await updateDoc(doc(db, "reseller_chat_sessions", sessionId), {
        last_message_at: new Date().toISOString(),
        last_message: msg,
        unread_count: increment(1)
      });

      // Sync to Telegram
      if (reseller?.id) {
        fetch("/api/chat/sync-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resellerId: reseller.id, message: msg, sender: 'reseller' })
        }).catch(err => console.error("Telegram sync failed:", err));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, "reseller_chat_messages");
      } catch (e) {
        let errorMessage = t("common.errorOccurred");
        if (e instanceof Error) {
          try {
            const errInfo = JSON.parse(e.message);
            errorMessage = errInfo.error || e.message;
          } catch (parseError) {
            errorMessage = e.message;
          }
        }
        toast.error(errorMessage);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("common.selectImageFile"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("common.imageUnder5MB"));
      return;
    }
    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      if (url) {
        const msgText = input.trim();
        await handleSend(encodeImageAttachment(url, msgText));
        setInput("");
      } else {
        toast.error(t("common.failedToUploadImage"));
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error(t("common.errorOccurred"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            {t("reseller.chatWithAdminSupport")}
          </p>
        )}
        {messages.map((m) => {
          const { text: productText, product } = parseAttachment(m.message);
          const { text, imageUrl } = parseImageAttachment(product ? productText : m.message);
          const displayText = product ? productText : text;

          return (
            <div key={m.id} className={`flex ${(m.sender || m.sender_role) === "reseller" ? "justify-end" : "justify-start"}`}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                (m.sender || m.sender_role) === "reseller"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              )}>
                {(m.sender || m.sender_role) !== "reseller" && (
                  <p className="text-[10px] font-semibold mb-0.5 opacity-70">{t("reseller.support")}</p>
                )}
                {displayText && <p>{displayText}</p>}
                {product && <ProductAttachmentCard product={product} />}
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt="attachment"
                    className="mt-1 rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                    onClick={() => window.open(imageUrl, "_blank")}
                  />
                )}
                <p className={cn(
                  "text-[10px] mt-1 text-right",
                  (m.sender || m.sender_role) === "reseller" ? "text-primary-foreground/60" : "text-muted-foreground/60"
                )}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-3 flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !sessionId}
          className="rounded-full p-2 hover:bg-accent transition-colors disabled:opacity-40"
          title={t("reseller.attachImage")}
        >
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={uploading ? t("reseller.uploadingImage") : t("reseller.typeAMessage")}
          disabled={uploading}
          className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || uploading}
          className="rounded-full bg-primary text-primary-foreground p-2.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ChatSession {
  id: string;
  reseller_id: string;
  customer_id: string;
  customer_name: string;
  last_message_at: string;
}

interface CustomerChatMessage {
  id: string;
  session_id: string;
  sender: "reseller" | "customer";
  message: string;
  is_read: boolean;
  created_at: string;
}

function CustomerChatPanel() {
  const { reseller } = useReseller();
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CustomerChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for sessions
  useEffect(() => {
    if (!reseller?.id) return;
    const q = query(
      collection(db, "reseller_customer_chat_sessions"),
      where("reseller_id", "==", reseller.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatSession));
      // Sort in memory to avoid composite index requirement
      const sortedData = [...data].sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
      setSessions(sortedData);
      setActiveSessionId(prev => {
        if (!prev && sortedData.length > 0) return sortedData[0].id;
        return prev;
      });
    }, (error) => {
      console.error("Error in customer sessions onSnapshot:", error);
      handleFirestoreError(error, OperationType.GET, "reseller_customer_chat_sessions");
      toast.error(t("reseller.failedToLoadCustomerChatSessions"));
    });
    return () => unsubscribe();
  }, [reseller, t]);

  // Listen for messages
  useEffect(() => {
    if (!activeSessionId) return;
    const q = query(
      collection(db, "reseller_customer_chat_messages"),
      where("session_id", "==", activeSessionId)
    );

    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CustomerChatMessage));
      
      // Sort in memory to avoid composite index
      const newMessages = [...allMessages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(prev => {
        if (!isInitialLoad) {
          const prevIds = new Set(prev.map(m => m.id));
          const newCustomerMsgs = newMessages.filter(m => !prevIds.has(m.id) && (m.sender || m.sender_role) === "customer");
          if (newCustomerMsgs.length > 0) {
            playNotificationSound();
            if (document.hidden) startTabFlash();
          }
        }
        return newMessages;
      });
      isInitialLoad = false;
    }, (error) => {
      console.error("Error in customer messages onSnapshot:", error);
      toast.error(t("reseller.failedToLoadCustomerMessages"));
    });
    return () => unsubscribe();
  }, [activeSessionId, t]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || !activeSessionId) return;
    if (!text) setInput("");

    try {
      await addDoc(collection(db, "reseller_customer_chat_messages"), {
        session_id: activeSessionId,
        sender: "reseller",
        message: msg,
        is_read: false,
        created_at: new Date().toISOString()
      });

      await updateDoc(doc(db, "reseller_customer_chat_sessions", activeSessionId), {
        last_message_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending customer message:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, "reseller_customer_chat_messages");
      } catch (e) {
        let errorMessage = t("common.errorOccurred");
        if (e instanceof Error) {
          try {
            const errInfo = JSON.parse(e.message);
            errorMessage = errInfo.error || e.message;
          } catch (parseError) {
            errorMessage = e.message;
          }
        }
        toast.error(errorMessage);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSessionId) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error(t("common.selectImageFile"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("common.imageUnder5MB"));
      return;
    }

    setUploading(true);
    try {
      const url = await uploadChatImage(file);
      if (url) {
        await handleSend(encodeImageAttachment(url, input.trim()));
        setInput("");
        toast.success(t("reseller.imageSent"));
      } else {
        toast.error(t("common.failedToUploadImage"));
      }
    } catch (error) {
      console.error("Image upload error:", error);
      toast.error(t("common.errorOccurred"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Session List (Small sidebar) */}
        <div className="w-20 md:w-48 border-r border-border overflow-y-auto bg-muted/20">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={cn(
                "w-full text-left p-3 border-b border-border transition-colors hover:bg-accent",
                activeSessionId === s.id && "bg-accent"
              )}
            >
              <p className="text-xs font-bold truncate">{s.customer_name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {new Date(s.last_message_at).toLocaleDateString()}
              </p>
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-[10px] text-center text-muted-foreground p-4">{t("reseller.noCustomersYet")}</p>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                {activeSessionId ? t("reseller.startChattingWithCustomer") : t("reseller.selectCustomerToStartChatting")}
              </p>
            )}
            {messages.map((m) => {
              const { text: productText, product } = parseAttachment(m.message);
              const { text, imageUrl } = parseImageAttachment(product ? productText : m.message);
              const displayText = product ? productText : text;

              return (
                <div key={m.id} className={`flex ${(m.sender || m.sender_role) === "reseller" ? "justify-end" : "justify-start"}`}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    (m.sender || m.sender_role) === "reseller"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                    {(m.sender || m.sender_role) !== "reseller" && (
                      <p className="text-[10px] font-semibold mb-0.5 opacity-70">{activeSession?.customer_name || t("reseller.customers")}</p>
                    )}
                    {displayText && <p>{displayText}</p>}
                    {product && <ProductAttachmentCard product={product} />}
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt="attachment"
                        className="mt-1 rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                        onClick={() => window.open(imageUrl, "_blank")}
                      />
                    )}
                    <p className={cn(
                      "text-[10px] mt-1 text-right",
                      (m.sender || m.sender_role) === "reseller" ? "text-primary-foreground/60" : "text-muted-foreground/60"
                    )}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {activeSessionId && (
            <div className="border-t border-border p-3 flex gap-2 items-center bg-card">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-full p-2 hover:bg-accent transition-colors disabled:opacity-40"
                title={t("reseller.attachImage")}
              >
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={uploading ? t("reseller.uploadingImage") : t("reseller.typeAMessage")}
                disabled={uploading}
                className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || uploading}
                className="rounded-full bg-primary text-primary-foreground p-2.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResellerMessages() {
  const { reseller } = useReseller();
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || "support");

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-2rem)]">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-lg font-bold text-foreground">{t("reseller.messages")}</h1>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-4 mb-2 grid grid-cols-2">
          <TabsTrigger value="support" className="gap-1.5 text-xs">
            <Headset className="h-3.5 w-3.5" /> {t("reseller.support")}
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> {t("reseller.customers")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="support" className="flex-1 min-h-0 mt-0">
          <SupportChatPanel />
        </TabsContent>
        <TabsContent value="customers" className="flex-1 min-h-0 mt-0">
          <CustomerChatPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
