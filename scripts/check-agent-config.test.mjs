import assert from "node:assert/strict";
import { test } from "node:test";

import { checkSkillMetadata } from "./check-agent-config.mjs";

const maintenance = [
  "NECESSARY AND OBLIGATORY",
  "pnpm agents:sync",
  "pnpm agents:check",
  "README.md",
  "AGENTS.md",
].join(" ");

test("accepts a canonical skill with the maintenance contract", () => {
  assert.deepEqual(
    checkSkillMetadata([
      {
        directory: "example-skill",
        name: "example-skill",
        description: "A sufficiently specific project workflow skill",
        path: "/repo/.agents/skills/example-skill/SKILL.md",
        source: maintenance,
      },
    ]),
    [],
  );
});

test("rejects a skill whose directory and metadata disagree", () => {
  const violations = checkSkillMetadata([
    {
      directory: "ExampleSkill",
      name: "other-name",
      description: "A sufficiently specific project workflow skill",
      path: "/repo/.agents/skills/ExampleSkill/SKILL.md",
      source: maintenance,
    },
  ]);
  assert.equal(violations.length, 2);
  assert.match(violations[0], /lowercase kebab-case/);
  assert.match(violations[1], /equal its directory/);
});
