import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite conexiones desde fuera del contenedor
    port: 5173,
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});