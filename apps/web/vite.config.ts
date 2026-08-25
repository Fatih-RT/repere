import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Same origin in production (PocketBase serves this build from pb_public/,
  // so /api needs no proxy there at all). In dev, relay /api to the real
  // PocketBase instance — the production one by default, per the deploy
  // architecture, or override with VITE_PB_PROXY_TARGET for local testing
  // against a PocketBase running on this machine.
  const target = env.VITE_PB_PROXY_TARGET || "https://revise.fatih-kilic.fr";

  return {
    plugins: [react()],
    resolve: { alias: { "@": "/src" } },
    server: {
      port: 5173,
      proxy: {
        "/api": { target, changeOrigin: true, secure: true },
      },
    },
  };
});
