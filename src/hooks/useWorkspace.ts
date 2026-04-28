import { useCachedPromise, useCachedState } from "@raycast/utils";
import { readdir } from "fs/promises";
import path from "path";
import { useCallback } from "react";

import { App, Project } from "@/types";
import {
  STORAGE_KEY_APP,
  STORAGE_KEY_ONBOARDING_COMPLETED,
  STORAGE_KEY_PINNED_PROJECTS,
  STORAGE_KEY_SHOW_FZF_STATUS,
  STORAGE_KEY_SHOW_GIT_STATUS,
  STORAGE_KEY_TERMINAL_APP,
  STORAGE_KEY_WORKSPACE_APPS,
  STORAGE_KEY_WORKSPACES,
} from "@/utils/constants";
import { getFzfPath, isFzfAvailable } from "@/utils/fzf";
import { getGitStatus, isGitAvailable } from "@/utils/git";
import {
  saveStoredApp,
  saveStoredPinnedProjects,
  saveStoredShowFzfStatus,
  saveStoredShowGitStatus,
  saveStoredTerminalApp,
  saveStoredWorkspaces,
  saveWorkspaceApps,
  setStoredOnboardingCompleted,
} from "@/utils/storage";
export interface UseWorkspaceReturn {
  defaultApp: App | null;
  fzfAvailable: boolean | null;
  fzfPath: null | string;
  gitAvailable: boolean | null;
  isLoading: boolean;
  loadData: () => Promise<void>;
  onboardingCompleted: boolean;
  pinnedProjects: string[];
  projects: Project[] | undefined;
  reorderPinnedProject: (projectPath: string, direction: "down" | "up") => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  showFzfStatus: boolean;
  showGitStatus: boolean;
  terminalApp: App | null;
  togglePinProject: (projectPath: string) => Promise<void>;
  updateDefaultApp: (app: App | null) => Promise<void>;
  updatePinnedProjects: (projects: string[]) => Promise<void>;
  updateShowFzfStatus: (show: boolean) => Promise<void>;
  updateShowGitStatus: (show: boolean) => Promise<void>;
  updateTerminalApp: (app: App | null) => Promise<void>;
  updateWorkspaceApps: (newWorkspaceApps: Record<string, App>) => Promise<void>;
  updateWorkspaces: (newWorkspaces: string[]) => Promise<void>;
  workspaceApps: Record<string, App>;
  workspaces: string[];
}

export function useWorkspace(): UseWorkspaceReturn {
  const [workspaces, setWorkspaces] = useCachedState<string[]>(STORAGE_KEY_WORKSPACES, []);
  const [pinnedProjects, setPinnedProjects] = useCachedState<string[]>(STORAGE_KEY_PINNED_PROJECTS, []);
  const [defaultApp, setDefaultApp] = useCachedState<App | null>(STORAGE_KEY_APP, null);
  const [showFzfStatus, setShowFzfStatus] = useCachedState<boolean>(STORAGE_KEY_SHOW_FZF_STATUS, true);
  const [showGitStatus, setShowGitStatus] = useCachedState<boolean>(STORAGE_KEY_SHOW_GIT_STATUS, true);
  const [terminalApp, setTerminalApp] = useCachedState<App | null>(STORAGE_KEY_TERMINAL_APP, null);
  const [workspaceApps, setWorkspaceApps] = useCachedState<Record<string, App>>(STORAGE_KEY_WORKSPACE_APPS, {});
  const [onboardingCompleted, setOnboardingCompleted] = useCachedState<boolean>(
    STORAGE_KEY_ONBOARDING_COMPLETED,
    false,
  );

  const { data: gitAvailable } = useCachedPromise(async () => {
    return await isGitAvailable();
  }, []);

  const { data: fzfInfo } = useCachedPromise(async () => {
    const available = await isFzfAvailable();
    const path = await getFzfPath();

    return { available, path };
  }, []);

  const { data: projects, isLoading: isProjectsLoading } = useCachedPromise(
    async (ws: string[], showGit: boolean) => {
      const allProjects = (await Promise.all(ws.map(getSubdirectories))).flat();
      const projectsWithStatus = await Promise.all(
        allProjects.map(async (project) => {
          if (!showGit) {
            return { ...project, gitStatus: null };
          }

          const status = await getGitStatus(project.fullPath);

          return { ...project, gitStatus: status };
        }),
      );

      return projectsWithStatus;
    },
    [workspaces, showGitStatus],
    {
      initialData: [],
    },
  );

  const loadData = useCallback(async (): Promise<void> => {
    // No-op as useCachedState handles persistence automatically
  }, []);

  const setOnboardingCompletedState = async (completed: boolean): Promise<void> => {
    await setStoredOnboardingCompleted(completed);

    setOnboardingCompleted(completed);
  };

  const togglePinProject = async (projectPath: string): Promise<void> => {
    const newPinned = pinnedProjects.includes(projectPath)
      ? pinnedProjects.filter((p: string) => p !== projectPath)
      : [...pinnedProjects, projectPath];

    setPinnedProjects(newPinned);
  };

  const reorderPinnedProject = async (projectPath: string, direction: "down" | "up"): Promise<void> => {
    const index = pinnedProjects.indexOf(projectPath);
    if (index === -1) return;

    const newPinned = [...pinnedProjects];
    if (direction === "up" && index > 0) {
      [newPinned[index], newPinned[index - 1]] = [newPinned[index - 1], newPinned[index]];
    } else if (direction === "down" && index < newPinned.length - 1) {
      [newPinned[index], newPinned[index + 1]] = [newPinned[index + 1], newPinned[index]];
    } else {
      return;
    }

    setPinnedProjects(newPinned);
  };

  const updateWorkspaces = async (newWorkspaces: string[]): Promise<void> => {
    await saveStoredWorkspaces(newWorkspaces);

    setWorkspaces(newWorkspaces);
  };

  const updateDefaultApp = async (app: App | null): Promise<void> => {
    await saveStoredApp(app);

    setDefaultApp(app);
  };

  const updatePinnedProjects = async (projects: string[]): Promise<void> => {
    await saveStoredPinnedProjects(projects);

    setPinnedProjects(projects);
  };

  const updateShowFzfStatus = async (show: boolean): Promise<void> => {
    await saveStoredShowFzfStatus(show);

    setShowFzfStatus(show);
  };

  const updateShowGitStatus = async (show: boolean): Promise<void> => {
    await saveStoredShowGitStatus(show);

    setShowGitStatus(show);
  };

  const updateTerminalApp = async (app: App | null): Promise<void> => {
    await saveStoredTerminalApp(app);

    setTerminalApp(app);
  };

  const updateWorkspaceApps = async (newWorkspaceApps: Record<string, App>): Promise<void> => {
    await saveWorkspaceApps(newWorkspaceApps);

    setWorkspaceApps(newWorkspaceApps);
  };

  return {
    defaultApp,
    fzfAvailable: fzfInfo?.available ?? null,
    fzfPath: fzfInfo?.path ?? null,
    gitAvailable: gitAvailable ?? null,
    isLoading: isProjectsLoading,
    loadData,
    onboardingCompleted,
    pinnedProjects,
    projects,
    reorderPinnedProject,
    setOnboardingCompleted: setOnboardingCompletedState,
    showFzfStatus,
    showGitStatus,
    terminalApp,
    togglePinProject,
    updateDefaultApp,
    updatePinnedProjects,
    updateShowFzfStatus,
    updateShowGitStatus,
    updateTerminalApp,
    updateWorkspaceApps,
    updateWorkspaces,
    workspaceApps,
    workspaces,
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
