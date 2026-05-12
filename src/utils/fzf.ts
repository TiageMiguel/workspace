import { exec, spawnSync } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";

import { Project } from "@/types";

const execAsync = promisify(exec);

const FZF_TIMEOUT_MS = 2_000;
const COMMON_FZF_PATHS = ["/opt/homebrew/bin/fzf", "/usr/local/bin/fzf", "/usr/bin/fzf"];

let fzfPathCache: null | string | undefined = undefined;

export function fuzzySearch(projects: Project[], searchText: string, fzfPath: string): Project[] {
  if (!searchText) return projects;

  try {
    // Use an index-based approach to match only on name,
    // while still being able to map back to the project object.
    const input = projects.map((p, index) => `${index}\t${p.name}`).join("\n");

    const result = spawnSync(fzfPath, ["-f", searchText, "--nth=2..", "--delimiter=\t"], {
      encoding: "utf-8",
      input,
      timeout: FZF_TIMEOUT_MS,
    });

    if (result.status === 0 && result.stdout) {
      const matchedLines = result.stdout.trim().split("\n");
      const matchedIndexes = matchedLines
        .map((line) => {
          const firstTab = line.indexOf("\t");
          if (firstTab === -1) return null;
          const index = parseInt(line.substring(0, firstTab), 10);
          return isNaN(index) ? null : index;
        })
        .filter((index): index is number => index !== null);

      return matchedIndexes.map((index) => projects[index]).filter(Boolean);
    }
  } catch (error) {
    console.error("fzf search error:", error);
  }

  return [];
}

export async function getFzfPath(): Promise<null | string> {
  if (fzfPathCache !== undefined) {
    return fzfPathCache;
  }

  for (const p of COMMON_FZF_PATHS) {
    if (existsSync(p)) {
      fzfPathCache = p;

      return p;
    }
  }

  try {
    const { stdout } = await execAsync("which fzf", { timeout: FZF_TIMEOUT_MS });
    const path = stdout.trim();

    if (path) {
      fzfPathCache = path;

      return path;
    }
  } catch {
    fzfPathCache = null;

    return null;
  }

  try {
    await execAsync("fzf --version", { timeout: FZF_TIMEOUT_MS });
    fzfPathCache = "fzf";

    return "fzf";
  } catch {
    fzfPathCache = null;

    return null;
  }
}

export async function isFzfAvailable(): Promise<boolean> {
  const path = await getFzfPath();

  return path !== null;
}
