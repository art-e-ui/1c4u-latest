import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  root: ".",
  base: "/",
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts",
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon.ico", "LogocartforU.svg", "icon-192.png", "icon-512.png", "brand/*.svg", "brand/*.png", "manifest.json", "offline.html"],
      manifest: false, // We use the manual manifest.json in public/
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5242880, // 5 MiB
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "firebase/app": path.resolve(__dirname, "./src/lib/supabase-compat/app.ts"),
      "firebase/auth": path.resolve(__dirname, "./src/lib/supabase-compat/auth.ts"),
      "firebase/firestore": path.resolve(__dirname, "./src/lib/supabase-compat/firestore.ts"),
      "firebase/storage": path.resolve(__dirname, "./src/lib/supabase-compat/storage.ts"),
      "firebase/messaging": path.resolve(__dirname, "./src/lib/supabase-compat/messaging.ts"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
});
