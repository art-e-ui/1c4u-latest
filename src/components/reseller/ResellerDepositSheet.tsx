import { useState, useRef, useEffect } from "react";
import { Copy, Wallet, CreditCard, Headphones, AlertTriangle, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { db, auth, storage, handleFirestoreError, OperationType } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { useReseller } from "@/lib/reseller-context-hooks";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const cryptoIcons = [
  { name: "BNB", icon: "/crypto/bnb.svg" },
  { name: "BTC", icon: "/crypto/btc.svg" },
  { name: "USDT", icon: "/crypto/usdt.svg" },
  { name: "ETH", icon: "/crypto/eth.svg" },
  { name: "XRP", icon: "/crypto/xrp.svg" },
  { name: "SOL", icon: "/crypto/sol.svg" },
  { name: "ADA", icon: "/crypto/ada.svg" },
  { name: "DOT", icon: "/crypto/dot.svg" },
];

const DEFAULT_DEPOSIT_ADDRESS = "TXrk2qEkPFwSzGYvRmpCkyFbPFCSFdBu8K";

interface ResellerDepositSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResellerDepositSheet({ open, onOpenChange }: ResellerDepositSheetProps) {
  const { reseller } = useReseller();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [depositAddress, setDepositAddress] = useState(DEFAULT_DEPOSIT_ADDRESS);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Deposit Config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        let configData = null;

        // 1. Try to get the admin-specific config if the reseller belongs to an admin
        if (reseller?.memberOfAdminId) {
          const adminDocRef = doc(db, "system_settings", `deposit_config_${reseller.memberOfAdminId}`);
          const adminDocSnap = await getDoc(adminDocRef);
          if (adminDocSnap.exists()) {
            configData = adminDocSnap.data();
          }
        }

        // 2. Fallback to the global default setting if admin-specific was not found
        if (!configData) {
          const globalDocRef = doc(db, "system_settings", "deposit_config");
          const globalDocSnap = await getDoc(globalDocRef);
          if (globalDocSnap.exists()) {
            configData = globalDocSnap.data();
          }
        }

        // Apply whatever valid config we have
        if (configData) {
          if (configData.usdtAddress) setDepositAddress(configData.usdtAddress);
          if (configData.qrCodeUrl) setQrCodeUrl(configData.qrCodeUrl);
        }
      } catch (error) {
        console.error("Error fetching deposit config:", error);
      }
    };
    if (open) {
      fetchConfig();
    }
  }, [open, reseller?.memberOfAdminId]);

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(depositAddress);
    setWalletCopied(true);
    toast({ title: t("common.copied"), description: t("common.walletCopiedDesc") });
    setTimeout(() => setWalletCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 0.5 * 1024 * 1024) {
      toast({ title: t("common.fileTooLarge"), description: t("common.imageUnder5MB"), variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result as string);
      setScreenshotName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDeposit = async () => {
    if (!reseller) return;
    setSubmitting(true);
    console.log("Starting deposit submission...");
    
    try {
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({ title: t("common.invalidAmount"), description: t("common.enterValidAmount"), variant: "destructive" });
        setSubmitting(false);
        return;
      }

      console.log("Deposit details:", {
        resellerId: `GRS${reseller.resellerId}`,
        amount,
        hasScreenshot: !!screenshot
      });

      let proofImageUrl = "";
      if (screenshot) {
        console.log("Uploading proof image to Storage...");
        try {
          // Add a timeout to the upload
          const uploadPromise = (async () => {
            const storageRef = ref(storage, `deposit_proofs/${reseller.id}_${Date.now()}`);
            await uploadString(storageRef, screenshot, 'data_url');
            return await getDownloadURL(storageRef);
          })();

          const timeoutPromise = new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error("Upload timed out after 30 seconds")), 30000)
          );

          proofImageUrl = await Promise.race([uploadPromise, timeoutPromise]);
          console.log("Proof image uploaded successfully:", proofImageUrl);
        } catch (uploadError) {
          const errorDetails = uploadError instanceof Error ? uploadError.message : JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError));
          console.error("Error uploading proof image:", errorDetails);
          toast({ 
            title: t("common.uploadError"), 
            description: t("common.failedToUploadProof"), 
            variant: "destructive" 
          });
          // We continue anyway, it will try to save the base64 to firestore if it's small enough
        }
      }

      console.log("Adding document to deposit_requests collection...");
      try {
        const docData = {
          resellerId: `1CR${reseller.resellerId}`,
          resellerDocId: reseller.id,
          resellerName: `${reseller.firstName} ${reseller.lastName}`,
          amount: amount,
          status: "Pending",
          method: "USDT (TRC20)",
          proofImage: proofImageUrl || screenshot,
          createdAt: new Date().toISOString(),
          usdtAddress: depositAddress,
          referralId: reseller.referralCode || null,
          memberOfAdminId: reseller.memberOfAdminId || null,
        };
        
        // Add a timeout to the Firestore write
        const writePromise = addDoc(collection(db, "deposit_requests"), docData);
        const writeTimeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Firestore write timed out after 20 seconds")), 20000)
        );

        const docRef = await Promise.race([writePromise, writeTimeoutPromise]);
        console.log("Deposit request document created with ID:", docRef.id);

        // Send Telegram Notification
        try {
          const telegramMessage = `<b>New Deposit Request</b>\n\n` +
            `👤 Reseller: ${reseller.firstName} ${reseller.lastName}\n` +
            `🆔 Reseller ID: 1CR${reseller.resellerId}\n` +
            `💰 Amount: $${amount}\n` +
            `💸 Method: USDT (TRC20)\n` +
            `📅 Date: ${new Date().toLocaleString()}`;
          
          await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: telegramMessage, threadId: 1 }),
          }).catch(err => console.error("Telegram notification failed:", err));
        } catch (e) {
          console.error("Error triggering telegram notification:", e);
        }
      } catch (error) {
        console.error("Firestore addDoc error:", error);
        if (error instanceof Error && error.message.includes("timed out")) {
          toast({ 
            title: t("common.connectionTimeout"), 
            description: t("common.requestTakingTooLong"),
            variant: "destructive"
          });
        } else {
          handleFirestoreError(error, OperationType.CREATE, "deposit_requests");
        }
        // We throw here to stop the success toast from showing if it really failed
        throw error;
      }

      toast({ title: t("reseller.depositSubmitted"), description: `$${depositAmount} ${t("reseller.depositRequestSent")}` });
      setDepositAmount("");
      setScreenshot(null);
      setScreenshotName("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error in handleSubmitDeposit:", error);
      let errorMessage = t("reseller.failedToSubmitDeposit");
      if (error instanceof Error) {
        try {
          const errInfo = JSON.parse(error.message);
          errorMessage = errInfo.error || error.message;
        } catch (e) {
          errorMessage = error.message;
        }
      }
      toast({ title: t("common.error"), description: errorMessage, variant: "destructive" });
    } finally {
      console.log("Deposit submission process finished.");
      setSubmitting(false);
    }
  };

  const canSubmit = screenshot !== null && depositAmount.trim() !== "";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 pb-8">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base font-bold text-foreground">{t("reseller.depositFunds")}</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {t("reseller.submitDepositRequest")}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {/* Global Payment */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{t("reseller.globalPayment")}</h3>
                  <p className="text-xs text-muted-foreground">{t("reseller.paySecurelyWithCrypto")}</p>
                </div>
              </div>
              <Separator className="mb-4" />

              <div className="space-y-3">
                {/* Deposit Amount */}
                <div>
                  <Label htmlFor="deposit-amount" className="text-xs text-muted-foreground">{t("reseller.depositAmount")}</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    placeholder={t("reseller.enterAmountInUsd")}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="mt-1 rounded-xl"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2 justify-center border-primary/30 text-primary hover:bg-primary/5"
                  onClick={() => setShowWalletModal(true)}
                >
                  <Wallet className="h-4 w-4" />
                  {t("reseller.getWalletAddress")}
                </Button>

                {/* Transaction Screenshot */}
                <div>
                  <Label className="text-xs text-muted-foreground">{t("reseller.transactionProof")}</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 flex items-center gap-3 rounded-xl border border-dashed border-input bg-background px-4 py-3 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    {screenshot ? (
                      <>
                        <img src={screenshot} alt="Screenshot" className="h-10 w-10 rounded-lg object-cover border border-border" />
                        <span className="text-sm text-foreground truncate flex-1">{screenshotName}</span>
                      </>
                    ) : (
                      <>
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-muted-foreground">{t("reseller.attachTransactionScreenshot")}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <Button
                  className="w-full rounded-xl gap-2"
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmitDeposit}
                >
                  <Upload className="h-4 w-4" />
                  {submitting ? t("common.submitting") : t("reseller.submitDeposit")}
                </Button>

                <Button variant="outline" className="w-full gap-2 justify-center" asChild>
                  <a href="mailto:support@example.com">
                    <Headphones className="h-4 w-4" />
                    {t("reseller.getSupport247")}
                  </a>
                </Button>

                <div className="rounded-lg bg-muted/50 border border-border p-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-3">
                    {t("reseller.empoweredByBlockchain")}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {cryptoIcons.map((crypto) => (
                      <div
                        key={crypto.name}
                        className="flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5"
                      >
                        <img src={crypto.icon} alt={crypto.name} className="h-4 w-4" />
                        <span className="text-[10px] font-bold text-muted-foreground">{crypto.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Pay in Local */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <CreditCard className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{t("reseller.payInLocal")}</h3>
                  <p className="text-xs text-muted-foreground">{t("reseller.payInLocalDesc")}</p>
                </div>
              </div>
              <Separator className="mb-4" />
              <div className="rounded-lg bg-muted/50 border border-border p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("reseller.payInLocalAdvised")}
                </p>
                <Button variant="outline" className="mt-3 gap-2" asChild>
                  <a href="mailto:support@example.com">
                    <Headphones className="h-4 w-4" /> {t("reseller.contactFinancialExpert")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* USDT Wallet Modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center justify-center gap-2 text-base">
            <img src="/crypto/usdt.svg" alt="USDT" className="h-6 w-6" />
            {t("reseller.usdtTrc20")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("reseller.usdtTrc20Reminder")}
          </DialogDescription>
          <DialogHeader className="text-center">
            <DialogDescription className="text-xs text-muted-foreground">
              {t("reseller.scanQrOrCopyAddress")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-3">
            <div className="rounded-xl border-2 border-border bg-background p-3">
              <img
                src={qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${depositAddress}`}
                alt="USDT TRC20 QR Code"
                className="h-44 w-44"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{t("reseller.depositAddress")}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-foreground break-all leading-relaxed">
                {depositAddress}
              </code>
              <Button variant="ghost" size="sm" className="shrink-0 h-8 w-8 p-0" onClick={handleCopyWallet}>
                <Copy className={`h-4 w-4 ${walletCopied ? "text-green-500" : "text-muted-foreground"}`} />
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs text-destructive leading-relaxed" dangerouslySetInnerHTML={{ __html: t("reseller.makeSureSendOnlyUsdt") }} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
