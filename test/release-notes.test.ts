import { describe, expect, it } from "vitest";

import type { Commit } from "../src/lib/git.js";
import {
  buildReleaseNotes,
  formatCommitsForPreview,
} from "../src/lib/release-notes.js";

describe("buildReleaseNotes", () => {
  it("groups conventional commits by section", () => {
    const commits: Commit[] = [
      { hash: "a1b2c3d", message: "feat: add release command" },
      { hash: "d4e5f6g", message: "fix: handle empty tag list" },
      { hash: "h7i8j9k", message: "docs: update readme" },
    ];

    expect(buildReleaseNotes(commits)).toBe(
      [
        "Features",
        "",
        "- add release command (a1b2c3d)",
        "",
        "Fixes",
        "",
        "- handle empty tag list (d4e5f6g)",
        "",
        "Documentation",
        "",
        "- update readme (h7i8j9k)",
      ].join("\n"),
    );
  });

  it("falls back to Other for unknown commit types", () => {
    const commits: Commit[] = [
      { hash: "abc1234", message: "build: update lockfile" },
    ];

    expect(buildReleaseNotes(commits)).toBe("Other\n\n- update lockfile (abc1234)");
  });
});

describe("formatCommitsForPreview", () => {
  it("renders previous tag heading when available", () => {
    expect(
      formatCommitsForPreview(
        [{ hash: "abc1234", message: "feat: add release notes" }],
        "v0.0.1",
      ),
    ).toBe("Commits since v0.0.1\n\n- feat: add release notes");
  });

  it("renders initial release heading without previous tag", () => {
    expect(formatCommitsForPreview([], null)).toBe("Commits in initial release\n\n- No commits found");
  });
});
