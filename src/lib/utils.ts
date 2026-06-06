import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const strUrl = String(url);
  if (strUrl.startsWith('["') && strUrl.endsWith('"]')) {
    try {
      const parsed = JSON.parse(strUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstUrl = String(parsed[0]);
        // Handle double-encoded JSON if it exists
        if (firstUrl.startsWith('["') && firstUrl.endsWith('"]')) {
          try {
            const doubleParsed = JSON.parse(firstUrl);
            if (Array.isArray(doubleParsed) && doubleParsed.length > 0) {
              return String(doubleParsed[0]);
            }
          } catch { /* ignore */ }
        }
        return firstUrl;
      }
    } catch {
      return strUrl.replace(/^\["/, '').replace(/"\]$/, '').replace(/","/g, ',');
    }
  }
  return strUrl;
}
