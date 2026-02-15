import { Action, ActionPanel, Icon, List, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import path from "path";
import AddFolderForm from "./AddFolderForm";
import SelectEditor from "./SelectEditor";

import { type Application } from "@raycast/api";

import { getStoredFolders, saveStoredFolders, getStoredApp, getFolderApps, saveFolderApps } from "../utils/storage";
import { App } from "../types";

interface SettingsProps {
  onFoldersChanged: () => Promise<void>;
}

export default function Settings({ onFoldersChanged }: SettingsProps) {
  const [folders, setFolders] = useState<string[]>([]);
  const [defaultApp, setDefaultApp] = useState<App | null>(null);
  const [folderApps, setFolderApps] = useState<Record<string, App>>({});

  const loadSettings = useCallback(async () => {
    const [f, a, fa] = await Promise.all([getStoredFolders(), getStoredApp(), getFolderApps()]);
    setFolders(f);
    setDefaultApp(a);
    setFolderApps(fa);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function removeFolder(folderPath: string) {
    if (
      await confirmAlert({
        title: "Remove Folder",
        message: `Remove "${path.basename(folderPath)}" from your project folders?`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const newFolders = folders.filter((f) => f !== folderPath);
      await saveStoredFolders(newFolders);

      // Cleanup app override
      const newFolderApps = { ...folderApps };
      delete newFolderApps[folderPath];
      await saveFolderApps(newFolderApps);

      setFolders(newFolders);
      setFolderApps(newFolderApps);
      await onFoldersChanged();
      await showToast({ style: Toast.Style.Success, title: "Folder removed" });
    }
  }

  async function setFolderApp(folderPath: string, app: Application) {
    const newFolderApps = {
      ...folderApps,
      [folderPath]: { name: app.name, bundleId: app.bundleId || "" },
    };
    await saveFolderApps(newFolderApps);
    setFolderApps(newFolderApps);
    await showToast({
      style: Toast.Style.Success,
      title: "Folder app updated",
      message: `${path.basename(folderPath)} -> ${app.name}`,
    });
  }

  async function resetFolderApp(folderPath: string) {
    const newFolderApps = { ...folderApps };
    delete newFolderApps[folderPath];
    await saveFolderApps(newFolderApps);
    setFolderApps(newFolderApps);
    await showToast({ style: Toast.Style.Success, title: "Folder app reset" });
  }

  async function moveFolder(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= folders.length) return;

    const newFolders = [...folders];
    const [moved] = newFolders.splice(index, 1);
    newFolders.splice(newIndex, 0, moved);

    await saveStoredFolders(newFolders);
    setFolders(newFolders);
    await onFoldersChanged();
    await showToast({ style: Toast.Style.Success, title: "Order updated" });
  }

  return (
    <List navigationTitle="Settings">
      <List.Section title="General">
        <List.Item
          title="Default App"
          subtitle={defaultApp?.name || "Not Selected"}
          icon={Icon.AppWindow}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select Default App"
                icon={Icon.Pencil}
                target={<SelectEditor />}
                onPop={loadSettings}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Managed Folders">
        {folders.map((folder, index) => {
          const folderApp = folderApps[folder];
          return (
            <List.Item
              key={folder}
              title={path.basename(folder)}
              subtitle={folder}
              icon={Icon.Folder}
              accessories={
                folderApp
                  ? [
                      {
                        tag: { value: folderApp.name, color: Icon.AppWindow },
                        icon: Icon.AppWindow,
                        tooltip: "Custom App Set",
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Set Folder App"
                      icon={Icon.Pencil}
                      target={
                        <SelectEditor
                          onSelect={(app) => setFolderApp(folder, app)}
                          onReset={() => resetFolderApp(folder)}
                        />
                      }
                    />
                    {index > 0 && (
                      <Action
                        title="Move up"
                        icon={Icon.ChevronUp}
                        shortcut={{ modifiers: ["opt"], key: "arrowUp" }}
                        onAction={() => moveFolder(index, "up")}
                      />
                    )}
                    {index < folders.length - 1 && (
                      <Action
                        title="Move Down"
                        icon={Icon.ChevronDown}
                        shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
                        onAction={() => moveFolder(index, "down")}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {folderApp && (
                      <Action
                        title="Remove Folder Application"
                        icon={Icon.XMarkCircle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                        onAction={() => resetFolderApp(folder)}
                      />
                    )}
                    <Action
                      title="Remove Folder"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeFolder(folder)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.ShowInFinder path={folder} />
                    <Action.CopyToClipboard content={folder} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
        <List.Item
          title="Add Workspace Folder"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Folder"
                target={<AddFolderForm />}
                onPop={() => {
                  loadSettings();
                  onFoldersChanged();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
