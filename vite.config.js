import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // En dev local (npm run dev), redirige les appels vers la fonction serveur
      // exécutée séparément (voir README : `vercel dev` ou `netlify dev`).
      "/api": "http://localhost:3000",
    },
  },
});
