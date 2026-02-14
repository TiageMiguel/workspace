import { LocalStorage } from "@raycast/api";
import { STORAGE_KEY_FOLDERS, STORAGE_KEY_APP, STORAGE_KEY_FOLDER_APPS } from "./constants";
import { App } from "../types";

export async function getStoredFolders(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_FOLDERS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveStoredFolders(folders: string[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
}

export async function getStoredApp(): Promise<App | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_APP);
  return raw ? JSON.parse(raw) : null;
}

export async function saveStoredApp(app: App): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_APP, JSON.stringify(app));
}

export async function getFolderApps(): Promise<Record<string, App>> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY_FOLDER_APPS);
  return raw ? JSON.parse(raw) : {};
}

export async function saveFolderApps(folderApps: Record<string, App>): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY_FOLDER_APPS, JSON.stringify(folderApps));
}
