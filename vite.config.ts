import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** Initialize local PGlite for dev only; production uses PostgreSQL lazily. */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "pinai:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      const hasMigrations = readdirSync(join(server.config.root, "migrations"), { withFileTypes: true })
        .some(item => item.isFile() && isMigrationFile(item.name));
      if (!hasMigrations) return;
      const module = await server.ssrLoadModule("/src/lib/db.ts") as {
        ensureDbReady?: () => Promise<void>
      };
      await module.ensureDbReady?.();
    },
  };
}

export default defineConfig(({ command, isPreview }) => ({
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
  preview: { host: "127.0.0.1", port: 8081, strictPort: true },
  resolve: { tsconfigPaths: true },
  plugins: [
    pgliteBootstrapPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview ? [nitro({ preset: process.env.PINAI_CF_PAGES_BUILD === "1" ? "cloudflare_pages" : "vercel" })] : []),
    viteReact(),
  ],
}));
