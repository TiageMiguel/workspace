import { exec } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { promisify } from "util";

import { GitStatus } from "@/types";

const execAsync = promisify(exec);

const GIT_TIMEOUT_MS = 5_000;

let gitAvailableCache: boolean | null = null;

export async function isGitAvailable(): Promise<boolean> {
  if (gitAvailableCache !== null) {
    return gitAvailableCache;
  }

  try {
    await execAsync("git --version", { timeout: GIT_TIMEOUT_MS });
    gitAvailableCache = true;
  } catch {
    gitAvailableCache = false;
  }

  return gitAvailableCache;
}

// Single shell invocation gets branch + ahead/behind in one process spawn
const GIT_STATUS_COMMAND = `
branch=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null);
counts=$(git rev-list --left-right --count HEAD...@{u} 2>/dev/null || echo "0 0");
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ');
echo "$branch";
echo "$counts";
echo "$dirty"
`.trim();

export async function checkoutGitBranch(repoPath: string, branch: string): Promise<boolean> {
  if (!(await isGitAvailable())) return false;

  try {
    await execAsync(`git checkout ${branch}`, { cwd: repoPath, timeout: GIT_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

export async function getCommitLog(repoPath: string): Promise<import("@/types").GitCommit[]> {
  if (!(await isGitAvailable())) return [];

  try {
    // Format: Hash|AuthorName|RelativeTime|Subject
    const { stdout } = await execAsync('git log -n 50 --pretty=format:"%H|%an|%ar|%s"', {
      cwd: repoPath,
      timeout: GIT_TIMEOUT_MS,
    });

    return stdout
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [hash, author, relativeTime, ...messageParts] = line.split("|");
        return {
          author: author || "Unknown",
          hash: hash || "",
          message: messageParts.join("|") || "",
          relativeTime: relativeTime || "",
        };
      });
  } catch {
    return [];
  }
}

export async function getGitStatus(repoPath: string): Promise<GitStatus | null> {
  if (!(await isGitAvailable())) {
    return null;
  }

  const gitDir = path.join(repoPath, ".git");
  if (!existsSync(gitDir)) {
    return null;
  }

  try {
    const { stdout } = await execAsync(GIT_STATUS_COMMAND, {
      cwd: repoPath,
      encoding: "utf8",
      shell: "/bin/sh",
      timeout: GIT_TIMEOUT_MS,
    });

    const lines = stdout.trim().split("\n");
    const branchName = lines[0]?.trim();

    if (!branchName) {
      return null;
    }

    const [ahead, behind] = (lines[1]?.trim().split(/\s+/) || []).map(Number);
    const dirty = parseInt(lines[2]?.trim() || "0", 10) || 0;

    return {
      branch: branchName,
      dirty,
      pull: behind || 0,
      push: ahead || 0,
    };
  } catch {
    return null;
  }
}

export async function getLocalBranches(repoPath: string): Promise<string[]> {
  if (!(await isGitAvailable())) return [];

  try {
    const { stdout } = await execAsync('git branch --format="%(refname:short)"', {
      cwd: repoPath,
      timeout: GIT_TIMEOUT_MS,
    });
    return stdout
      .split("\n")
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
  } catch {
    return [];
  }
}

export async function getRemoteUrl(repoPath: string): Promise<null | string> {
  if (!(await isGitAvailable())) return null;

  try {
    const { stdout } = await execAsync("git config --get remote.origin.url", {
      cwd: repoPath,
      timeout: GIT_TIMEOUT_MS,
    });

    const url = stdout.trim();
    if (!url) return null;

    if (url.startsWith("git@")) {
      const parts = url.split(":");
      if (parts.length === 2) {
        const domain = parts[0].replace("git@", "");
        const path = parts[1].replace(/\.git$/, "");
        return `https://${domain}/${path}`;
      }
    }

    if (url.startsWith("https://") || url.startsWith("http://")) {
      return url.replace(/\.git$/, "");
    }

    return null;
  } catch {
    return null;
  }
}

export async function pullGitBranch(repoPath: string): Promise<boolean> {
  if (!(await isGitAvailable())) return false;

  try {
    await execAsync("git pull", { cwd: repoPath, timeout: GIT_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}
