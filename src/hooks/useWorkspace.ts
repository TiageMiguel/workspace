import { useCallback, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { getGitStatus } from "../utils/git";
import {
  getStoredFolders,
  getStoredApp,
  getFolderApps,
  getStoredWalkthroughCompleted,
  setStoredWalkthroughCompleted,
  saveStoredApp,
  saveStoredFolders,
} from "../utils/storage";
import { Project, App, GitStatus } from "../types";
import { readdirSync } from "fs";
import path from "path";

export function useWorkspace() {
  const [folders, setFolders] = useCachedState<string[]>("workspace-folders", []);
  const [defaultApp, setDefaultApp] = useCachedState<App | null>("default-app", null);
  const [folderApps, setFolderApps] = useCachedState<Record<string, App>>("folder-apps", {});
  const [projectGitStatus, setProjectGitStatus] = useCachedState<Record<string, GitStatus | null>>("git-status", {});
  const [walkthroughCompleted, setWalkthroughCompleted] = useCachedState<boolean>("walkthrough-completed", false);
  const [isLoading, setIsLoading] = useCachedState<boolean>("is-loading", true);

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
    // We don't necessarily need to show a spinner if we have cached data,
    // but we should refresh the data in the background.
    const [storedFolders, storedApp, storedFolderApps, storedWalkthroughCompleted] = await Promise.all([
      getStoredFolders(),
      getStoredApp(),
      getFolderApps(),
      getStoredWalkthroughCompleted(),
    ]);

    setFolders(storedFolders);
    setDefaultApp(storedApp);
    setFolderApps(storedFolderApps);
    setWalkthroughCompleted(storedWalkthroughCompleted);

    // Fetch git statuses for updated list
    const allProjects = storedFolders.flatMap((folder) => getSubdirectories(folder));
    fetchGitStatuses(allProjects);
    setIsLoading(false);
  }, [setFolders, setDefaultApp, setFolderApps, setWalkthroughCompleted, setIsLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setWalkthroughCompletedState = async (completed: boolean) => {
    await setStoredWalkthroughCompleted(completed);
    setWalkthroughCompleted(completed);
  };

  // Helper to ensure LocalStorage stays in sync if we use setters from here
  const updateFolders = async (newFolders: string[]) => {
    await saveStoredFolders(newFolders);
    setFolders(newFolders);
  };

  const updateDefaultApp = async (app: App | null) => {
    if (app) await saveStoredApp(app);
    setDefaultApp(app);
  };

  return {
    folders,
    defaultApp,
    folderApps,
    projectGitStatus,
    isLoading,
    loadData,
    getSubdirectories,
    walkthroughCompleted,
    setWalkthroughCompleted: setWalkthroughCompletedState,
    updateFolders,
    updateDefaultApp,
  };
}
