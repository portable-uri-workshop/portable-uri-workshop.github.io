import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "site");
const output = resolve(root, "_site");
const commit = process.env.GITHUB_SHA || process.argv[2] || "0000000000000000000000000000000000000000";

if (!/^[0-9a-f]{40}$/.test(commit)) {
  throw new Error("Build commit must be a full lowercase 40-character SHA.");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

const buildInfoPath = resolve(output, "build-info.js");
const buildInfo = await readFile(buildInfoPath, "utf8");
await writeFile(
  buildInfoPath,
  buildInfo.replace("0000000000000000000000000000000000000000", commit),
  "utf8",
);

const built = await readFile(buildInfoPath, "utf8");
if (!built.includes(commit)) throw new Error("Commit metadata was not inserted.");
