import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: here("./"),
  base: "./",
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@/lib/terminal/run", replacement: here("./native-run.ts") },
      { find: "@/lib/terminal/download", replacement: here("./native-download.ts") },
      { find: "@", replacement: here("../../src") },
    ],
  },
  build: {
    outDir: here("../app/src/main/assets/web"),
    emptyOutDir: true,
    target: "chrome90",
    sourcemap: false,
  },
});
