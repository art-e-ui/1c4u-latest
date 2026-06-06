import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Languages, ChevronRight, AlertTriangle } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

export default function LanguageSettingsSheet() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Use i18n.language as source of truth for current language
  const currentLang = i18n.language || localStorage.getItem("reseller_language") || "en";
  const [selectedLang, setSelectedLang] = useState(currentLang);

  // Sync selectedLang when sheet opens or i18n.language changes
  useEffect(() => {
    if (open) {
      setSelectedLang(i18n.language);
    }
  }, [open, i18n.language]);

  const handleUpdate = () => {
    if (selectedLang === i18n.language) {
      setOpen(false);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    localStorage.setItem("reseller_language", selectedLang);
    i18n.changeLanguage(selectedLang);
    setShowConfirm(false);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.value === selectedLang);
    const langLabel = langObj ? `${langObj.flag} ${langObj.label}` : selectedLang;
    
    toast({
      title: t("reseller.languageUpdated"),
      description: t("reseller.languageChangedTo", { language: langLabel }),
    });
    setOpen(false);
  };

  // Group languages by region
  const regions = Array.from(new Set(SUPPORTED_LANGUAGES.map((l) => l.region)));

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.value === i18n.language) || SUPPORTED_LANGUAGES[0];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="flex items-center justify-between w-full rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Languages className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">{t("reseller.languageSetting")}</p>
                <p className="text-xs text-muted-foreground">
                  {currentLangObj.flag} {currentLangObj.label}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-4 max-w-lg mx-auto max-h-[80vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-base font-semibold text-foreground">{t("reseller.languageSetting")}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t("reseller.selectLanguage")}</label>
              <Select value={selectedLang} onValueChange={setSelectedLang}>
                <SelectTrigger className="w-full rounded-xl border-border bg-background h-12">
                  <SelectValue placeholder="Choose a language" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {regions.map((region) => (
                    <SelectGroup key={region}>
                      <SelectLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">{region}</SelectLabel>
                      {SUPPORTED_LANGUAGES.filter((l) => l.region === region).map((lang) => (
                        <SelectItem key={lang.value} value={lang.value} className="py-3">
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.label}</span>
                            {lang.value === "en" && (
                              <span className="ml-1 text-[10px] text-muted-foreground opacity-70">(Default)</span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full rounded-xl h-12 text-base font-semibold" onClick={handleUpdate}>
              {t("common.update")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              {t("reseller.confirmLanguageChange")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 mt-2">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">
                  {t("reseller.languageChangeWarning")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 mt-4">
            <AlertDialogCancel className="rounded-xl flex-1">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl flex-1" onClick={handleConfirm}>
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
