import { spawn } from "node:child_process";

import { CommandError } from "./errors.js";

export async function openUrl(url: string): Promise<void> {
  const { command, args } = getOpenCommand(url);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: process.platform !== "win32",
    });

    child.on("error", (error) => {
      reject(new CommandError(`Failed to open browser: ${error.message}`));
    });

    child.on("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function getOpenCommand(url: string): { args: string[]; command: string } {
  if (process.platform === "darwin") {
    return { command: "open", args: [url] };
  }

  if (process.platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }

  return { command: "xdg-open", args: [url] };
}
