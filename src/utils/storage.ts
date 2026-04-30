import { LocalStorage, showToast, Toast } from "@raycast/api";
import { readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import { App, ExportedSettings, RecentProject, SettingsBackup } from "@/types";
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
  STORAGE_KEY_WORKSPACE_APPS,
  STORAGE_KEY_WORKSPACES,
} from "@/utils/constants";
import { isApp } from "@/utils/validation";

export async function exportSettingsToDownloads(settings: ExportedSettings): Promise<void> {
  try {
    const backup: SettingsBackup = {
      exportedAt: new Date().toISOString(),
      settings,
      version: 1,
    };
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(os.homedir(), "Downloads", `workspace-raycast-settings-${timestamp}.json`);

    await writeFile(outputPath, JSON.stringify(backup, null, 2), "utf-8");
    await showToast({
      message: outputPath,
      style: Toast.Style.Success,
      title: "Settings exported",
    });
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to export settings" });
  }
}

export async function getStoredApp(): Promise<App | null> {
  return getStoredItem<App | null>(STORAGE_KEY_APP, null);
}

export async function getStoredOnboardingCompleted(): Promise<boolean> {
  return getStoredItem<boolean>(STORAGE_KEY_ONBOARDING_COMPLETED, false);
}

export async function getStoredPinnedProjects(): Promise<string[]> {
  return getStoredItem<string[]>(STORAGE_KEY_PINNED_PROJECTS, []);
}

export async function getStoredRecentProjects(): Promise<RecentProject[]> {
  return getStoredItem<RecentProject[]>(STORAGE_KEY_RECENT_PROJECTS, []);
}

export async function getStoredRecentProjectsCount(): Promise<number> {
  return getStoredItem<number>(STORAGE_KEY_RECENT_PROJECTS_COUNT, DEFAULT_RECENT_PROJECTS_COUNT);
}

export async function getStoredShowFzfStatus(): Promise<boolean> {
  return getStoredItem<boolean>(STORAGE_KEY_SHOW_FZF_STATUS, true);
}

export async function getStoredShowGitStatus(): Promise<boolean> {
  return getStoredItem<boolean>(STORAGE_KEY_SHOW_GIT_STATUS, true);
}

export async function getStoredShowRecentProjects(): Promise<boolean> {
  return getStoredItem<boolean>(STORAGE_KEY_SHOW_RECENT_PROJECTS, false);
}

export async function getStoredTerminalApp(): Promise<App | null> {
  return getStoredItem<App | null>(STORAGE_KEY_TERMINAL_APP, null);
}

export async function getStoredWorkspaces(): Promise<string[]> {
  return getStoredItem<string[]>(STORAGE_KEY_WORKSPACES, []);
}

export async function getWorkspaceApps(): Promise<Record<string, App>> {
  return getStoredItem<Record<string, App>>(STORAGE_KEY_WORKSPACE_APPS, {});
}

export async function importSettingsFromFile(
  filePath: string,
  fallback: ExportedSettings,
): Promise<ExportedSettings | null> {
  try {
    const fileContents = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(fileContents) as unknown;

    await showToast({
      message: path.basename(filePath),
      style: Toast.Style.Success,
      title: "Settings imported",
    });

    return normalizeImportedSettings(parsed, fallback);
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Failed to import settings file" });
    return null;
  }
}

