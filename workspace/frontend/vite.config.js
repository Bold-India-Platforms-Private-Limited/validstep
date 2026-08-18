import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployed at validstep.com/workspace/ — base must match so built asset URLs
// (/workspace/assets/...) resolve correctly once this dist is nested under the main
// validstep frontend's dist/workspace/. Only the production build is path-prefixed;
// `npm run dev` keeps serving from / like any normal Vite dev server.
// Tailwind runs via postcss.config.js (v3, matching the main frontend), not the v4 vite plugin.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/workspace/" : "/",
  plugins: [react()],
}));
