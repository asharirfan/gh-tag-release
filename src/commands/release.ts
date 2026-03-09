import type { Command } from "commander";
import ora from "ora";

import { printBanner } from "../lib/banner.js";
import { openUrl } from "../lib/browser.js";
import { CommandError, ReleaseExistsError } from "../lib/errors.js";
import {
  getCommitsForRelease,
  getRepository,
  getTagContext,
  hasGhCli,
  isGhAuthenticated,
} from "../lib/git.js";
import {
  createGitHubReleaseWithApi,
  createGitHubReleaseWithGh,
  getReleaseUrl,
} from "../lib/github.js";
import { buildReleaseNotes, formatCommitsForPreview } from "../lib/release-notes.js";

type ReleaseOptions = {
  draft?: boolean;
  dryRun?: boolean;
  latest?: boolean;
  open?: boolean;
  tag?: string;
};

export function registerReleaseCommand(program: Command): void {
  program
    .option("--draft", "create a draft release")
    .option("--tag <tag>", "create a release for a specific tag")
    .option("--latest", "use the latest tag in the repository")
    .option("--dry-run", "preview the release without publishing it")
    .option("--open", "open the release page after publishing")
    .action(async (options: ReleaseOptions) => {
      await runRelease(options);
    });
}

async function runRelease(options: ReleaseOptions): Promise<void> {
  printBanner();

  const inspectSpinner = ora("Inspecting git repository").start();
  let publishSpinner: ReturnType<typeof ora> | null = null;

  try {
    const repository = await getRepository();
    const tagContext = await getTagContext({
      requestedTag: options.tag,
      preferLatest: options.latest ?? false,
    });
    const commits = await getCommitsForRelease(tagContext);
    const releaseNotes = buildReleaseNotes(commits);
    const releaseUrl = getReleaseUrl(repository, tagContext.targetTag);

    inspectSpinner.stop();

    console.log(`Repository: ${repository.owner}/${repository.name}`);
    console.log(`Detected tag: ${tagContext.targetTag}`);
    console.log("");
    console.log(formatCommitsForPreview(commits, tagContext.previousTag));
    console.log("");

    if (options.dryRun) {
      console.log("Dry run");
      console.log("");
      console.log(`Title: ${tagContext.targetTag}`);
      console.log(`URL: ${releaseUrl}`);
      console.log("");
      console.log(releaseNotes);
      return;
    }

    publishSpinner = ora("Creating GitHub release").start();

    const ghAvailable = await hasGhCli();
    const ghAuthenticated = ghAvailable ? await isGhAuthenticated() : false;

    let url = releaseUrl;

    if (ghAvailable && ghAuthenticated) {
      url = await createGitHubReleaseWithGh({
        draft: options.draft ?? false,
        notes: releaseNotes,
        repository,
        tag: tagContext.targetTag,
      });
    } else {
      url = await createGitHubReleaseWithApi({
        draft: options.draft ?? false,
        notes: releaseNotes,
        repository,
        tag: tagContext.targetTag,
      });
    }

    publishSpinner.succeed(url);

    if (options.open) {
      await openUrl(url);
    }
  } catch (error) {
    if (error instanceof ReleaseExistsError) {
      if (publishSpinner) {
        publishSpinner.warn(error.message);
      } else {
        inspectSpinner.warn(error.message);
      }

      if (options.open) {
        await openUrl(error.url);
      }

      return;
    }

    if (publishSpinner) {
      publishSpinner.fail("Release failed");
    } else {
      inspectSpinner.fail("Release failed");
    }

    throw normalizeError(error);
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof CommandError) {
    return error;
  }

  if (error instanceof Error) {
    return new CommandError(error.message);
  }

  return new CommandError("Unexpected error");
}
