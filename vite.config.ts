// Vite build configuration for the React app and deploy base path.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/globe-country-select/",
  test: {
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/main.tsx"],
      thresholds: {
        lines: 11,
        functions: 55,
        statements: 11,
        branches: 79
      }
    }
  }
});
