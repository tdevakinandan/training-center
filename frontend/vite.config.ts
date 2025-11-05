import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // ✅ Automatically switch API target based on environment
  const isDev = mode === "development";

  const apiTarget = isDev
    ? "http://localhost:5000" // local backend
    : "https://training-center-backend-w181.onrender.com"; // deployed backend

  return {
    server: {
      host: "::", // Listen on all interfaces
      port: 8080,
      open: false,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), isDev && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
