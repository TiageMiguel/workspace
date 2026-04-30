export interface App {
  bundleId: string;
  name: string;
}

export interface ExportedSettings {
  defaultApp: App | null;
  onboardingCompleted: boolean;
  pinnedProjects: string[];
  recentProjects: RecentProject[];
  recentProjectsCount: number;
  showFzfStatus: boolean;
  showGitStatus: boolean;
  showRecentProjects: boolean;
  terminalApp: App | null;
  viewMode: "grid" | "list";
  workspaceApps: Record<string, App>;
  workspaces: string[];
}

export interface GitStatus {
  branch: string;
  dirty: number;
  pull: number;
  push: number;
}

export interface Project {
  fullPath: string;
  gitStatus?: GitStatus | null;
  name: string;
  parentFolder: string;
}

export interface RecentProject {
  lastOpened: number;
  path: string;
}

export interface SettingsBackup {
  exportedAt: string;
  settings: ExportedSettings;
  version: 1;
}
