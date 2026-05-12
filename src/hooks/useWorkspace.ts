import { showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { readdir } from "fs/promises";
import path from "path";
import { useCallback, useEffect } from "react";

import { App, ExportedSettings, Project, RecentProject } from "@/types";
import {
  DEFAULT_RECENT_PROJECTS_COUNT,
  STORAGE_KEY_APP,
  STORAGE_KEY_ONBOARDING_COMPLETED,
  STORAGE_KEY_PINNED_PROJECTS,
  STORAGE_KEY_RECENT_PROJECTS,
  STORAGE_KEY_RECENT_PROJECTS_COUNT,
  STORAGE_KEY_SHOW_FZF_STATUS,
  STORAGE_KEY_SHOW_GIT_STATUS,
  STORAGE_KEY_SHOW_RECENT_PROJECTS,
  STORAGE_KEY_TERMINAL_APP,
  STORAGE_KEY_VIEW_MODE,
  STORAGE_KEY_WORKSPACE_APPS,
  STORAGE_KEY_WORKSPACES,
} from "@/utils/constants";
import { getFzfPath, isFzfAvailable } from "@/utils/fzf";
import { getGitStatus, isGitAvailable } from "@/utils/git";

export interface UseWorkspaceReturn {
  applyImportedSettings: (settings: ExportedSettings) => Promise<void>;
  defaultApp: App | null;
  fzfAvailable: boolean | null;
  fzfPath: null | string;
  gitAvailable: boolean | null;
  isLoading: boolean;
  loadData: () => Promise<void>;
  onboardingCompleted: boolean;
  pinnedProjects: string[];
  projects: Project[] | undefined;
  recentProjects: RecentProject[];
  recentProjectsCount: number;
  recordProjectOpen: (projectPath: string) => Promise<void>;
  reorderPinnedProject: (projectPath: string, direction: "down" | "up") => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  showFzfStatus: boolean;
  showGitStatus: boolean;
  showRecentProjects: boolean;
  terminalApp: App | null;
  togglePinProject: (projectPath: string) => Promise<void>;
  toggleViewMode: () => Promise<void>;
  updateDefaultApp: (app: App | null) => Promise<void>;
  updatePinnedProjects: (projects: string[]) => Promise<void>;
  updateRecentProjects: (projects: RecentProject[]) => Promise<void>;
  updateRecentProjectsCount: (count: number) => Promise<void>;
  updateShowFzfStatus: (show: boolean) => Promise<void>;
  updateShowGitStatus: (show: boolean) => Promise<void>;
  updateShowRecentProjects: (show: boolean) => Promise<void>;
  updateTerminalApp: (app: App | null) => Promise<void>;
  updateViewMode: (mode: "grid" | "list") => Promise<void>;
  updateWorkspaceApps: (newWorkspaceApps: Record<string, App>) => Promise<void>;
  updateWorkspaces: (newWorkspaces: string[]) => Promise<void>;
  viewMode: "grid" | "list";
  workspaceApps: Record<string, App>;
  workspaces: string[];
}

export function useWorkspace(): UseWorkspaceReturn {
  const [workspaces, setWorkspaces] = useCachedState<string[]>(STORAGE_KEY_WORKSPACES, []);
  const [pinnedProjects, setPinnedProjects] = useCachedState<string[]>(STORAGE_KEY_PINNED_PROJECTS, []);
  const [defaultApp, setDefaultApp] = useCachedState<App | null>(STORAGE_KEY_APP, null);
  const [showFzfStatus, setShowFzfStatus] = useCachedState<boolean>(STORAGE_KEY_SHOW_FZF_STATUS, true);
  const [showGitStatus, setShowGitStatus] = useCachedState<boolean>(STORAGE_KEY_SHOW_GIT_STATUS, true);
  const [showRecentProjects, setShowRecentProjects] = useCachedState<boolean>(STORAGE_KEY_SHOW_RECENT_PROJECTS, false);
  const [recentProjects, setRecentProjects] = useCachedState<RecentProject[]>(STORAGE_KEY_RECENT_PROJECTS, []);
  const [recentProjectsCount, setRecentProjectsCount] = useCachedState<number>(
    STORAGE_KEY_RECENT_PROJECTS_COUNT,
    DEFAULT_RECENT_PROJECTS_COUNT,
  );
  const [terminalApp, setTerminalApp] = useCachedState<App | null>(STORAGE_KEY_TERMINAL_APP, null);
  const [workspaceApps, setWorkspaceApps] = useCachedState<Record<string, App>>(STORAGE_KEY_WORKSPACE_APPS, {});
  const [onboardingCompleted, setOnboardingCompleted] = useCachedState<boolean>(
    STORAGE_KEY_ONBOARDING_COMPLETED,
    false,
  );
  const [viewMode, setViewMode] = useCachedState<"grid" | "list">(STORAGE_KEY_VIEW_MODE, "list");

  const { data: gitAvailable } = useCachedPromise(async () => {
    return await isGitAvailable();
  }, []);

  const { data: fzfInfo } = useCachedPromise(async () => {
    const available = await isFzfAvailable();
    const path = await getFzfPath();

    return { available, path };
  }, []);

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

      return projectsWithStatus;
    },
    [workspaces, showGitStatus],
    {
      initialData: [],
    },
  );

  const loadData = useCallback(async (): Promise<void> => {
    revalidate();
  }, [revalidate]);

  const setOnboardingCompletedState = async (completed: boolean): Promise<void> => {
    setOnboardingCompleted(completed);
  };

  const togglePinProject = async (projectPath: string): Promise<void> => {
    let newPinned: string[];
    if (pinnedProjects.includes(projectPath)) {
      newPinned = pinnedProjects.filter((p: string) => p !== projectPath);
    } else {
      newPinned = [...pinnedProjects, projectPath];

      // Remove from recent projects if it was pinned
      const newRecent = recentProjects.filter((r) => r.path !== projectPath);
      if (newRecent.length !== recentProjects.length) {
        setRecentProjects(newRecent);
      }
    }

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

  const toggleViewMode = async (): Promise<void> => {
    setViewMode(viewMode === "grid" ? "list" : "grid");
  };

  const updateViewMode = async (mode: "grid" | "list"): Promise<void> => {
    setViewMode(mode);
  };

  const updateWorkspaces = async (newWorkspaces: string[]): Promise<void> => {
    setWorkspaces(newWorkspaces);
  };

  const updateDefaultApp = async (app: App | null): Promise<void> => {
    setDefaultApp(app);
  };

  const updatePinnedProjects = async (projects: string[]): Promise<void> => {
    setPinnedProjects(projects);
  };

  const updateShowFzfStatus = async (show: boolean): Promise<void> => {
    setShowFzfStatus(show);
  };

  const updateShowGitStatus = async (show: boolean): Promise<void> => {
    setShowGitStatus(show);
  };

  const updateTerminalApp = async (app: App | null): Promise<void> => {
    setTerminalApp(app);
  };

  const updateWorkspaceApps = async (newWorkspaceApps: Record<string, App>): Promise<void> => {
    setWorkspaceApps(newWorkspaceApps);
  };

  const updateShowRecentProjects = async (show: boolean): Promise<void> => {
    setShowRecentProjects(show);
  };

  const updateRecentProjects = async (newRecent: RecentProject[]): Promise<void> => {
    setRecentProjects(newRecent);
  };

  const updateRecentProjectsCount = async (count: number): Promise<void> => {
    setRecentProjectsCount(count);
  };

  const recordProjectOpen = async (projectPath: string): Promise<void> => {
    if (pinnedProjects.includes(projectPath)) {
      return;
    }

    const now = Date.now();
    const filtered = recentProjects.filter((r) => r.path !== projectPath);
    const updated = [{ lastOpened: now, path: projectPath }, ...filtered].slice(0, recentProjectsCount);

    setRecentProjects(updated);
  };

  const applyImportedSettings = async (settings: ExportedSettings): Promise<void> => {
    await updateDefaultApp(settings.defaultApp);
    await updateTerminalApp(settings.terminalApp);
    await updateWorkspaces(settings.workspaces);
    await updateWorkspaceApps(settings.workspaceApps);
    await updatePinnedProjects(settings.pinnedProjects);
    await updateShowGitStatus(settings.showGitStatus);
    await updateShowFzfStatus(settings.showFzfStatus);
    await updateShowRecentProjects(settings.showRecentProjects);
    await updateRecentProjects(settings.recentProjects);
    await updateRecentProjectsCount(settings.recentProjectsCount);
    await updateViewMode(settings.viewMode);
    await setOnboardingCompletedState(settings.onboardingCompleted);
  };

  // Stale pin/recent cleanup: prune entries that no longer exist in the project list
  useEffect(() => {
    if (!projects || projects.length === 0) return;

    const projectPaths = new Set(projects.map((p) => p.fullPath));

    if (pinnedProjects.length > 0) {
      const stalePins = pinnedProjects.filter((p) => !projectPaths.has(p));
      if (stalePins.length > 0) {
        setPinnedProjects(pinnedProjects.filter((p) => projectPaths.has(p)));
        void showToast({
          style: Toast.Style.Success,
          title: `Removed ${stalePins.length} stale pinned project(s)`,
        });
      }
    }

    if (recentProjects.length > 0) {
      const staleRecents = recentProjects.filter((p) => !projectPaths.has(p.path));
      if (staleRecents.length > 0) {
        setRecentProjects(recentProjects.filter((p) => projectPaths.has(p.path)));
      }
    }
  }, [projects]);

  return {
    applyImportedSettings,
    defaultApp,
    fzfAvailable: fzfInfo?.available ?? null,
    fzfPath: fzfInfo?.path ?? null,
    gitAvailable: gitAvailable ?? null,
    isLoading: isProjectsLoading,
    loadData,
    onboardingCompleted,
    pinnedProjects,
    projects,
    recentProjects,
    recentProjectsCount,
    recordProjectOpen,
    reorderPinnedProject,
    setOnboardingCompleted: setOnboardingCompletedState,
    showFzfStatus,
    showGitStatus,
    showRecentProjects,
    terminalApp,
    togglePinProject,
    toggleViewMode,
    updateDefaultApp,
    updatePinnedProjects,
    updateRecentProjects,
    updateRecentProjectsCount,
    updateShowFzfStatus,
    updateShowGitStatus,
    updateShowRecentProjects,
    updateTerminalApp,
    updateViewMode,
    updateWorkspaceApps,
    updateWorkspaces,
    viewMode,
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
