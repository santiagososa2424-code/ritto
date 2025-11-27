import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // si tu app usa rutas internas con React Router: opcional base config
  // base: "./",
  plugins: [react()]
});
