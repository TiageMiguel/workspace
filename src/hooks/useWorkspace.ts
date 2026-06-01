import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";

import { usePreferences } from "@/hooks/usePreferences";
import { useProjectDiscovery } from "@/hooks/useProjectDiscovery";
import { useRecentProjects } from "@/hooks/useRecentProjects";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { App, ExportedSettings, Project, RecentProject } from "@/types";
import { getFzfPath, isFzfAvailable } from "@/utils/fzf";
import { isGitAvailable } from "@/utils/git";

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
  const pref = usePreferences();
  const ws = useWorkspaces();
  const rp = useRecentProjects();
  const pd = useProjectDiscovery(ws.workspaces, pref.showGitStatus);

  const { data: gitAvailable } = useCachedPromise(async () => {
    return await isGitAvailable();
  }, []);

  const { data: fzfInfo } = useCachedPromise(async () => {
    const available = await isFzfAvailable();
    const path = await getFzfPath();
    return { available, path };
  }, []);

  const applyImportedSettings = async (settings: ExportedSettings): Promise<void> => {
    await pref.updateDefaultApp(settings.defaultApp);
    await pref.updateTerminalApp(settings.terminalApp);
    await ws.updateWorkspaces(settings.workspaces);
    await ws.updateWorkspaceApps(settings.workspaceApps);
    await rp.updatePinnedProjects(settings.pinnedProjects);
    await pref.updateShowGitStatus(settings.showGitStatus);
    await pref.updateShowFzfStatus(settings.showFzfStatus);
    await pref.updateShowRecentProjects(settings.showRecentProjects);
    await rp.updateRecentProjects(settings.recentProjects);
    await rp.updateRecentProjectsCount(settings.recentProjectsCount);
    await pref.updateViewMode(settings.viewMode);
    await pref.setOnboardingCompleted(settings.onboardingCompleted);
  };

  // Stale pin/recent cleanup: prune entries that no longer exist in the project list
  useEffect(() => {
    if (!pd.projects || pd.projects.length === 0) return;

    const projectPaths = new Set(pd.projects.map((p) => p.fullPath));

    if (rp.pinnedProjects.length > 0) {
      const stalePins = rp.pinnedProjects.filter((p) => !projectPaths.has(p));
      if (stalePins.length > 0) {
        rp.updatePinnedProjects(rp.pinnedProjects.filter((p) => projectPaths.has(p)));
        void showToast({
          style: Toast.Style.Success,
          title: `Removed ${stalePins.length} stale pinned project(s)`,
        });
      }
    }

    if (rp.recentProjects.length > 0) {
      const staleRecents = rp.recentProjects.filter((p) => !projectPaths.has(p.path));
      if (staleRecents.length > 0) {
        rp.updateRecentProjects(rp.recentProjects.filter((p) => projectPaths.has(p.path)));
      }
    }
  }, [pd.projects]); // Ensure dependencies are correct

  return {
    applyImportedSettings,
    defaultApp: pref.defaultApp,
    fzfAvailable: fzfInfo?.available ?? null,
    fzfPath: fzfInfo?.path ?? null,
    gitAvailable: gitAvailable ?? null,
    isLoading: pd.isLoading,
    loadData: pd.loadData,
    onboardingCompleted: pref.onboardingCompleted,
    pinnedProjects: rp.pinnedProjects,
    projects: pd.projects,
    recentProjects: rp.recentProjects,
    recentProjectsCount: rp.recentProjectsCount,
    recordProjectOpen: rp.recordProjectOpen,
    reorderPinnedProject: rp.reorderPinnedProject,
    setOnboardingCompleted: pref.setOnboardingCompleted,
    showFzfStatus: pref.showFzfStatus,
    showGitStatus: pref.showGitStatus,
    showRecentProjects: pref.showRecentProjects,
    terminalApp: pref.terminalApp,
    togglePinProject: rp.togglePinProject,
    toggleViewMode: pref.toggleViewMode,
    updateDefaultApp: pref.updateDefaultApp,
    updatePinnedProjects: rp.updatePinnedProjects,
    updateRecentProjects: rp.updateRecentProjects,
    updateRecentProjectsCount: rp.updateRecentProjectsCount,
    updateShowFzfStatus: pref.updateShowFzfStatus,
    updateShowGitStatus: pref.updateShowGitStatus,
    updateShowRecentProjects: pref.updateShowRecentProjects,
    updateTerminalApp: pref.updateTerminalApp,
    updateViewMode: pref.updateViewMode,
    updateWorkspaceApps: ws.updateWorkspaceApps,
    updateWorkspaces: ws.updateWorkspaces,
    viewMode: pref.viewMode,
    workspaceApps: ws.workspaceApps,
    workspaces: ws.workspaces,
  };
}
