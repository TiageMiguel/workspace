import { List } from "@raycast/api";

import GeneralSettings from "@/components/Settings/GeneralSettings";
import IntegrationSettings from "@/components/Settings/IntegrationSettings";
import ManagedWorkspacesSection from "@/components/Settings/ManagedWorkspacesSection";
import RecentProjectsSettings from "@/components/Settings/RecentProjectsSettings";
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

  return (
    <List
      navigationTitle={showGeneral ? "Workspace Settings" : "Manage Your Workspaces"}
      searchBarPlaceholder={showGeneral ? "Search settings..." : "Search for workspaces..."}
    >
      {showGeneral && (
        <>
          <GeneralSettings
            defaultApp={defaultApp}
            onExportSettings={handleExportSettings}
            onImportSettings={handleImportSettings}
            terminalApp={terminalApp}
            updateDefaultApp={updateDefaultApp}
            updateTerminalApp={updateTerminalApp}
            updateViewMode={updateViewMode}
            viewMode={viewMode}
          />
          <RecentProjectsSettings
            recentProjectsCount={recentProjectsCount}
            showRecentProjects={showRecentProjects}
            updateRecentProjectsCount={updateRecentProjectsCount}
            updateShowRecentProjects={updateShowRecentProjects}
          />
          <IntegrationSettings
            fzfAvailable={fzfAvailable}
            gitAvailable={gitAvailable}
            onWorkspacesChanged={onWorkspacesChanged}
            showFzfStatus={showFzfStatus}
            showGitStatus={showGitStatus}
            updateShowFzfStatus={updateShowFzfStatus}
            updateShowGitStatus={updateShowGitStatus}
          />
        </>
      )}

      <ManagedWorkspacesSection
        loadData={loadData}
        onWorkspacesChanged={onWorkspacesChanged}
        updateWorkspaceApps={updateWorkspaceApps}
        updateWorkspaces={updateWorkspaces}
        workspaceApps={workspaceApps}
        workspaces={workspaces}
      />
    </List>
  );
}
