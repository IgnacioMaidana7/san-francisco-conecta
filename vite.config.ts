import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon.svg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "San Francisco Conecta",
        short_name: "SF Conecta",
        lang: "es-AR",
        description: "Servicios municipales · Proyecto académico TP5",
        theme_color: "#133f36",
        background_color: "#f4f7f6",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: { globPatterns: ["**/*.{js,css,html,png,svg,woff2}"] },
    }),
  ],
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  preview: { port: 4173, strictPort: true },
  build: { chunkSizeWarningLimit: 500 },
});
