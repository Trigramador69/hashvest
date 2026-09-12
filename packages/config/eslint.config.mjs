import { defineConfig, globalIgnores } from "eslint/config";
import nextTypescript from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";

/**
 * Protocol/Cloud import direction, surfaced in the editor. `pnpm boundary:check`
 * enforces the same rule in CI, across files ESLint does not cover.
 * See docs/architecture.md.
 */
const layerBoundaries = [
  {
    files: ["lib/protocol/**"],
    restricted: ["@/lib/cloud/*", "@/lib/cloud/**", "@supabase/*"],
    message:
      "lib/protocol must not depend on the Cloud layer. Cloud may depend on Protocol, never the reverse.",
  },
  {
    files: ["lib/shared/**"],
    restricted: [
      "@/lib/cloud/*",
      "@/lib/cloud/**",
      "@/lib/protocol/*",
      "@/lib/protocol/**",
    ],
    message: "lib/shared is layer-neutral and must import neither layer.",
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  ...layerBoundaries.map(({ files, restricted, message }) => ({
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: restricted, message }] },
      ],
    },
  })),
  globalIgnores([
    ".next/**",
    "build/**",
    "coverage/**",
    "dist/**",
    "node_modules/**",
    "out/**",
    "next-env.d.ts",
  ]),
]);
