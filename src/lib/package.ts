import { readFile } from "node:fs/promises";

export async function readPackageVersion(): Promise<string> {
  for (const candidate of getPackageJsonCandidates()) {
    try {
      const contents = await readFile(candidate, "utf8");
      const packageJson = JSON.parse(contents) as { version: string };

      return packageJson.version;
    } catch {
      continue;
    }
  }

  throw new Error("Could not locate package.json");
}

function getPackageJsonCandidates(): URL[] {
  return [
    new URL("../package.json", import.meta.url),
    new URL("../../package.json", import.meta.url),
  ];
}
