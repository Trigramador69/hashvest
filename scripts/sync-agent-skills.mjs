import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const canonicalSkillsDirectory = join(root, ".agents", "skills");
export const claudeSkillsDirectory = join(root, ".claude", "skills");
export const generatedManifestPath = join(
  claudeSkillsDirectory,
  ".hashvest-generated.json",
);

export const CATALOG_START = "<!-- BEGIN:hashvest-agent-catalog -->";
export const CATALOG_END = "<!-- END:hashvest-agent-catalog -->";

function parseScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseFrontmatter(source) {
  if (!source.startsWith("---\n")) {
    throw new Error("SKILL.md must start with YAML frontmatter.");
  }
  const end = source.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error("SKILL.md frontmatter is not closed.");
  }
  const data = {};
  for (const line of source.slice(4, end).split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/);
    if (!match) throw new Error(`Unsupported frontmatter line: ${line}`);
    if (match[1] in data) {
      throw new Error(`Duplicate frontmatter key: ${match[1]}`);
    }
    data[match[1]] = parseScalar(match[2]);
  }
  return { data, body: source.slice(end + "\n---".length) };
}

export async function readCanonicalSkills() {
  if (!existsSync(canonicalSkillsDirectory)) return [];
  const directories = await readdir(canonicalSkillsDirectory, {
    withFileTypes: true,
  });
  const skills = [];
  for (const entry of directories
    .filter((candidate) => candidate.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(canonicalSkillsDirectory, entry.name, "SKILL.md");
    if (!existsSync(path)) {
      throw new Error(`Missing canonical skill file: ${path}`);
    }
    const source = await readFile(path, "utf8");
    const { data } = parseFrontmatter(source);
    skills.push({
      directory: entry.name,
      name: data.name,
      description: data.description,
      path,
      source,
    });
  }
  return skills;
}

export function replaceGeneratedBlock(source, body) {
  const start = source.indexOf(CATALOG_START);
  const end = source.indexOf(CATALOG_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `Generated agent catalog markers are missing or out of order (${CATALOG_START}).`,
    );
  }
  const endOffset = end + CATALOG_END.length;
  return `${source.slice(0, start)}${CATALOG_START}\n\n${body}\n${CATALOG_END}${source.slice(endOffset)}`;
}

export function renderCatalog(skills) {
  const lines = [
    "### Agent workflow catalog",
    "",
    "Canonical skills live in `.agents/skills/`; Claude adapters are generated in `.claude/skills/`.",
    "",
  ];
  for (const skill of skills) {
    lines.push(
      `- [\`${skill.name}\`](.agents/skills/${skill.directory}/SKILL.md) — ${skill.description}`,
    );
  }
  lines.push(
    "",
    "After changing a skill, run `pnpm agents:sync` and `pnpm agents:check`.",
  );
  return lines.join("\n");
}

async function syncClaudeSkills(skills) {
  await mkdir(claudeSkillsDirectory, { recursive: true });
  let previous = { skills: [] };
  if (existsSync(generatedManifestPath)) {
    try {
      previous = JSON.parse(await readFile(generatedManifestPath, "utf8"));
    } catch {
      throw new Error(`Invalid generated manifest: ${generatedManifestPath}`);
    }
  }

  const currentNames = new Set(skills.map((skill) => skill.name));
  for (const name of previous.skills ?? []) {
    if (currentNames.has(name)) continue;
    await rm(join(claudeSkillsDirectory, name), {
      recursive: true,
      force: true,
    });
  }

  for (const skill of skills) {
    const targetDirectory = join(claudeSkillsDirectory, skill.name);
    await mkdir(targetDirectory, { recursive: true });
    await writeFile(join(targetDirectory, "SKILL.md"), skill.source);
  }

  await writeFile(
    generatedManifestPath,
    `${JSON.stringify(
      {
        generatedBy: "scripts/sync-agent-skills.mjs",
        source: ".agents/skills",
        skills: skills.map((skill) => skill.name),
      },
      null,
      2,
    )}\n`,
  );
}

async function syncCatalogs(skills) {
  const catalog = renderCatalog(skills);
  for (const relativePath of ["README.md", "AGENTS.md"]) {
    const path = join(root, relativePath);
    const source = await readFile(path, "utf8");
    await writeFile(path, replaceGeneratedBlock(source, catalog));
  }
}

export async function syncAgentSkills() {
  const skills = await readCanonicalSkills();
  if (skills.length === 0) {
    throw new Error(
      `No canonical skills found in ${canonicalSkillsDirectory}.`,
    );
  }
  await syncClaudeSkills(skills);
  await syncCatalogs(skills);
  return skills;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  syncAgentSkills()
    .then((skills) => {
      console.log(
        `Synchronized ${skills.length} agent skills and project catalogs.`,
      );
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
