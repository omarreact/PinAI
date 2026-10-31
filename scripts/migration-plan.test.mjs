import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { isMigrationFile, migrationName, pendingMigrations } from "./migration-plan.mjs";
const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("migration identity is the filename", () => {
  assert.equal(migrationName("/migrations/0002_todos.sql"), "0002_todos.sql");
  assert.equal(migrationName("0000_auth.sql"), "0000_auth.sql");
});
test("already applied migrations are not reapplied", () => {
  assert.deepEqual(pendingMigrations(["/migrations/0000_auth.sql"], ["0000_auth.sql"]), []);
});
test("migrations are applied in name order", () => {
  assert.deepEqual(pendingMigrations(
    ["/migrations/0003_c.sql", "/migrations/0001_a.sql", "/migrations/0002_b.sql"], ["0001_a.sql"]
  ), [
    { name: "0002_b.sql", path: "/migrations/0002_b.sql" },
    { name: "0003_c.sql", path: "/migrations/0003_c.sql" },
  ]);
});
test("migration scanner ignores non-SQL entries", () => {
  assert.equal(isMigrationFile("auth"), false);
  assert.deepEqual(pendingMigrations(["auth", "README.md"], []), []);
});
test("GitHub OAuth and AI chat migrations are included in the production build", () => {
  const names = readdirSync(join(root, "migrations"));
  assert.ok(names.includes("0000_auth.sql"));
  assert.ok(names.includes("0001_ai_chat.sql"));
  const pending = pendingMigrations(names, []);
  assert.deepEqual(pending.map(x => x.name), ["0000_auth.sql", "0001_ai_chat.sql"]);
});
