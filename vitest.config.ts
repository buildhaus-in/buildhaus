import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Root-level Vitest config covering both apps (apps/website, apps/portal)
// and every workspace package under packages/*. Path aliases mirror the
// @buildhaus/* workspace packages (npm workspaces already symlinks these
// into node_modules, but the explicit aliases here make resolution fast and
// unambiguous under Vite/esbuild, and keep tests working even if a package
// is briefly unlinked). `server-only` / `client-only` are aliased to inert
// stubs (see test/stubs) so packages/database's demo data layer — which is
// marked server-only — can be imported directly from test files.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "server-only", replacement: path.resolve(__dirname, "test/stubs/server-only.ts") },
      { find: "client-only", replacement: path.resolve(__dirname, "test/stubs/client-only.ts") },
      { find: "@buildhaus/utils", replacement: path.resolve(__dirname, "packages/utils/src") },
      { find: "@buildhaus/validation", replacement: path.resolve(__dirname, "packages/validation/src") },
      { find: "@buildhaus/database", replacement: path.resolve(__dirname, "packages/database/src") },
      { find: "@buildhaus/types", replacement: path.resolve(__dirname, "packages/types/src") },
      { find: "@buildhaus/ui", replacement: path.resolve(__dirname, "packages/ui/src") },
      { find: "@buildhaus/brand", replacement: path.resolve(__dirname, "packages/brand/src") },
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "packages/**/*.test.{ts,tsx}",
      "apps/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "e2e/**",
    ],
  },
});
