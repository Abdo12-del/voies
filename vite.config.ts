import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    // Generated HTML reports must not reload the app during browser tests.
    watch: {
      ignored: [
        "**/artifacts/**",
        "**/playwright-report/**",
        "**/test-results/**",
      ],
    },
  },
  preview: { host: "0.0.0.0", port: 4173, allowedHosts: true },
});
