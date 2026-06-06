/**
 * Portal detection utilities for multi-portal routing.
 *
 * Supports two detection methods:
 * 1. Environment variable: VITE_PORTAL (for separate Netlify deployments)
 *    - "customer"  → customer portal (myshop.com)
 *    - "reseller"  → reseller portal (reseller.myshop.com)
 *    - "admin"     → admin portal (admin.myshop.com)
 *
 * 2. Subdomain detection (unified deployment / dev):
 *    - myshop.com              → customer
 *    - reseller.myshop.com     → reseller
 *    - admin.myshop.com        → admin
 */

export type PortalType = "customer" | "reseller" | "admin";

/**
 * Returns true when portal identity is determined by VITE_PORTAL env var
 * or dev override. In this mode, routes are served at root "/" with no prefix.
 */
export function isAppModeDriven(): boolean {
  try {
    const host = window.location.hostname;
    
    // If it's a recognized subdomain, it's a portal-specific view
    if (host.startsWith("admin.") || host.startsWith("administration.") || 
        host.startsWith("reseller.") || host.startsWith("retailshops.")) {
      return true;
    }

    // If explicitly set via env var (for separate deployments)
    const portalEnv = import.meta.env.VITE_PORTAL || import.meta.env.VITE_APP_MODE;
    if (portalEnv) {
      // Only lock to the portal if we're not on a development/preview host where we want unified access
      const isSharedPreview = host.includes('ais-pre-') || host.includes('run.app');
      const isLocal = host === 'localhost' || host === '127.0.0.1' || host.includes('ais-dev-');
      
      if (!isSharedPreview && !isLocal) {
        console.log("[SUBDOMAIN] App mode driven (locked) to:", portalEnv);
        return true;
      } else {
        console.log("[SUBDOMAIN] Unified mode enabled on dev/preview host:", host);
      }
    }
  } catch (e) { /* ignore */ }
  
  return false;
}

/**
 * Returns true if the portal switcher should be visible.
 */
export function shouldShowPortalSwitcher(): boolean {
  try {
    const host = window.location.hostname;
    const isDev = host.includes('ais-dev-') || host === 'localhost' || host === '127.0.0.1';
    
    if (isDev) return true;
    
    // Explicitly hide in production builds unless it's a dev/preview environment
    if (import.meta.env.PROD) {
      return false;
    }
    
    if (import.meta.env.DEV) return true;
  } catch (e) { /* ignore */ }
  return false;
}

export function detectPortal(): PortalType {
  let portal: PortalType = "customer";

  // 1. Subdomain detection (Highest priority for production)
  try {
    const host = window.location.hostname;
    if (host.startsWith("admin.") || host.startsWith("administration.")) portal = "admin";
    else if (host.startsWith("reseller.") || host.startsWith("retailshops.")) portal = "reseller";
  } catch (e) { /* ignore */ }

  if (portal === "customer") {
    // 2. Path-based detection (for unified mode on dev/preview)
    try {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) portal = "admin";
      else if (path.startsWith("/reseller")) portal = "reseller";
    } catch (e) { /* ignore */ }
  }

  if (portal === "customer") {
    // 3. Env vars (for separate deployments)
    const mode = import.meta.env.VITE_PORTAL || import.meta.env.VITE_APP_MODE;
    if (mode === "admin") portal = "admin";
    else if (mode === "reseller") portal = "reseller";
    else if (mode === "site" || mode === "customer") portal = "customer";
  }

  // Log detection in dev/preview
  if (typeof window !== 'undefined' && (window.location.hostname.includes('ais-dev-') || window.location.hostname.includes('ais-pre-'))) {
    console.log("[SUBDOMAIN] Detected portal:", portal, "from path:", window.location.pathname);
  }

  return portal;
}

/** @deprecated Use detectPortal() === "admin" instead */
export function isAdminSubdomain(): boolean {
  return detectPortal() === "admin";
}

export function isResellerSubdomain(): boolean {
  return detectPortal() === "reseller";
}

/**
 * Returns the route prefix for admin pages.
 * When locked to admin portal, returns "" (root-level).
 */
export function adminPrefix(): string {
  return isAppModeDriven() && detectPortal() === "admin" ? "" : "/admin";
}

/**
 * Returns the route prefix for reseller pages.
 * When locked to reseller portal, returns "" (root-level).
 */
export function resellerPrefix(): string {
  return isAppModeDriven() && detectPortal() === "reseller" ? "" : "/reseller";
}

function normalizeCanonicalPath(canonicalPath: string, basePath: "/admin" | "/reseller"): string {
  const normalized = canonicalPath.replace(/\/$/, "") || basePath;
  return normalized.startsWith(basePath) ? normalized : `${basePath}${normalized.startsWith("/") ? "" : "/"}${normalized}`;
}

export function adminPath(canonicalPath: string): string {
  const normalized = normalizeCanonicalPath(canonicalPath, "/admin");

  if (isAppModeDriven() && detectPortal() === "admin") {
    const stripped = normalized.replace(/^\/admin(?=\/|$)/, "") || "/";
    return stripped;
  }

  return normalized;
}

export function resellerPath(canonicalPath: string): string {
  const normalized = normalizeCanonicalPath(canonicalPath, "/reseller");

  if (isAppModeDriven() && detectPortal() === "reseller") {
    const stripped = normalized.replace(/^\/reseller(?=\/|$)/, "") || "/";
    return stripped;
  }

  return normalized;
}

/**
 * Returns the absolute URL for a reseller's storefront.
 * Handles subdomain vs path-based routing correctly.
 */
export function getStorefrontUrl(shopSlug: string): string {
  if (!shopSlug) return "/";
  
  try {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If we're on a dev/preview host, use path-based routing
    if (host.includes('ais-dev-') || host.includes('ais-pre-') || host === 'localhost' || host === '127.0.0.1') {
      return `/store/${shopSlug}`;
    }
    
    // In production, we might be on reseller.myshop.com or admin.myshop.com
    // We want to go to myshop.com/store/slug
    const baseHost = host.replace(/^(admin|reseller|administration|retailshops)\./, "");
    return `${protocol}//${baseHost}/store/${shopSlug}`;
  } catch (e) {
    return `/store/${shopSlug}`;
  }
}
