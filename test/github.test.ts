import { describe, expect, it } from "vitest";

import { parseGitHubRemote } from "../src/lib/git.js";
import { getReleaseUrl, isReleaseAlreadyExistsErrorText } from "../src/lib/github.js";

describe("parseGitHubRemote", () => {
  it("parses ssh remotes", () => {
    expect(parseGitHubRemote("git@github.com:openai/gh-tag-release.git")).toEqual({
      owner: "openai",
      name: "gh-tag-release",
    });
  });

  it("parses https remotes", () => {
    expect(parseGitHubRemote("https://github.com/openai/gh-tag-release.git")).toEqual({
      owner: "openai",
      name: "gh-tag-release",
    });
  });

  it("returns null for unsupported remotes", () => {
    expect(parseGitHubRemote("git@gitlab.com:openai/gh-tag-release.git")).toBeNull();
  });
});

describe("getReleaseUrl", () => {
  it("builds the GitHub release URL for a tag", () => {
    expect(
      getReleaseUrl(
        {
          owner: "openai",
          name: "gh-tag-release",
        },
        "v0.0.1",
      ),
    ).toBe("https://github.com/openai/gh-tag-release/releases/tag/v0.0.1");
  });
});

describe("isReleaseAlreadyExistsErrorText", () => {
  it("matches gh cli duplicate-release output", () => {
    expect(
      isReleaseAlreadyExistsErrorText(
        "HTTP 422: Validation Failed\nRelease.tag_name already exists",
      ),
    ).toBe(true);
  });

  it("matches GitHub API duplicate-release payloads", () => {
    expect(
      isReleaseAlreadyExistsErrorText(
        '{"errors":[{"resource":"Release","code":"already_exists","field":"tag_name"}]}',
      ),
    ).toBe(true);
  });

  it("ignores unrelated failures", () => {
    expect(isReleaseAlreadyExistsErrorText("authentication failed")).toBe(false);
  });
});
