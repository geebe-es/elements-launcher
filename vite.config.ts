import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Empacotado o app carrega via file:// : caminhos relativos são obrigatórios.
  base: "./",
  server: {
    port: 5173,
  },
});
