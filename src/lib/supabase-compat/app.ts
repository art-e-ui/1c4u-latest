import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

console.log("[SUPABASE_COMPAT] Initializing Supabase client with URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// A mock Firebase App
export const initializeApp = () => {
  return { name: "[DEFAULT]", options: {} };
};

export const getApp = () => {
  return { name: "[DEFAULT]" };
};

export const getApps = () => {
  return [{ name: "[DEFAULT]" }];
};

export const deleteApp = async () => {
  return Promise.resolve();
};
