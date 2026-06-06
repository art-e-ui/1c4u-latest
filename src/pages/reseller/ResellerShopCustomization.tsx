import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useReseller, type StoreTheme } from "@/lib/reseller-context-hooks";
import { toast } from "sonner";
import { compressImageToBase64 } from "@/lib/storage-utils";
import { getStorefrontUrl, resellerPath } from "@/lib/subdomain";
import { Save, Upload, Image, Palette, Store, ArrowLeft, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ResellerShopCustomization() {
  const { reseller, updateProfile } = useReseller();
  const { t } = useTranslation();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const THEMES: { id: StoreTheme; name: string; description: string; preview: string }[] = [
    {
      id: "minimal",
      name: t("reseller.minimalTheme"),
      description: t("reseller.minimalThemeDesc"),
      preview: "bg-background border-2 border-border",
    },
    {
      id: "bold",
      name: t("reseller.boldTheme"),
      description: t("reseller.boldThemeDesc"),
      preview: "bg-foreground border-2 border-foreground",
    },
    {
      id: "elegant",
      name: t("reseller.elegantTheme"),
      description: t("reseller.elegantThemeDesc"),
      preview: "bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/30",
    },
    {
      id: "vibrant",
      name: t("reseller.vibrantTheme"),
      description: t("reseller.vibrantThemeDesc"),
      preview: "bg-gradient-to-br from-primary to-secondary border-2 border-secondary",
    },
  ];

  const [shopName, setShopName] = useState(reseller?.shopName || "");
  const [logoPreview, setLogoPreview] = useState(reseller?.shopLogo || "");
  const [bannerPreview, setBannerPreview] = useState(reseller?.shopHeroBanner || "");
  const [selectedTheme, setSelectedTheme] = useState<StoreTheme>(reseller?.storeTheme || "minimal");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (reseller) {
      setShopName(reseller.shopName || "");
      setLogoPreview(reseller.shopLogo || "");
      setBannerPreview(reseller.shopHeroBanner || "");
      setSelectedTheme(reseller.storeTheme || "minimal");
    }
  }, [reseller]);

  if (!reseller) return null;

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("common.fileTooLarge"), { description: t("common.imageUnder2MB") });
      return;
    }
    const compressed = await compressImageToBase64(file);
    if (compressed) {
      setLogoPreview(compressed);
    } else {
      toast.error(t("common.error"), { description: t("common.failedToProcessImage") });
    }
  };

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("common.fileTooLarge"), { description: t("common.imageUnder5MB") });
      return;
    }
    const compressed = await compressImageToBase64(file);
    if (compressed) {
      setBannerPreview(compressed);
    } else {
      toast.error(t("common.error"), { description: t("common.failedToProcessImage") });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        shopName,
        shopLogo: logoPreview,
        shopHeroBanner: bannerPreview,
        storeTheme: selectedTheme,
      });
      toast.success(t("reseller.shopUpdated"), { description: t("reseller.shopUpdatedDesc") });
    } catch (e) {
      console.error("Shop customization save error:", e);
      toast.error(t("reseller.saveFailed"), { description: t("reseller.saveFailedDesc") });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 py-5 space-y-6 max-w-lg mx-auto pb-24">
      {/* Back link */}
      <Link to={resellerPath("/reseller/profile")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t("reseller.backToProfile")}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("reseller.decorateYourStore")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("reseller.decorateYourStoreDesc")}</p>
        </div>
        <a
          href={getStorefrontUrl(reseller.shopSlug)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-secondary bg-secondary/5 px-4 py-2 text-xs font-medium text-secondary hover:bg-secondary/10 transition-colors"
        >
          <Store className="h-3.5 w-3.5" /> {t("reseller.viewStore")}
        </a>
      </div>

      {/* Shop Name */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("reseller.shopName")}</h2>
        </div>
        <input
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={t("reseller.shopNamePlaceholder")}
        />
      </section>

      {/* Logo Upload */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("reseller.shopLogo")}</h2>
        </div>
        <div
          onClick={() => logoInputRef.current?.click()}
          className="relative flex items-center justify-center w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
        >
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">{t("common.upload")}</span>
            </div>
          )}
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
        <p className="text-[11px] text-muted-foreground">{t("reseller.shopLogoDesc")}</p>
      </section>

      {/* Hero Banner Upload */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("reseller.heroBanner")}</h2>
        </div>
        <div
          onClick={() => bannerInputRef.current?.click()}
          className="relative flex items-center justify-center w-full aspect-[21/9] rounded-2xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
        >
          {bannerPreview ? (
            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">{t("common.upload")} {t("reseller.heroBanner")}</span>
            </div>
          )}
        </div>
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />
        <p className="text-[11px] text-muted-foreground">{t("reseller.heroBannerDesc")}</p>
      </section>

      {/* Theme Picker */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t("reseller.storeTheme")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id)}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                selectedTheme === theme.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {selectedTheme === theme.id && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              <div className={`w-full h-12 rounded-lg mb-2 ${theme.preview}`} />
              <p className="text-sm font-medium text-card-foreground">{theme.name}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{theme.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Save className="h-4 w-4" /> {isSaving ? `${t("common.saving")}...` : t("common.saveChanges")}
      </button>
    </div>
  );
}