export function normalizeImportedSettings(payload: unknown, fallback: ExportedSettings): ExportedSettings {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const parsedSettings =
    "settings" in payload && payload.settings && typeof payload.settings === "object"
      ? (payload.settings as Partial<ExportedSettings>)
      : (payload as Partial<ExportedSettings>);

  return {
    defaultApp: isApp(parsedSettings.defaultApp) ? parsedSettings.defaultApp : null,
    onboardingCompleted:
      typeof parsedSettings.onboardingCompleted === "boolean"
        ? parsedSettings.onboardingCompleted
        : fallback.onboardingCompleted,
    pinnedProjects: Array.isArray(parsedSettings.pinnedProjects)
      ? parsedSettings.pinnedProjects.filter((value): value is string => typeof value === "string")
      : fallback.pinnedProjects,
    recentProjects: Array.isArray(parsedSettings.recentProjects)
      ? parsedSettings.recentProjects.filter(
          (value): value is RecentProject =>
            typeof value === "object" &&
            value !== null &&
            typeof (value as RecentProject).path === "string" &&
            typeof (value as RecentProject).lastOpened === "number",
        )
      : fallback.recentProjects,
    recentProjectsCount:
      typeof parsedSettings.recentProjectsCount === "number" && parsedSettings.recentProjectsCount > 0
        ? parsedSettings.recentProjectsCount
        : fallback.recentProjectsCount,
    showFzfStatus:
      typeof parsedSettings.showFzfStatus === "boolean" ? parsedSettings.showFzfStatus : fallback.showFzfStatus,
    showGitStatus:
      typeof parsedSettings.showGitStatus === "boolean" ? parsedSettings.showGitStatus : fallback.showGitStatus,
    showRecentProjects:
      typeof parsedSettings.showRecentProjects === "boolean"
        ? parsedSettings.showRecentProjects
        : fallback.showRecentProjects,
    terminalApp: isApp(parsedSettings.terminalApp) ? parsedSettings.terminalApp : null,
    viewMode:
      parsedSettings.viewMode === "grid" || parsedSettings.viewMode === "list"
        ? parsedSettings.viewMode
        : fallback.viewMode,
    workspaceApps:
      parsedSettings.workspaceApps && typeof parsedSettings.workspaceApps === "object"
        ? Object.fromEntries(
            Object.entries(parsedSettings.workspaceApps).filter(
              (entry): entry is [string, App] => typeof entry[0] === "string" && isApp(entry[1]),
            ),
          )
        : fallback.workspaceApps,
    workspaces: Array.isArray(parsedSettings.workspaces)
      ? parsedSettings.workspaces.filter((value): value is string => typeof value === "string")
      : fallback.workspaces,
  };
}

export async function saveStoredApp(app: App | null): Promise<void> {
  if (app) {
    await LocalStorage.setItem(STORAGE_KEY_APP, JSON.stringify(app));
  } else {
    await LocalStorage.removeItem(STORAGE_KEY_APP);
  }
}

export async function saveStoredPinnedProjects(paths: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_PINNED_PROJECTS, JSON.stringify(paths));
}

export async function saveStoredRecentProjects(projects: RecentProject[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_RECENT_PROJECTS, JSON.stringify(projects));
}

export async function saveStoredRecentProjectsCount(count: number): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_RECENT_PROJECTS_COUNT, JSON.stringify(count));
}

export async function saveStoredShowFzfStatus(show: boolean): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_SHOW_FZF_STATUS, JSON.stringify(show));
}

export async function saveStoredShowGitStatus(show: boolean): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_SHOW_GIT_STATUS, JSON.stringify(show));
}

export async function saveStoredShowRecentProjects(show: boolean): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_SHOW_RECENT_PROJECTS, JSON.stringify(show));
}

export async function saveStoredTerminalApp(app: App | null): Promise<void> {
  if (app) {
    await LocalStorage.setItem(STORAGE_KEY_TERMINAL_APP, JSON.stringify(app));
  } else {
    await LocalStorage.removeItem(STORAGE_KEY_TERMINAL_APP);
  }
}

export async function saveStoredWorkspaces(workspaces: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
}

export async function saveWorkspaceApps(workspaceApps: Record<string, App>): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_WORKSPACE_APPS, JSON.stringify(workspaceApps));
}

export async function setStoredOnboardingCompleted(completed: boolean): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_ONBOARDING_COMPLETED, JSON.stringify(completed));
}

async function getStoredItem<T>(key: string, defaultValue: T): Promise<T> {
  const raw = await LocalStorage.getItem<string>(key);

  try {
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  } catch (error) {
    console.error(`Error parsing stored item for key "${key}":`, error);

    return defaultValue;
  }
}
