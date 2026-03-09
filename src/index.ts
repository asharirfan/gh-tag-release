import { Command } from "commander";

import { registerReleaseCommand } from "./commands/release.js";
import { readPackageVersion } from "./lib/package.js";

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("gh-tag-release")
    .description("Turn git tags into GitHub releases instantly.")
    .version(
      await readPackageVersion(),
      "-v, --version",
      "output the version number",
    )
    .helpOption("-h, --help", "display help for command");

  registerReleaseCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error(message);
  process.exitCode = 1;
});
