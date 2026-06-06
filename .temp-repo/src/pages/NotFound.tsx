import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-xl mt-4 text-muted-foreground font-medium">{t("common.pageNotFound")}</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {t("common.pageNotFoundDesc")}
      </p>
      <Link to="/" className="mt-8 px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-opacity">
        {t("common.goBackHome")}
      </Link>
    </div>
  );
}
