import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { type Application } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import AddWorkspaceForm from "@/components/AddWorkspaceForm";
import SelectEditor from "@/components/SelectEditor";
import { useWorkspace } from "@/hooks/useWorkspace";
import { App } from "@/types";

interface ExportedSettings {
  defaultApp: App | null;
  onboardingCompleted: boolean;
  pinnedProjects: string[];
  showFzfStatus: boolean;
  showGitStatus: boolean;
  terminalApp: App | null;
  workspaceApps: Record<string, App>;
  workspaces: string[];
}

interface ImportSettingsFormProps {
  onImport: (filePath: string) => Promise<boolean>;
}

interface ImportSettingsFormValues {
  file: string[];
}

interface SettingsBackup {
  exportedAt: string;
  settings: ExportedSettings;
  version: 1;
}

interface SettingsProps {
  onWorkspacesChanged?: () => Promise<void>;
  showGeneral?: boolean;
}

export default function Settings({ onWorkspacesChanged, showGeneral = true }: SettingsProps) {
  const {
    defaultApp,
    fzfAvailable,
    gitAvailable,
    loadData,
    onboardingCompleted,
    pinnedProjects,
    setOnboardingCompleted,
    showFzfStatus,
    showGitStatus,
    terminalApp,
    updateDefaultApp,
    updatePinnedProjects,
    updateShowFzfStatus,
    updateShowGitStatus,
    updateTerminalApp,
    updateWorkspaceApps,
    updateWorkspaces,
    workspaceApps,
    workspaces,
  } = useWorkspace();

  function isApp(value: unknown): value is App {
    return Boolean(
      value &&
      typeof value === "object" &&
      "bundleId" in value &&
      "name" in value &&
      typeof (value as App).bundleId === "string" &&
      typeof (value as App).name === "string",
    );
  }

  function normalizeImportedSettings(payload: unknown): ExportedSettings {
    const fallback: ExportedSettings = {
      defaultApp,
      onboardingCompleted,
      pinnedProjects,
      showFzfStatus,
      showGitStatus,
      terminalApp,
      workspaceApps,
      workspaces,
    };

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
      showFzfStatus:
        typeof parsedSettings.showFzfStatus === "boolean" ? parsedSettings.showFzfStatus : fallback.showFzfStatus,
      showGitStatus:
        typeof parsedSettings.showGitStatus === "boolean" ? parsedSettings.showGitStatus : fallback.showGitStatus,
      terminalApp: isApp(parsedSettings.terminalApp) ? parsedSettings.terminalApp : null,
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

  async function exportSettingsToDownloads() {
    try {
      const backup: SettingsBackup = {
        exportedAt: new Date().toISOString(),
        settings: {
          defaultApp,
          onboardingCompleted,
          pinnedProjects,
          showFzfStatus,
          showGitStatus,
          terminalApp,
          workspaceApps,
          workspaces,
        },
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

  async function importSettingsFromFile(filePath: string): Promise<boolean> {
    try {
      const fileContents = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(fileContents) as unknown;
      const importedSettings = normalizeImportedSettings(parsed);

      await updateDefaultApp(importedSettings.defaultApp);
      await updateTerminalApp(importedSettings.terminalApp);
      await updateWorkspaces(importedSettings.workspaces);
      await updateWorkspaceApps(importedSettings.workspaceApps);
      await updatePinnedProjects(importedSettings.pinnedProjects);
      await updateShowGitStatus(importedSettings.showGitStatus);
      await updateShowFzfStatus(importedSettings.showFzfStatus);
      await setOnboardingCompleted(importedSettings.onboardingCompleted);

      if (onWorkspacesChanged) {
        await onWorkspacesChanged();
      }

      await showToast({
        message: path.basename(filePath),
        style: Toast.Style.Success,
        title: "Settings imported",
      });
      return true;
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to import settings file" });
      return false;
    }
  }

  async function removeWorkspace(workspacePath: string) {
    if (
      await confirmAlert({
        message: `Remove "${path.basename(workspacePath)}" from your workspace projects?`,
        primaryAction: { style: Alert.ActionStyle.Destructive, title: "Remove" },
        title: "Remove Workspace",
      })
    ) {
      try {
        const newWorkspaces = workspaces.filter((item) => item !== workspacePath);

        await updateWorkspaces(newWorkspaces);

        const newWorkspaceApps = { ...workspaceApps };
        delete newWorkspaceApps[workspacePath];

        await updateWorkspaceApps(newWorkspaceApps);

        if (onWorkspacesChanged) {
          await onWorkspacesChanged();
        }

        await showToast({ style: Toast.Style.Success, title: "Workspace Removed" });
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Failed to remove workspace" });
      }
    }
  }

  async function setWorkspaceApp(workspacePath: string, app: Application) {
    try {
      const newWorkspaceApps = {
        ...workspaceApps,
        [workspacePath]: { bundleId: app.bundleId || "", name: app.name },
      };

      await updateWorkspaceApps(newWorkspaceApps);

      await showToast({
        message: `${path.basename(workspacePath)} → ${app.name}`,
        style: Toast.Style.Success,
        title: "App Updated",
      });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update app" });
    }
  }

  async function resetWorkspaceApp(workspacePath: string) {
    try {
      const newWorkspaceApps = { ...workspaceApps };
      delete newWorkspaceApps[workspacePath];

      await updateWorkspaceApps(newWorkspaceApps);

      await showToast({ style: Toast.Style.Success, title: "Application Reset" });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to reset app" });
    }
  }

  async function moveWorkspace(index: number, direction: "down" | "up") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= workspaces.length) {
      return;
    }

    try {
      const newWorkspaces = [...workspaces];
      const [moved] = newWorkspaces.splice(index, 1);

      newWorkspaces.splice(newIndex, 0, moved);

      await updateWorkspaces(newWorkspaces);

      if (onWorkspacesChanged) {
        await onWorkspacesChanged();
      }

      await showToast({ style: Toast.Style.Success, title: "Workspace Moved" });
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to move workspace" });
    }
  }

  const handleDefaultAppSelect = async (app: Application) => {
    await updateDefaultApp({ bundleId: app.bundleId || "", name: app.name });
    await showToast({ message: app.name, style: Toast.Style.Success, title: "App Updated" });
  };

  const handleTerminalSelect = async (app: Application) => {
    await updateTerminalApp({ bundleId: app.bundleId || "", name: app.name });
    await showToast({ message: app.name, style: Toast.Style.Success, title: "Terminal Updated" });
  };

  const handleTerminalReset = async () => {
    await updateTerminalApp(null);
    await showToast({ style: Toast.Style.Success, title: "Terminal Reset" });
  };

  const toggleGitStatus = async () => {
    const newValue = !showGitStatus;
    await updateShowGitStatus(newValue);

    if (onWorkspacesChanged) {
      await onWorkspacesChanged();
    }

    await showToast({
      style: Toast.Style.Success,
      title: newValue ? "Git status enabled" : "Git status disabled",
    });
  };

  return (
    <List
      navigationTitle={showGeneral ? "Workspace Settings" : "Manage Your Workspaces"}
      searchBarPlaceholder={showGeneral ? "Search settings..." : "Search for workspaces..."}
    >
      {showGeneral && (
        <List.Section title="General Settings">
          <List.Item
            accessories={[
              {
                tag: {
                  color: defaultApp?.name ? Color.SecondaryText : Color.Red,
                  value: defaultApp?.name || "Not selected",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Application">
                  <Action.Push
                    icon={Icon.Pencil}
                    target={<SelectEditor onSelect={handleDefaultAppSelect} />}
                    title="Change Application"
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            icon={Icon.AppWindow}
            subtitle="Application where your projects are opened"
            title="Default App"
          />
          <List.Item
            accessories={[
              {
                tag: {
                  color: Color.SecondaryText,
                  value: terminalApp?.name || "System default",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Terminal">
                  <Action.Push
                    icon={Icon.Pencil}
                    target={<SelectEditor onReset={handleTerminalReset} onSelect={handleTerminalSelect} />}
                    title="Change Terminal"
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            icon={Icon.Terminal}
            subtitle="Open your projects in a terminal"
            title="Terminal App"
          />
          <List.Item
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Backup">
                  <Action
                    icon={Icon.Download}
                    onAction={exportSettingsToDownloads}
                    title="Export Settings to Downloads"
                  />
                  <Action.Push
                    icon={Icon.Upload}
                    target={<ImportSettingsForm onImport={importSettingsFromFile} />}
                    title="Import Settings File"
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            icon={Icon.Document}
            subtitle="Export current settings or import from a JSON backup file"
            title="Import / Export Settings"
          />
        </List.Section>
      )}

      {showGeneral && (
        <List.Section title="GIT Integration">
          <List.Item
            accessories={[
              {
                tag: {
                  color: gitAvailable ? Color.Green : Color.Red,
                  value: gitAvailable ? "Available" : "Not installed",
                },
              },
            ]}
            icon={Icon.Shuffle}
            subtitle={
              gitAvailable === null
                ? "Checking..."
                : gitAvailable
                  ? "Branch and sync status shown per project"
                  : "Install Git to see branch and sync status"
            }
            title="Git Integration"
          />
          {gitAvailable && (
            <List.Item
              accessories={[
                {
                  tag: {
                    color: showGitStatus ? Color.Green : Color.SecondaryText,
                    value: showGitStatus ? "Enabled" : "Disabled",
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Git Status">
                    <Action
                      onAction={toggleGitStatus}
                      title={showGitStatus ? "Disable Git Status" : "Enable Git Status"}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              icon={Icon.Shuffle}
              subtitle="Show branch and sync status in the list"
              title="Show Git Status"
            />
          )}
        </List.Section>
      )}

      {showGeneral && (
        <List.Section title="FZF Integration">
          <List.Item
            accessories={[
              {
                tag: {
                  color: fzfAvailable ? Color.Green : Color.Red,
                  value: fzfAvailable ? "Available" : "Not installed",
                },
              },
            ]}
            icon={Icon.MagnifyingGlass}
            subtitle={
              fzfAvailable === null
                ? "Checking..."
                : fzfAvailable
                  ? "Standard FZF search algorithm enabled"
                  : "Install FZF to enable advanced fuzzy search"
            }
            title="FZF (Smart Search)"
          />
          {fzfAvailable && (
            <List.Item
              accessories={[
                {
                  tag: {
                    color: showFzfStatus ? Color.Green : Color.SecondaryText,
                    value: showFzfStatus ? "Enabled" : "Disabled",
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Search">
                    <Action
                      onAction={() => updateShowFzfStatus(!showFzfStatus)}
                      title={showFzfStatus ? "Disable FZF Search" : "Enable FZF Search"}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              icon={Icon.MagnifyingGlass}
              subtitle="Toggle fuzzy search for your projects"
              title="Use FZF for Search"
            />
          )}
        </List.Section>
      )}

      <List.Section title="Managed Workspaces">
        {workspaces.map((workspace, index) => {
          const workspaceApp = workspaceApps[workspace];
          return (
            <List.Item
              accessories={
                workspaceApp
                  ? [
                      {
                        tag: { color: Color.SecondaryText, value: workspaceApp.name },
                        tooltip: "Custom App Set",
                      },
                    ]
                  : []
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Pencil}
                      target={
                        <SelectEditor
                          onReset={() => resetWorkspaceApp(workspace)}
                          onSelect={(app) => setWorkspaceApp(workspace, app)}
                        />
                      }
                      title="Set Workspace App"
                    />
                    {index > 0 && (
                      <Action
                        icon={Icon.ChevronUp}
                        onAction={() => moveWorkspace(index, "up")}
                        shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                        title="Move up"
                      />
                    )}
                    {index < workspaces.length - 1 && (
                      <Action
                        icon={Icon.ChevronDown}
                        onAction={() => moveWorkspace(index, "down")}
                        shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                        title="Move Down"
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {workspaceApp && (
                      <Action
                        icon={Icon.XMarkCircle}
                        onAction={() => resetWorkspaceApp(workspace)}
                        shortcut={{ key: "backspace", modifiers: ["cmd", "shift"] }}
                        title="Remove Workspace Application"
                      />
                    )}
                    <Action
                      icon={Icon.Trash}
                      onAction={() => removeWorkspace(workspace)}
                      style={Action.Style.Destructive}
                      title="Remove Workspace"
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard content={path.basename(workspace)} title="Copy Workspace Name" />
                    <Action.CopyToClipboard
                      content={workspace}
                      shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
                      title="Copy Workspace Path"
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              icon={Icon.Folder}
              key={workspace}
              subtitle={workspace}
              title={path.basename(workspace)}
            />
          );
        })}
        <List.Item
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Workspace">
                <Action.Push onPop={loadData} target={<AddWorkspaceForm />} title="Add Workspace" />
              </ActionPanel.Section>
            </ActionPanel>
          }
          icon={Icon.Plus}
          title="Add Workspace"
        />
      </List.Section>
    </List>
  );
}

function ImportSettingsForm({ onImport }: ImportSettingsFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<ImportSettingsFormValues>({
    async onSubmit(values) {
      const imported = await onImport(values.file[0]);
      if (imported) {
        pop();
      }
    },
    validation: {
      file: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Import">
            <Action.SubmitForm onSubmit={handleSubmit} title="Import Settings" />
          </ActionPanel.Section>
        </ActionPanel>
      }
      navigationTitle="Import Settings"
    >
      <Form.FilePicker
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        title="Settings File"
        {...itemProps.file}
      />
    </Form>
  );
}
