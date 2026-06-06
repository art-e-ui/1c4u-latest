import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { SeasonalThemeContext, type SeasonalDecorations } from "./seasonal-theme-context-hooks";


interface SeasonalTheme {
  id: string;
  slug: string;
  name: string;
  decorations: SeasonalDecorations;
  is_active: boolean;
}

export function SeasonalThemeProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery<SeasonalTheme | null>({
    queryKey: ["active-seasonal-theme"],
    queryFn: async () => {
      const q = query(
        collection(db, "seasonal_themes"),
        where("is_active", "==", true),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SeasonalTheme;
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // refresh every 5 minutes
  });

  const slug = data?.slug ?? "none";
  const decorations = (data?.decorations as SeasonalDecorations) ?? {};

  return (
    <SeasonalThemeContext.Provider
      value={{
        slug,
        name: data?.name ?? "None",
        decorations,
        isActive: slug !== "none",
      }}
    >
      {children}
    </SeasonalThemeContext.Provider>
  );
}

