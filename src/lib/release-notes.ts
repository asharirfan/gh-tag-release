import type { Commit } from "./git.js";

const SECTION_TITLES: Record<string, string> = {
  feat: "Features",
  fix: "Fixes",
  docs: "Documentation",
  chore: "Misc",
  refactor: "Refactors",
  perf: "Performance",
  test: "Tests",
};

export function buildReleaseNotes(commits: Commit[]): string {
  if (commits.length === 0) {
    return "No commits found for this release.";
  }

  const grouped = new Map<string, string[]>();

  for (const commit of commits) {
    const type = getCommitType(commit.message);
    const title = SECTION_TITLES[type] ?? "Other";
    const cleanedMessage = normalizeCommitMessage(commit.message, type);
    const entry = `- ${cleanedMessage} (${commit.hash})`;
    const section = grouped.get(title) ?? [];
    section.push(entry);
    grouped.set(title, section);
  }

  return Array.from(grouped.entries())
    .map(([section, entries]) => `${section}\n\n${entries.join("\n")}`)
    .join("\n\n");
}

export function formatCommitsForPreview(commits: Commit[], previousTag: string | null): string {
  const heading = previousTag ? `Commits since ${previousTag}` : "Commits in initial release";

  if (commits.length === 0) {
    return `${heading}\n\n- No commits found`;
  }

  return `${heading}\n\n${commits.map((commit) => `- ${commit.message}`).join("\n")}`;
}

function getCommitType(message: string): string {
  const match = message.match(/^([a-z]+)(?:\(.+\))?!?:/i);
  return match?.[1]?.toLowerCase() ?? "other";
}

function normalizeCommitMessage(message: string, type: string): string {
  const prefix = new RegExp(`^${type}(?:\\(.+\\))?!?:\\s*`, "i");
  return message.replace(prefix, "").trim();
}
