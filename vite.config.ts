// Vite build configuration for the React app and deploy base path.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/globe-country-select/"
});
