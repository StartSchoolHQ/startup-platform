#!/usr/bin/env node
/**
 * Cross-module import audit for the scholarship-agreement module.
 *
 * Enforces two rules:
 *
 * 1. No file OUTSIDE the module's directories may import anything from
 *    INSIDE them. The scholarship module is self-contained; external code
 *    consumes it only through the public surfaces (Next.js routes / pages).
 *
 * 2. No file INSIDE the module's directories may import from project paths
 *    OUTSIDE the allowlist. Anything we depend on (Supabase clients, ShadCN
 *    UI, validation schemas, etc.) must be explicitly listed in
 *    ALLOWED_OUTSIDE so the seam stays observable.
 *
 * Failures exit non-zero so CI / lint blocks the merge.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const MODULE_DIRS = [
  "src/lib/scholarship",
  "src/lib/dokobit",
  "src/components/scholarship",
  "src/app/full-scholarship-agreement",
  "src/app/partial-scholarship-agreement",
  "src/app/agreement",
  "src/app/privacy/scholarship-agreement",
  "src/app/api/agreements",
  "src/app/api/webhooks/dokobit",
  "src/app/dashboard/admin/agreements",
];

const ALLOWED_OUTSIDE = [
  "@/lib/supabase/",
  "@/components/ui/",
  "@/lib/validation-schemas",
  "@/contexts/app-context",
  "@/types/database",
  "@/lib/utils",
];

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|mjs)$/;
const IMPORT_PATTERN = /from\s+["']([^"']+)["']/g;

function normalisePath(p) {
  return p.replace(/\\/g, "/");
}

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (SOURCE_EXTENSIONS.test(entry)) out.push(normalisePath(full));
  }
}

function listFiles(dir) {
  const out = [];
  try {
    walk(dir, out);
  } catch {
    // Directory does not exist yet; skip.
  }
  return out;
}

function isInsideModule(filePath) {
  return MODULE_DIRS.some((d) => filePath.startsWith(d));
}

function findImports(filePath) {
  const source = readFileSync(filePath, "utf8");
  const imports = [];
  let match;
  while ((match = IMPORT_PATTERN.exec(source)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function moduleNameForPath(importPath) {
  const trimmed = importPath.replace(/^@\//, "src/");
  for (const d of MODULE_DIRS) {
    if (trimmed.startsWith(d)) return d;
  }
  return null;
}

const errors = [];

// Rule 1: outside-the-module files importing module internals
for (const filePath of listFiles("src")) {
  if (isInsideModule(filePath)) continue;
  for (const imp of findImports(filePath)) {
    if (moduleNameForPath(imp)) {
      errors.push(`${filePath} imports module-internal ${imp}`);
    }
  }
}

// Rule 2: module files importing project paths outside the allowlist
for (const moduleDir of MODULE_DIRS) {
  for (const filePath of listFiles(moduleDir)) {
    for (const imp of findImports(filePath)) {
      if (!imp.startsWith("@/")) continue; // relative or external — fine
      if (moduleNameForPath(imp)) continue; // module-internal — fine
      if (ALLOWED_OUTSIDE.some((a) => imp.startsWith(a))) continue;
      errors.push(`${filePath} imports disallowed ${imp}`);
    }
  }
}

if (errors.length > 0) {
  console.error(
    `Seam audit failed (${errors.length} violation${errors.length === 1 ? "" : "s"}):`
  );
  for (const err of errors) console.error("  - " + err);
  console.error(
    "\nThe scholarship module is self-contained. External imports must be"
  );
  console.error(
    "explicitly allowed via ALLOWED_OUTSIDE in scripts/seam-audit.mjs."
  );
  process.exit(1);
}

console.log(
  `Seam audit passed. Modules scanned: ${MODULE_DIRS.length}. Allowlist entries: ${ALLOWED_OUTSIDE.length}.`
);
