import assert from "node:assert/strict";
import { test } from "node:test";

import {
  executable,
  foundryDependenciesPresent,
  validationSteps,
} from "./ci-check.mjs";

test("uses the platform executable suffix only on Windows", () => {
  assert.equal(executable("pnpm", "linux"), "pnpm");
  assert.equal(executable("pnpm", "win32"), "pnpm.cmd");
  assert.equal(executable("forge", "win32"), "forge");
});

test("mirrors the repository CI validation order", () => {
  assert.deepEqual(
    validationSteps().map((step) => step.label),
    [
      "Agent configuration",
      "Lint",
      "Formatting",
      "Typecheck",
      "Workspace build",
      "Foundry build",
      "Tests",
      "Generated ABI sync",
      "Protocol/Cloud boundary",
    ],
  );
});

test("detects both required Foundry dependency directories", () => {
  assert.equal(foundryDependenciesPresent("/path/that/does/not/exist"), false);
});
