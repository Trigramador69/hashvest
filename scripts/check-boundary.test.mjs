import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkDocumentationLinks,
  checkLayerImports,
  checkProtocolSurface,
  checkSecretContainment,
  parseExportNames,
} from "./check-boundary.mjs";

const allowlist = ["apps/web/lib/supabase-server.ts"];

test("allows a server secret inside an allowlisted module", () => {
  const files = [
    {
      path: "apps/web/lib/supabase-server.ts",
      text: 'import "server-only";\nprocess.env.SUPABASE_SERVICE_ROLE_KEY;',
    },
  ];
  assert.deepEqual(checkSecretContainment(files, allowlist), []);
});

test("rejects a server secret read outside the allowlist", () => {
  const files = [
    {
      path: "apps/web/components/grant-card.tsx",
      text: "const key = process.env.SUPABASE_SERVICE_ROLE_KEY;",
    },
  ];
  const violations = checkSecretContainment(files, allowlist);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /outside the server-only allowlist/);
});

test("rejects a NEXT_PUBLIC_ prefixed server secret anywhere", () => {
  const files = [
    { path: "apps/web/.env.local.example", text: "NEXT_PUBLIC_AUTH_SECRET=" },
  ];
  const violations = checkSecretContainment(files, allowlist);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /would publish a server secret to the browser/);
});

test("reports a prefixed secret once rather than twice", () => {
  const files = [
    {
      path: "apps/web/lib/wagmi.ts",
      text: "process.env.NEXT_PUBLIC_AUTH_SECRET;",
    },
  ];
  assert.equal(checkSecretContainment(files, allowlist).length, 1);
});

test("covers the AI provider key like any other server secret", () => {
  const files = [
    {
      path: "apps/web/lib/cloud/ai/provider.ts",
      text: "const key = process.env.AI_API_KEY;",
    },
    { path: "apps/web/.env.local.example", text: "NEXT_PUBLIC_AI_API_KEY=" },
  ];
  const violations = checkSecretContainment(files, allowlist);
  assert.equal(violations.length, 2);
  assert.match(
    violations[0],
    /reads AI_API_KEY outside the server-only allowlist/,
  );
  assert.match(violations[1], /would publish a server secret to the browser/);
});

test("requires server-only beside a createSupabaseAdmin import", () => {
  const missing = [
    {
      path: "apps/web/lib/organizations/server.ts",
      text: 'import { createSupabaseAdmin } from "@/lib/supabase-server";',
    },
  ];
  assert.match(
    checkSecretContainment(missing, allowlist)[0],
    /without `import "server-only"`/,
  );

  const guarded = [
    {
      path: "apps/web/lib/organizations/server.ts",
      text: 'import "server-only";\nimport { createSupabaseAdmin } from "@/lib/supabase-server";',
    },
  ];
  assert.deepEqual(checkSecretContainment(guarded, allowlist), []);
});

test("exempts Route Handlers, which Next never bundles for the client", () => {
  const files = [
    {
      path: "apps/web/app/api/auth/nonce/route.ts",
      text: 'import { createSupabaseAdmin } from "@/lib/supabase-server";',
    },
  ];
  assert.deepEqual(checkSecretContainment(files, allowlist), []);
});

test("rejects a Protocol package importing Supabase or Next", () => {
  const files = [
    {
      path: "packages/web3/src/index.ts",
      text: 'import { createClient } from "@supabase/supabase-js";',
    },
    {
      path: "packages/web3/src/explorer.ts",
      text: 'import { cookies } from "next/headers";',
    },
  ];
  const violations = checkLayerImports(files);
  assert.equal(violations.length, 2);
  assert.match(
    violations[0],
    /Cloud may depend on Protocol, never the reverse/,
  );
});

test("allows a Protocol package importing viem", () => {
  const files = [
    {
      path: "packages/web3/src/explorer.ts",
      text: 'import type { Address } from "viem";',
    },
  ];
  assert.deepEqual(checkLayerImports(files), []);
});

test("rejects lib/protocol importing lib/cloud, but not the reverse", () => {
  const wrongWay = [
    {
      path: "apps/web/lib/protocol/roles.ts",
      text: 'import { listMembers } from "@/lib/cloud/organizations/server";',
    },
  ];
  assert.match(
    checkLayerImports(wrongWay)[0],
    /lib\/protocol must not import lib\/cloud/,
  );

  const rightWay = [
    {
      path: "apps/web/lib/cloud/organizations/server.ts",
      text: 'import { resolveProtocolRoles } from "@/lib/protocol/roles";',
    },
  ];
  assert.deepEqual(checkLayerImports(rightWay), []);
});

test("rejects lib/shared depending on either layer", () => {
  const files = [
    {
      path: "apps/web/lib/shared/utils.ts",
      text: 'import { hskTestnet } from "@/lib/protocol/network";',
    },
  ];
  assert.match(checkLayerImports(files)[0], /layer-neutral/);
});

test("parses export names, unwrapping type and alias forms", () => {
  const source = `
    export { hskChains, hskMainnet, type HskChain } from "./chains/hsk";
    export { grantVaultAbi as vaultAbi } from "./abis";
  `;
  assert.deepEqual(parseExportNames(source), [
    "HskChain",
    "hskChains",
    "hskMainnet",
    "vaultAbi",
  ]);
});

test("detects protocol surface drift in both directions", () => {
  const source = 'export { a, b } from "./x";';
  assert.deepEqual(checkProtocolSurface(source, ["a", "b"]), []);

  const undeclared = checkProtocolSurface(source, ["a"]);
  assert.equal(undeclared.length, 1);
  assert.match(undeclared[0], /not declared in protocol-surface\.json/);

  const unimplemented = checkProtocolSurface(source, ["a", "b", "c"]);
  assert.equal(unimplemented.length, 1);
  assert.match(unimplemented[0], /which protocol\.ts does not export/);
});

test("flags broken relative documentation links only", () => {
  const files = [
    {
      path: "README.md",
      absolutePath: "/repo/README.md",
      text: [
        "[live](docs/architecture.md)",
        "[dead](docs/missing.md)",
        "[external](https://example.com/x.md)",
        "[anchor](#roadmap)",
        "[anchored file](docs/architecture.md#enforcement)",
      ].join("\n"),
    },
  ];
  const exists = (target) =>
    target.replace(/\\/g, "/").endsWith("architecture.md");
  const violations = checkDocumentationLinks(files, exists);
  assert.equal(violations.length, 1);
  assert.match(violations[0], /broken link to "docs\/missing\.md"/);
});
