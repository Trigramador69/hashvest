import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CATALOG_END,
  CATALOG_START,
  parseFrontmatter,
  renderCatalog,
  replaceGeneratedBlock,
} from "./sync-agent-skills.mjs";

test("parses the required skill frontmatter", () => {
  const parsed = parseFrontmatter(
    "---\nname: example-skill\ndescription: A useful project skill\n---\n\n# Body",
  );
  assert.deepEqual(parsed.data, {
    name: "example-skill",
    description: "A useful project skill",
  });
  assert.match(parsed.body, /# Body/);
});

test("rejects skill files without frontmatter", () => {
  assert.throws(() => parseFrontmatter("# Missing frontmatter"), /must start/);
});

test("replaces generated catalogs without touching surrounding content", () => {
  const source = `before\n${CATALOG_START}\nold\n${CATALOG_END}\nafter`;
  const result = replaceGeneratedBlock(
    source,
    renderCatalog([
      {
        name: "workspace-setup",
        directory: "workspace-setup",
        description: "Set up the workspace safely",
      },
    ]),
  );
  assert.match(result, /before/);
  assert.match(result, /workspace-setup/);
  assert.match(result, /after/);
  assert.doesNotMatch(result, /\nold\n/);
});

test("renders skill links relative to the document that owns the catalog", () => {
  const catalog = renderCatalog(
    [
      {
        name: "architecture",
        directory: "architecture",
        description: "Review architecture boundaries safely",
      },
    ],
    "../../.agents/skills",
  );
  assert.match(
    catalog,
    /\(\.\.\/\.\.\/\.agents\/skills\/architecture\/SKILL\.md\)/,
  );
});
