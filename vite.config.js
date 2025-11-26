import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5173,
    open: false,
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },

  // 🔥 NECESARIO PARA REACT ROUTER EN VERCEL
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },

  // 🔥 NECESARIO PARA QUE LAS RUTAS FUNCIONEN EN PRODUCCIÓN
  preview: {
    port: 4173,
    strictPort: true,
  }
});
