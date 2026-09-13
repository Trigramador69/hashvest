import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.join(scriptsDirectory, "..");
const nextBin = path.join(
  appDirectory,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);
const child = spawn(
  process.execPath,
  [
    nextBin,
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    process.env.HASHVEST_VISUAL_PORT || "3100",
  ],
  {
    cwd: appDirectory,
    env: { ...process.env, VISUAL_TEST_MODE: "1" },
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
