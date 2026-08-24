// Deletes the shared Demo Mode data file so the next request to either app
// reseeds from scratch. Safe no-op if it doesn't exist or a real Supabase
// project is configured (nothing reads this file in that case).
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const storeFile = join(repoRoot, ".demo-data", "store.json");

if (existsSync(storeFile)) {
  rmSync(storeFile);
  console.log(`Removed ${storeFile} — both apps will reseed on next request.`);
} else {
  console.log("No demo data file found — nothing to reset.");
}
