import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".next-visual",
  ".turbo",
  "cache",
  "coverage",
  "dist",
  "node_modules",
]);

/** Foundry dependencies and build output; `lib` here must not match apps/web/lib. */
const IGNORED_PATHS = new Set([
  "packages/contracts/broadcast",
  "packages/contracts/lib",
  "packages/contracts/out",
]);

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js", ".jsx"]);

/** Server secrets that must never reach a browser bundle. */
const SECRET_NAMES = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_SECRET",
  "SPONSORED_CLAIM_RELAYER_PRIVATE_KEY",
];

/**
 * Source modules permitted to read a server secret from the environment.
 * Everything else must receive already-configured clients.
 */
const SECRET_ALLOWLIST = [
  "apps/web/lib/cloud/supabase-server.ts",
  "apps/web/lib/cloud/auth/session.ts",
  "apps/web/lib/cloud/sponsored-claims/relayer.ts",
  // This checker and its tests must name the secrets they search for.
  "scripts/check-boundary.mjs",
  "scripts/check-boundary.test.mjs",
];

/** Protocol-layer trees that must not depend on the Cloud layer. */
const PROTOCOL_TREES = ["packages/web3/src", "packages/contracts/src"];

const CLOUD_DEPENDENCIES = [
  { pattern: /["']@supabase\//, reason: "Supabase" },
  { pattern: /["']next(?:\/[^"']*)?["']/, reason: "Next.js" },
  { pattern: /["']@\/lib\//, reason: "the apps/web @/ alias" },
  { pattern: /["'][^"']*apps\/web/, reason: "apps/web" },
];

const DOCUMENTATION_FILES = ["README.md", "docs"];

/** Normalize to posix-style repo-relative paths so checks read the same on Windows. */
export function toRepoPath(absolutePath) {
  return relative(root, absolutePath).split(sep).join("/");
}

async function collectFiles(directory, accumulator = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return accumulator;
  }
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      if (IGNORED_PATHS.has(toRepoPath(absolutePath))) continue;
      await collectFiles(absolutePath, accumulator);
      continue;
    }
    accumulator.push(absolutePath);
  }
  return accumulator;
}

async function readRepositoryFiles() {
  const absolutePaths = await collectFiles(root);
  return Promise.all(
    absolutePaths.map(async (absolutePath) => ({
      path: toRepoPath(absolutePath),
      absolutePath,
      text: await readFile(absolutePath, "utf8").catch(() => ""),
    })),
  );
}

function isSourceFile(file) {
  const dot = file.path.lastIndexOf(".");
  return dot !== -1 && SOURCE_EXTENSIONS.has(file.path.slice(dot));
}

/**
 * Next.js never bundles a Route Handler into client code, so those modules are
 * server-only by construction and need no explicit directive.
 */
function isRouteHandler(path) {
  return /^apps\/web\/app\/.*\/route\.ts$/.test(path);
}

/**
 * A server secret may only be read inside an allowlisted server module, and the
 * NEXT_PUBLIC_ prefix must never be applied to one.
 */
export function checkSecretContainment(files, allowlist = SECRET_ALLOWLIST) {
  const allowed = new Set(allowlist);
  const violations = [];
  for (const file of files) {
    for (const secret of SECRET_NAMES) {
      if (allowed.has(file.path)) continue;
      if (file.text.includes(`NEXT_PUBLIC_${secret}`)) {
        violations.push(
          `${file.path}: NEXT_PUBLIC_${secret} would publish a server secret to the browser.`,
        );
      }
      if (!isSourceFile(file)) continue;
      const bare = new RegExp(`(?<!NEXT_PUBLIC_)\\b${secret}\\b`);
      if (bare.test(file.text)) {
        violations.push(
          `${file.path}: reads ${secret} outside the server-only allowlist.`,
        );
      }
    }
    if (
      /\bcreateSupabaseAdmin\b/.test(file.text) &&
      !file.path.endsWith("supabase-server.ts") &&
      !isRouteHandler(file.path) &&
      !/import\s+["']server-only["']/.test(file.text) &&
      isSourceFile(file)
    ) {
      violations.push(
        `${file.path}: imports createSupabaseAdmin without \`import "server-only"\`.`,
      );
    }
  }
  return violations;
}

/**
 * The Protocol layer must stand alone. Cloud may depend on Protocol; never the
 * reverse, or the protocol cannot be extracted (HAS-38).
 */
export function checkLayerImports(files, protocolTrees = PROTOCOL_TREES) {
  const violations = [];
  for (const file of files) {
    const inProtocolPackage = protocolTrees.some((tree) =>
      file.path.startsWith(`${tree}/`),
    );
    if (inProtocolPackage && isSourceFile(file)) {
      for (const { pattern, reason } of CLOUD_DEPENDENCIES) {
        if (pattern.test(file.text)) {
          violations.push(
            `${file.path}: Protocol layer depends on ${reason}. Cloud may depend on Protocol, never the reverse.`,
          );
        }
      }
    }
    if (
      file.path.startsWith("apps/web/lib/protocol/") &&
      /["']@\/lib\/cloud\//.test(file.text)
    ) {
      violations.push(`${file.path}: lib/protocol must not import lib/cloud.`);
    }
    if (
      file.path.startsWith("apps/web/lib/shared/") &&
      /["']@\/lib\/(cloud|protocol)\//.test(file.text)
    ) {
      violations.push(
        `${file.path}: lib/shared is layer-neutral and must import neither layer.`,
      );
    }
  }
  return violations;
}

/** Exported names of an `export { ... } from "..."` surface module. */
export function parseExportNames(source) {
  const names = [];
  for (const block of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const entry of block[1].split(",")) {
      const cleaned = entry.trim().replace(/^type\s+/, "");
      if (!cleaned) continue;
      const aliased = cleaned.split(/\s+as\s+/);
      names.push(aliased[aliased.length - 1].trim());
    }
  }
  return names.sort();
}

/**
 * The declared extraction surface and the real one must agree, so the
 * @hashvest/protocol boundary cannot erode between now and HAS-38.
 */
export function checkProtocolSurface(source, manifest) {
  const actual = parseExportNames(source);
  const declared = [...manifest].sort();
  const missing = declared.filter((name) => !actual.includes(name));
  const extra = actual.filter((name) => !declared.includes(name));
  const violations = [];
  for (const name of missing) {
    violations.push(
      `packages/web3/protocol-surface.json declares "${name}", which protocol.ts does not export.`,
    );
  }
  for (const name of extra) {
    violations.push(
      `packages/web3/src/protocol.ts exports "${name}", which is not declared in protocol-surface.json.`,
    );
  }
  return violations;
}

/** Relative markdown links must resolve to files that exist. */
export function checkDocumentationLinks(files, exists = existsSync) {
  const violations = [];
  for (const file of files) {
    if (!file.path.endsWith(".md")) continue;
    for (const match of file.text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const [withoutAnchor] = target.split("#");
      if (!withoutAnchor) continue;
      const resolved = resolve(dirname(file.absolutePath), withoutAnchor);
      if (!exists(resolved)) {
        violations.push(`${file.path}: broken link to "${target}".`);
      }
    }
  }
  return violations;
}

async function main() {
  const files = await readRepositoryFiles();
  const documentationFiles = files.filter((file) =>
    DOCUMENTATION_FILES.some(
      (entry) => file.path === entry || file.path.startsWith(`${entry}/`),
    ),
  );

  const surfacePath = resolve(root, "packages/web3/src/protocol.ts");
  const manifestPath = resolve(root, "packages/web3/protocol-surface.json");
  const surfaceSource = await readFile(surfacePath, "utf8");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")).exports;

  const groups = [
    ["Secret containment", checkSecretContainment(files)],
    ["Layer import direction", checkLayerImports(files)],
    ["Protocol export drift", checkProtocolSurface(surfaceSource, manifest)],
    ["Documentation links", checkDocumentationLinks(documentationFiles)],
  ];

  const failed = groups.filter(([, violations]) => violations.length > 0);
  if (failed.length > 0) {
    const report = failed
      .map(
        ([name, violations]) =>
          `${name}:\n${violations.map((line) => `  - ${line}`).join("\n")}`,
      )
      .join("\n\n");
    throw new Error(
      `Protocol/Cloud boundary violated. See docs/architecture.md.\n\n${report}`,
    );
  }

  console.log(
    `Protocol/Cloud boundary intact across ${files.length} files (${groups.length} checks).`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
