import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATALOG_END,
  CATALOG_START,
  claudeSkillsDirectory,
  generatedManifestPath,
  readCanonicalSkills,
  renderCatalog,
  root,
  SKILL_NAME_PATTERN,
} from "./sync-agent-skills.mjs";
import { checkDocumentationLinks } from "./check-boundary.mjs";

const REQUIRED_MARKERS = [
  "NECESSARY AND OBLIGATORY",
  "pnpm agents:sync",
  "pnpm agents:check",
  "README.md",
  "AGENTS.md",
];

function repoPath(path) {
  return relative(root, path).split(sep).join("/");
}

export function checkSkillMetadata(skills) {
  const violations = [];
  for (const skill of skills) {
    if (!SKILL_NAME_PATTERN.test(skill.directory)) {
      violations.push(
        `${repoPath(skill.path)}: directory name must be lowercase kebab-case.`,
      );
    }
    if (typeof skill.name !== "string") {
      violations.push(`${repoPath(skill.path)}: frontmatter name is required.`);
    } else if (skill.name !== skill.directory) {
      violations.push(
        `${repoPath(skill.path)}: frontmatter name must equal its directory.`,
      );
    }
    if (!skill.description || skill.description.length < 20) {
      violations.push(
        `${repoPath(skill.path)}: frontmatter description must be specific and non-empty.`,
      );
    }
    for (const marker of REQUIRED_MARKERS) {
      if (!skill.source.includes(marker)) {
        violations.push(
          `${repoPath(skill.path)}: missing mandatory maintenance marker or command "${marker}".`,
        );
      }
    }
  }
  return violations;
}

export async function checkClaudeMirrors(skills) {
  const violations = [];
  if (!existsSync(generatedManifestPath)) {
    return [
      `Missing generated Claude manifest: ${repoPath(generatedManifestPath)}.`,
    ];
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(generatedManifestPath, "utf8"));
  } catch {
    return [
      `Invalid generated Claude manifest: ${repoPath(generatedManifestPath)}.`,
    ];
  }

  const expected = skills.map((skill) => skill.name).sort();
  if (
    !Array.isArray(manifest.skills) ||
    manifest.skills.some(
      (name) => typeof name !== "string" || !SKILL_NAME_PATTERN.test(name),
    )
  ) {
    return [
      `${repoPath(generatedManifestPath)}: generated skill list is invalid; run pnpm agents:sync.`,
    ];
  }
  const actual = [...manifest.skills].sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    violations.push(
      `${repoPath(generatedManifestPath)}: generated skill list is stale; run pnpm agents:sync.`,
    );
  }

  const expectedDirectories = new Set(expected);
  if (existsSync(claudeSkillsDirectory)) {
    const entries = await readdir(claudeSkillsDirectory, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isDirectory() || !expectedDirectories.has(entry.name)) {
        if (entry.name !== ".hashvest-generated.json") {
          violations.push(
            `${repoPath(join(claudeSkillsDirectory, entry.name))}: project Claude skills must be canonical under .agents/skills.`,
          );
        }
      }
    }
  }

  for (const skill of skills) {
    const mirrorPath = join(claudeSkillsDirectory, skill.name, "SKILL.md");
    if (!existsSync(mirrorPath)) {
      violations.push(
        `Missing Claude mirror: ${repoPath(mirrorPath)}; run pnpm agents:sync.`,
      );
      continue;
    }
    const mirrorSource = await readFile(mirrorPath, "utf8");
    if (mirrorSource !== skill.source) {
      violations.push(
        `${repoPath(mirrorPath)}: differs from the canonical skill; run pnpm agents:sync.`,
      );
    }
  }
  return violations;
}

async function collectMarkdownFiles(paths) {
  const files = [];
  async function visit(path) {
    if (!existsSync(path)) return;
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) {
        await visit(child);
      } else if (entry.name.endsWith(".md")) {
        files.push({
          path: repoPath(child),
          absolutePath: child,
          text: await readFile(child, "utf8"),
        });
      }
    }
  }
  for (const path of paths) {
    if (path.endsWith(".md")) {
      if (existsSync(path)) {
        files.push({
          path: repoPath(path),
          absolutePath: path,
          text: await readFile(path, "utf8"),
        });
      }
    } else {
      await visit(path);
    }
  }
  return files;
}

export async function checkProjectContract(skills) {
  const violations = [];
  const requiredFiles = [
    "AGENTS.md",
    "CLAUDE.md",
    ".agents/README.md",
    "docs/agents/README.md",
    "docs/agents/compatibility.md",
  ];
  for (const relativePath of requiredFiles) {
    if (!existsSync(join(root, relativePath))) {
      violations.push(`Missing required agent file: ${relativePath}.`);
    }
  }

  const claudeInstructions = await readFile(
    join(root, "CLAUDE.md"),
    "utf8",
  ).catch(() => "");
  if (!/^@AGENTS\.md\s*$/m.test(claudeInstructions)) {
    violations.push(
      "CLAUDE.md must import the root AGENTS.md with @AGENTS.md.",
    );
  }

  for (const { relativePath, skillLinkPrefix } of [
    { relativePath: "README.md", skillLinkPrefix: ".agents/skills" },
    { relativePath: "AGENTS.md", skillLinkPrefix: ".agents/skills" },
    {
      relativePath: "docs/agents/README.md",
      skillLinkPrefix: "../../.agents/skills",
    },
  ]) {
    const source = await readFile(join(root, relativePath), "utf8").catch(
      () => "",
    );
    const start = source.indexOf(CATALOG_START);
    const end = source.indexOf(CATALOG_END);
    if (start === -1) {
      violations.push(
        `${relativePath}: missing generated agent catalog start marker.`,
      );
    }
    if (end === -1 || end < start) {
      violations.push(
        `${relativePath}: missing generated agent catalog end marker.`,
      );
    }
    if (start !== -1 && end !== -1 && end >= start) {
      const actualBlock = source.slice(start, end + CATALOG_END.length);
      const expectedBlock = `${CATALOG_START}\n\n${renderCatalog(
        skills,
        skillLinkPrefix,
      )}\n${CATALOG_END}`;
      if (actualBlock !== expectedBlock) {
        violations.push(
          `${relativePath}: generated agent catalog is stale; run pnpm agents:sync.`,
        );
      }
    }
  }

  const markdownFiles = await collectMarkdownFiles([
    join(root, "README.md"),
    join(root, "AGENTS.md"),
    join(root, ".agents"),
    join(root, ".claude"),
    join(root, "docs", "agents"),
  ]);
  violations.push(...checkDocumentationLinks(markdownFiles));
  return violations;
}

export async function checkAgentConfiguration() {
  let skills;
  try {
    skills = await readCanonicalSkills();
  } catch (error) {
    return [`Unable to read canonical skills: ${error.message}`];
  }
  const violations = [
    ...checkSkillMetadata(skills),
    ...(await checkClaudeMirrors(skills)),
    ...(await checkProjectContract(skills)),
  ];
  return violations;
}

async function main() {
  const violations = await checkAgentConfiguration();
  if (violations.length > 0) {
    throw new Error(
      `Agent configuration is out of sync.\n\n${violations
        .map((violation) => `  - ${violation}`)
        .join("\n")}`,
    );
  }
  const skills = await readCanonicalSkills();
  console.log(
    `Agent configuration intact across ${skills.length} canonical skills.`,
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
