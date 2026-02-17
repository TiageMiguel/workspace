import { useCachedState, useCachedPromise } from "@raycast/utils";
import { readdirSync } from "fs";
import path from "path";
import { useCallback, useEffect, useState } from "react";

import { Project, App } from "@/types";
import { getGitStatus } from "@/utils/git";
import {
  getStoredWorkspaces,
  getStoredApp,
  getWorkspaceApps,
  getStoredOnboardingCompleted,
  setStoredOnboardingCompleted,
  saveStoredApp,
  saveStoredWorkspaces,
  getStoredPinnedProjects,
  saveStoredPinnedProjects,
  getStoredTerminalApp,
  saveStoredTerminalApp,
} from "@/utils/storage";

export interface UseWorkspaceReturn {
  workspaces: string[];
  projects: Project[] | undefined;
  pinnedProjects: string[];
  defaultApp: App | null;
  terminalApp: App | null;
  workspaceApps: Record<string, App>;
  isLoading: boolean;
  loadData: () => Promise<void>;
  getSubdirectories: (parentPath: string) => Project[];
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  togglePinProject: (projectPath: string) => Promise<void>;
  updateWorkspaces: (newWorkspaces: string[]) => Promise<void>;
  updateDefaultApp: (app: App | null) => Promise<void>;
  updateTerminalApp: (app: App | null) => Promise<void>;
}

export function useWorkspace(): UseWorkspaceReturn {
  const [workspaces, setWorkspaces] = useCachedState<string[]>("workspace-workspaces", []);
  const [pinnedProjects, setPinnedProjects] = useCachedState<string[]>("workspace-pinned-projects", []);
  const [defaultApp, setDefaultApp] = useCachedState<App | null>("default-app", null);
  const [terminalApp, setTerminalApp] = useCachedState<App | null>("terminal-app", null);
  const [workspaceApps, setWorkspaceApps] = useCachedState<Record<string, App>>("workspace-apps", {});
  const [onboardingCompleted, setOnboardingCompleted] = useCachedState<boolean>("onboarding-completed", false);
  const [isLoading, setIsLoading] = useState(true);

  const getSubdirectories = useCallback((parentPath: string): Project[] => {
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
  }, []);

  const { data: projects, isLoading: isProjectsLoading } = useCachedPromise(
    async (workspaces: string[]) => {
      const allProjects = workspaces.flatMap((workspace) => getSubdirectories(workspace));
      const projectsWithStatus = await Promise.all(
        allProjects.map(async (project) => {
          const status = await getGitStatus(project.fullPath);

          return { ...project, gitStatus: status };
        }),
      );

      return projectsWithStatus;
    },
    [workspaces],
    {
      initialData: [],
    },
  );

  const loadData = useCallback(async (): Promise<void> => {
    const [
      storedWorkspaces,
      storedApp,
      storedWorkspaceApps,
      storedOnboardingCompleted,
      storedPinnedProjects,
      storedTerminalApp,
    ] = await Promise.all([
      getStoredWorkspaces(),
      getStoredApp(),
      getWorkspaceApps(),
      getStoredOnboardingCompleted(),
      getStoredPinnedProjects(),
      getStoredTerminalApp(),
    ]);

    setWorkspaces(storedWorkspaces);
    setDefaultApp(storedApp);
    setWorkspaceApps(storedWorkspaceApps);
    setOnboardingCompleted(storedOnboardingCompleted);
    setPinnedProjects(storedPinnedProjects);
    setTerminalApp(storedTerminalApp);
    setIsLoading(false);
  }, [setWorkspaces, setDefaultApp, setWorkspaceApps, setOnboardingCompleted, setPinnedProjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setOnboardingCompletedState = async (completed: boolean): Promise<void> => {
    await setStoredOnboardingCompleted(completed);

    setOnboardingCompleted(completed);
  };

  const togglePinProject = async (projectPath: string): Promise<void> => {
    const newPinned = pinnedProjects.includes(projectPath)
      ? pinnedProjects.filter((path: string) => path !== projectPath)
      : [...pinnedProjects, projectPath];

    await saveStoredPinnedProjects(newPinned);

    setPinnedProjects(newPinned);
  };

  const updateWorkspaces = async (newWorkspaces: string[]): Promise<void> => {
    await saveStoredWorkspaces(newWorkspaces);

    setWorkspaces(newWorkspaces);
  };

  const updateDefaultApp = async (app: App | null): Promise<void> => {
    if (app) {
      await saveStoredApp(app);
    }

    setDefaultApp(app);
  };

  const updateTerminalApp = async (app: App | null): Promise<void> => {
    await saveStoredTerminalApp(app);

    setTerminalApp(app);
  };

  return {
    workspaces,
    projects,
    pinnedProjects,
    defaultApp,
    terminalApp,
    workspaceApps,
    isLoading: isLoading || isProjectsLoading,
    loadData,
    getSubdirectories,
    onboardingCompleted,
    setOnboardingCompleted: setOnboardingCompletedState,
    togglePinProject,
    updateWorkspaces,
    updateDefaultApp,
    updateTerminalApp,
  };
}
