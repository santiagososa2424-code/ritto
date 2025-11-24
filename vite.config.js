import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // IMPORTANTÍSIMO PARA VERCEL
  root: ".", 

  build: {
    outDir: "dist",
    emptyOutDir: true
  },

  // Para React Router (si más adelante usamos rutas)
  server: {
    port: 3000
  }
});
