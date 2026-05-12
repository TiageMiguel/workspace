import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { type Application } from "@raycast/api";
import path from "path";

import AddWorkspaceForm from "@/components/AddWorkspaceForm";
import ImportSettingsForm from "@/components/ImportSettingsForm";
import SelectEditor from "@/components/SelectEditor";
import { useWorkspace } from "@/hooks/useWorkspace";
import { exportSettingsToDownloads, importSettingsFromFile } from "@/utils/storage";

interface SettingsProps {
  onWorkspacesChanged?: () => Promise<void>;
  showGeneral?: boolean;
}

export default function Settings({ onWorkspacesChanged, showGeneral = true }: SettingsProps) {
  const {
    applyImportedSettings,
    defaultApp,
    fzfAvailable,
    gitAvailable,
    loadData,
    onboardingCompleted,
    pinnedProjects,
    recentProjects,
    recentProjectsCount,
    showFzfStatus,
    showGitStatus,
    showRecentProjects,
    terminalApp,
    updateDefaultApp,
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
  } = useWorkspace();

  async function handleExportSettings() {
    await exportSettingsToDownloads({
      defaultApp,
      onboardingCompleted,
      pinnedProjects,
      recentProjects,
      recentProjectsCount,
      showFzfStatus,
      showGitStatus,
      showRecentProjects,
      terminalApp,
      viewMode,
      workspaceApps,
      workspaces,
    });
  }

  async function handleImportSettings(filePath: string): Promise<boolean> {
    const fallback = {
      defaultApp,
      onboardingCompleted,
      pinnedProjects,
      recentProjects,
      recentProjectsCount,
      showFzfStatus,
      showGitStatus,
      showRecentProjects,
      terminalApp,
      viewMode,
      workspaceApps,
      workspaces,
    };

    const importedSettings = await importSettingsFromFile(filePath, fallback);
    if (!importedSettings) return false;

    await applyImportedSettings(importedSettings);

    if (onWorkspacesChanged) {
      await onWorkspacesChanged();
    }

    return true;
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
            accessories={[
              {
                tag: {
                  color: Color.SecondaryText,
                  value: viewMode === "grid" ? "Grid" : "List",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="View Mode">
                  <Action
                    icon={viewMode === "grid" ? Icon.List : Icon.AppWindowGrid3x3}
                    onAction={() => updateViewMode(viewMode === "grid" ? "list" : "grid")}
                    title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            icon={Icon.AppWindowGrid3x3}
            subtitle="Default layout when opening the extension"
            title="View Mode"
          />
          <List.Item
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Backup">
                  <Action icon={Icon.Download} onAction={handleExportSettings} title="Export Settings to Downloads" />
                  <Action.Push
                    icon={Icon.Upload}
                    target={<ImportSettingsForm onImport={handleImportSettings} />}
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
        <List.Section title="Recent Projects">
          <List.Item
            accessories={[
              {
                tag: {
                  color: showRecentProjects ? Color.Green : Color.SecondaryText,
                  value: showRecentProjects ? "Enabled" : "Disabled",
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Recent Projects">
                  <Action
                    onAction={() => updateShowRecentProjects(!showRecentProjects)}
                    title={showRecentProjects ? "Disable Recent Projects" : "Enable Recent Projects"}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            icon={Icon.Clock}
            subtitle="Show recently opened projects in the workspace list"
            title="Show Recent Projects"
          />
          {showRecentProjects && (
            <List.Item
              accessories={[
                {
                  tag: {
                    color: Color.SecondaryText,
                    value: `${recentProjectsCount}`,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Count">
                    {[3, 5, 7, 10].map((count) => (
                      <Action
                        key={count}
                        onAction={() => updateRecentProjectsCount(count)}
                        title={`Show ${count} Recent Projects`}
                      />
                    ))}
                  </ActionPanel.Section>
                </ActionPanel>
              }
              icon={Icon.List}
              subtitle="Number of recent projects to display"
              title="Recent Projects Count"
            />
          )}
        </List.Section>
      )}

      {showGeneral && (
        <List.Section title="Integration - Git">
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
        <List.Section title="Integration - FZF">
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
