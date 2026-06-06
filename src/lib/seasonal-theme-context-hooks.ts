import { createContext, useContext } from "react";

export interface SeasonalDecorations {
  elements?: string[];
  snowfall?: boolean;
  topBanner?: string;
  colors?: { accent?: string; secondary?: string };
}

export interface SeasonalThemeContextType {
  slug: string;
  name: string;
  decorations: SeasonalDecorations;
  isActive: boolean; // true if a non-"none" theme is active
}

export const SeasonalThemeContext = createContext<SeasonalThemeContextType>({
  slug: "none",
  name: "None",
  decorations: {},
  isActive: false,
});

export function useSeasonalTheme() {
  return useContext(SeasonalThemeContext);
}
