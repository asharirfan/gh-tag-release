import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { CommandError, ReleaseExistsError } from "./errors.js";
import type { Repository } from "./git.js";

const execFileAsync = promisify(execFile);

type CreateReleaseInput = {
  draft: boolean;
  notes: string;
  repository: Repository;
  tag: string;
};

export async function createGitHubReleaseWithGh(input: CreateReleaseInput): Promise<string> {
  const args = [
    "release",
    "create",
    input.tag,
    "--repo",
    `${input.repository.owner}/${input.repository.name}`,
    "--title",
    input.tag,
    "--notes",
    input.notes,
  ];

  if (input.draft) {
    args.push("--draft");
  }

  try {
    const { stdout } = await execFileAsync("gh", args, {
      encoding: "utf8",
    });

    return stdout.trim() || getReleaseUrl(input.repository, input.tag);
  } catch (error) {
    const errorText = getErrorText(error);

    if (isReleaseAlreadyExistsErrorText(errorText)) {
      throw new ReleaseExistsError(getReleaseUrl(input.repository, input.tag));
    }

    if (error instanceof Error) {
      throw new CommandError(`gh release create failed: ${errorText}`);
    }

    throw new CommandError("gh release create failed");
  }
}

export async function createGitHubReleaseWithApi(input: CreateReleaseInput): Promise<string> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new CommandError("GitHub CLI is not authenticated and GITHUB_TOKEN is not set");
  }

  const response = await fetch(
    `https://api.github.com/repos/${input.repository.owner}/${input.repository.name}/releases`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        tag_name: input.tag,
        name: input.tag,
        body: input.notes,
        draft: input.draft,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();

    if (isReleaseAlreadyExistsErrorText(body)) {
      throw new ReleaseExistsError(getReleaseUrl(input.repository, input.tag));
    }

    throw new CommandError(`GitHub API release creation failed: ${body}`);
  }

  const payload = (await response.json()) as { html_url?: string };

  return payload.html_url ?? getReleaseUrl(input.repository, input.tag);
}

export function getReleaseUrl(repository: Repository, tag: string): string {
  return `https://github.com/${repository.owner}/${repository.name}/releases/tag/${tag}`;
}

export function isReleaseAlreadyExistsErrorText(text: string): boolean {
  const normalized = text.toLowerCase();

  return (
    normalized.includes("release.tag_name already exists") ||
    (normalized.includes("already_exists") && normalized.includes("release")) ||
    (normalized.includes("already exists") && normalized.includes("tag_name"))
  );
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    const details = error as Error & {
      stderr?: string;
      stdout?: string;
    };

    return [details.message, details.stderr, details.stdout]
      .filter((value): value is string => Boolean(value))
      .join("\n")
      .trim();
  }

  return "Unknown error";
}
