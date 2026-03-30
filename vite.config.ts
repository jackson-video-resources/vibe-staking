import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "client",
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  server: {
    proxy:
      process.env.VITE_DEMO_MODE === "true"
        ? {}
        : {
            "/api": "http://localhost:3000",
          },
  },
  css: {
    postcss: {
      plugins: [
        (await import("tailwindcss")).default({
          content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
        }),
        (await import("autoprefixer")).default,
      ],
    },
  },
});
