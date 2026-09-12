import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const contractsDirectory = join(root, "packages", "contracts");

export function executable(name, platform = process.platform) {
  return platform === "win32" ? `${name}.cmd` : name;
}

export function validationSteps() {
  return [
    { label: "Agent configuration", command: "pnpm", args: ["agents:check"] },
    { label: "Lint", command: "pnpm", args: ["lint"] },
    {
      label: "Formatting",
      command: "pnpm",
      args: ["format:check"],
    },
    { label: "Typecheck", command: "pnpm", args: ["typecheck"] },
    { label: "Workspace build", command: "pnpm", args: ["build"] },
    {
      label: "Foundry build",
      command: "forge",
      args: ["build"],
      cwd: contractsDirectory,
    },
    { label: "Tests", command: "pnpm", args: ["test"] },
    {
      label: "Generated ABI sync",
      command: "pnpm",
      args: ["contracts:sync:check"],
    },
    {
      label: "Protocol/Cloud boundary",
      command: "pnpm",
      args: ["boundary:check"],
    },
  ];
}

export function foundryDependenciesPresent(directory = contractsDirectory) {
  return ["forge-std", "openzeppelin-contracts"].every((dependency) =>
    existsSync(join(directory, "lib", dependency)),
  );
}

function run(command, args, cwd = root) {
  const result = spawnSync(executable(command), args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    throw new Error(`Unable to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with status ${result.status}.`,
    );
  }
}

function ensureFoundry() {
  const result = spawnSync(executable("forge"), ["--version"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      "Foundry is required for CI parity. Install forge/cast/anvil, then rerun pnpm ci:check.",
    );
  }
}

function ensureFoundryDependencies() {
  if (foundryDependenciesPresent()) return;
  run(
    "forge",
    [
      "install",
      "--no-git",
      "--shallow",
      "foundry-rs/forge-std@v1.9.7",
      "OpenZeppelin/openzeppelin-contracts@v5.4.0",
    ],
    contractsDirectory,
  );
}

export async function runCiCheck() {
  run("pnpm", ["install", "--frozen-lockfile"]);
  ensureFoundry();
  ensureFoundryDependencies();
  for (const step of validationSteps()) {
    console.log(`\n==> ${step.label}`);
    run(step.command, step.args, step.cwd ?? root);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runCiCheck().catch((error) => {
    console.error(`CI preflight failed: ${error.message}`);
    process.exitCode = 1;
  });
}
