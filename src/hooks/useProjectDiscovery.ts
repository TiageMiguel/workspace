import { useCachedPromise } from "@raycast/utils";
import { readdir } from "fs/promises";
import path from "path";
import { useCallback } from "react";

import { Project } from "@/types";
import { getGitStatus } from "@/utils/git";

export function useProjectDiscovery(workspaces: string[], showGitStatus: boolean) {
  const {
    data: projects,
    isLoading: isProjectsLoading,
    revalidate,
  } = useCachedPromise(
    async (ws: string[], showGit: boolean) => {
      const allProjects = (await Promise.all(ws.map(getSubdirectories))).flat();
      const projectsWithStatus = [];
      const CHUNK_SIZE = 10;
      for (let i = 0; i < allProjects.length; i += CHUNK_SIZE) {
        const chunk = allProjects.slice(i, i + CHUNK_SIZE);
        const chunkResults = await Promise.all(
          chunk.map(async (project) => {
            if (!showGit) {
              return { ...project, gitStatus: null };
            }
            const status = await getGitStatus(project.fullPath);
            return { ...project, gitStatus: status };
          }),
        );
        projectsWithStatus.push(...chunkResults);
      }

      return projectsWithStatus as Project[];
    },
    [workspaces, showGitStatus],
    {
      initialData: [],
    },
  );

  const loadData = useCallback(async (): Promise<void> => {
    revalidate();
  }, [revalidate]);

  return {
    isLoading: isProjectsLoading,
    loadData,
    projects,
  };
}

async function getSubdirectories(parentPath: string): Promise<Project[]> {
  try {
    const entries = await readdir(parentPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => ({
        fullPath: path.join(parentPath, entry.name),
        name: entry.name,
        parentFolder: parentPath,
      }));
  } catch {
    return [];
  }
}
