import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { CommandError } from "./errors.js";

const execFileAsync = promisify(execFile);

export type Repository = {
  name: string;
  owner: string;
};

export type Commit = {
  hash: string;
  message: string;
};

export type TagContext = {
  previousTag: string | null;
  targetTag: string;
};

type GetTagContextInput = {
  preferLatest: boolean;
  requestedTag?: string;
};

export async function getRepository(): Promise<Repository> {
  const remoteUrl = await runGit(["remote", "get-url", "origin"]);
  const parsed = parseGitHubRemote(remoteUrl.trim());

  if (!parsed) {
    throw new CommandError("Could not determine GitHub repository from git remote origin");
  }

  return parsed;
}

export async function getTagContext(input: GetTagContextInput): Promise<TagContext> {
  const tags = await listTags();

  if (tags.length === 0) {
    throw new CommandError("No git tags found");
  }

  const targetTag = input.requestedTag ?? tags[0];

  if (!tags.includes(targetTag)) {
    throw new CommandError(`Tag not found: ${targetTag}`);
  }

  const targetIndex = tags.indexOf(targetTag);
  const previousTag = tags[targetIndex + 1] ?? null;

  return {
    previousTag,
    targetTag,
  };
}

export async function getCommitsForRelease(tagContext: TagContext): Promise<Commit[]> {
  const range = tagContext.previousTag
    ? `${tagContext.previousTag}..${tagContext.targetTag}`
    : tagContext.targetTag;

  const output = await runGit([
    "log",
    "--pretty=format:%s%x09%h",
    range,
  ]);

  if (!output.trim()) {
    return [];
  }

  return output
    .trim()
    .split("\n")
    .map((line) => {
      const [message, hash] = line.split("\t");

      return {
        hash,
        message,
      };
    });
}

export async function hasGhCli(): Promise<boolean> {
  try {
    await runCommand("gh", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function isGhAuthenticated(): Promise<boolean> {
  try {
    await runCommand("gh", ["auth", "status"]);
    return true;
  } catch {
    return false;
  }
}

export async function runGit(args: string[]): Promise<string> {
  try {
    return await runCommand("git", args);
  } catch (error) {
    if (error instanceof Error) {
      throw new CommandError(error.message);
    }

    throw new CommandError("Git command failed");
  }
}

async function listTags(): Promise<string[]> {
  const output = await runGit(["tag", "--sort=-version:refname"]);

  return output
    .trim()
    .split("\n")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function runCommand(command: string, args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync(command, args, {
    encoding: "utf8",
  });

  if (stderr && stderr.trim()) {
    return stdout;
  }

  return stdout;
}

export function parseGitHubRemote(remoteUrl: string): Repository | null {
  const sshMatch = remoteUrl.match(/^git@github\.com:(?<owner>[^/]+)\/(?<repo>.+?)(?:\.git)?$/);
  if (sshMatch?.groups) {
    return {
      owner: sshMatch.groups.owner,
      name: sshMatch.groups.repo,
    };
  }

  const httpsMatch = remoteUrl.match(
    /^https:\/\/github\.com\/(?<owner>[^/]+)\/(?<repo>.+?)(?:\.git)?$/,
  );
  if (httpsMatch?.groups) {
    return {
      owner: httpsMatch.groups.owner,
      name: httpsMatch.groups.repo,
    };
  }

  return null;
}
