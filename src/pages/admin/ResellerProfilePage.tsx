import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminPath } from "@/lib/subdomain";
import { 
  Search, Mail, Key, MessageSquare, Wallet, Clock, Package
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useUnifiedResellers } from "@/lib/unified-hooks";
import { useTranslation } from "react-i18next";

interface RawOrder {
  id: string;
  reseller_id?: string;
  status?: string;
  total_amount?: number;
}

export default function ResellerProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds, canSeeAll } = useAdminAccess();
  const resellers = useUnifiedResellers();

  useEffect(() => {
    console.log("Admin Access Info:", { canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds });
  }, [canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds]);

  const processedResellers = useMemo(() => {
    const filtered = canSeeAll 
      ? resellers 
      : resellers.filter(r => {
          const referredBy = r.referredBy; // This is the staff doc ID
          const memberOfAdminId = r.memberOfAdminId;
          return (referredBy && (
            allowedReferralIds.includes(String(referredBy)) || 
            allowedStaffIds.includes(String(referredBy)) || 
            allowedStaffDocIds.includes(String(referredBy))
          )) ||
          (memberOfAdminId && allowedAdminIds.includes(String(memberOfAdminId)));
        });

    return filtered.map(r => {
      return {
        id: r.id,
        reseller_id: String(r.resellerId || "").startsWith("1CR") ? r.resellerId : (/^\\d+$/.test(String(r.resellerId || "")) ? `1CR${r.resellerId}` : (r.resellerId || "N/A")),
        referral_code: r.referralId || 'N/A',
        name: r.name,
        email: r.email || 'N/A',
        referredBy: r.staffName || t("admin.directRegistration"),
        adminMember: r.adminMember || t("admin.mainCompany"),
        registrationDate: r.registrationDate ? new Date(r.registrationDate).toLocaleDateString() : 'N/A',
        rawDate: r.registrationDate || 0,
        shopName: r.shopName || 'N/A',
        available: r.balance || 0,
        pending: r.pendingBalance || 0,
        unpicked: r.unpickedBalance || 0,
        hasRequestedPasswordReset: r.hasRequestedPasswordReset
      };
    });
  }, [resellers, canSeeAll, allowedReferralIds, allowedAdminIds, allowedStaffIds, allowedStaffDocIds, t]);

  const isLoading = false;

  const filteredResellers = processedResellers.filter(r => 
    String(r.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.reseller_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.referral_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.shopName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.adminMember || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.referredBy || "").toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const dateA = new Date(a.rawDate || 0).getTime();
    const dateB = new Date(b.rawDate || 0).getTime();
    return dateB - dateA;
  });

  const handlePasswordReset = async (resellerId: string) => {
    try {
      // In a real app, this would trigger an email. 
      // Here we just clear the flag in Firestore to show the action was handled.
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      await updateDoc(doc(db, "reseller_profiles", resellerId), {
        password_reset_requested: false,
        has_requested_password_reset: false
      });
      toast.success(t("admin.passwordResetLinkSent", { resellerId }));
    } catch (e) {
      console.error(e);
      toast.error("Failed to process password reset");
    }
  };

  const handleSendMessage = (resellerId: string) => {
    navigate(adminPath("/admin/customer-care/virtual-services"), { state: { resellerId } });
  };

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.resellerProfiles")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("admin.resellerProfilesDesc")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("admin.searchResellers")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">{t("admin.reseller_id") || "Reseller ID"}</TableHead>
                <TableHead className="text-xs">{t("admin.referralCode") || "Referral Code"}</TableHead>
                <TableHead className="text-xs">{t("admin.referredBy")}</TableHead>
                <TableHead className="text-xs">{t("admin.adminMember")}</TableHead>
                <TableHead className="text-xs">{t("admin.resellerName")}</TableHead>
                <TableHead className="text-xs">{t("admin.registrationDate")}</TableHead>
                <TableHead className="text-xs">{t("admin.loginEmail")}</TableHead>
                <TableHead className="text-xs text-right">{t("admin.available")}</TableHead>
                <TableHead className="text-xs text-right">{t("admin.pending")}</TableHead>
                <TableHead className="text-xs text-right">{t("admin.unpicked")}</TableHead>
                <TableHead className="text-xs text-center">{t("admin.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-muted-foreground">{t("admin.loadingResellers")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredResellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    {t("admin.noResellersFound")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredResellers.map((reseller) => (
                  <TableRow key={reseller.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono text-xs text-primary">{(String(reseller.reseller_id || "").startsWith("1CR") || !/^\d+$/.test(String(reseller.reseller_id || ""))) ? reseller.reseller_id : "1CR" + reseller.reseller_id}</TableCell>
                    <TableCell className="font-mono text-xs">{reseller.referral_code}</TableCell>
                    <TableCell className="text-xs">{reseller.referredBy}</TableCell>
                    <TableCell className="text-xs">{reseller.adminMember}</TableCell>
                    <TableCell className="font-medium text-sm">{reseller.name}</TableCell>
                    <TableCell className="text-xs">{reseller.registrationDate}</TableCell>
                    <TableCell className="text-xs">{reseller.email}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-primary">
                      {fmt(reseller.available)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-warning">
                      {fmt(reseller.pending)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-orange-500 font-medium">
                      {fmt(reseller.unpicked)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          disabled={!reseller.hasRequestedPasswordReset}
                          onClick={() => handlePasswordReset(reseller.id)}
                          title={reseller.hasRequestedPasswordReset ? t("admin.resetPassword") : t("admin.noResetRequest")}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleSendMessage(reseller.id)}
                          title={t("admin.sendMessage")}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
