import { useState, useCallback, useEffect } from "react";
import { getGitStatus } from "../utils/git";
import { getStoredFolders, getStoredApp, getFolderApps } from "../utils/storage";
import { Project, App, GitStatus } from "../types";
import { readdirSync } from "fs";
import path from "path";

export function useWorkspace() {
  const [folders, setFolders] = useState<string[]>([]);
  const [defaultApp, setDefaultApp] = useState<App | null>(null);
  const [folderApps, setFolderApps] = useState<Record<string, App>>({});
  const [projectGitStatus, setProjectGitStatus] = useState<Record<string, GitStatus | null>>({});
  const [isLoading, setIsLoading] = useState(true);

  const getSubdirectories = (parentPath: string): Project[] => {
    try {
      const entries = readdirSync(parentPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => ({
          name: entry.name,
          fullPath: path.join(parentPath, entry.name),
          parentFolder: parentPath,
        }));
    } catch {
      return [];
    }
  };

  const fetchGitStatuses = async (projects: Project[]) => {
    const statusMap: Record<string, GitStatus | null> = {};
    await Promise.all(
      projects.map(async (p) => {
        const status = await getGitStatus(p.fullPath);
        statusMap[p.fullPath] = status;
      }),
    );
    setProjectGitStatus((prev) => ({ ...prev, ...statusMap }));
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [storedFolders, storedApp, storedFolderApps] = await Promise.all([
      getStoredFolders(),
      getStoredApp(),
      getFolderApps(),
    ]);

    setFolders(storedFolders);
    setDefaultApp(storedApp);
    setFolderApps(storedFolderApps);

    // Fetch git statuses
    const allProjects = storedFolders.flatMap((folder) => getSubdirectories(folder));
    fetchGitStatuses(allProjects);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    folders,
    defaultApp,
    folderApps,
    projectGitStatus,
    isLoading,
    loadData,
    getSubdirectories,
  };
}
