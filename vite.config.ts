// Vite build configuration for the React app and deploy base path.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/globe-country-select/",
  build: {
    // The app intentionally ships large geographic/flag data; chunk by concern.
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("ne_50m_admin_0_countries.geojson")) {
            return "geo-data";
          }

          if (id.includes("node_modules/three")) {
            return "three-vendor";
          }

          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "react-vendor";
          }

          if (id.includes("node_modules/flag-icons")) {
            return "flags-vendor";
          }
        }
      }
    }
  },
  test: {
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/main.tsx"],
      thresholds: {
        lines: 93,
        functions: 85,
        statements: 93,
        branches: 86
      }
    }
  }
});
