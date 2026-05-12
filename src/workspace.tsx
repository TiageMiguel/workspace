import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import path from "path";
import { useMemo, useState } from "react";

import Onboarding from "@/components/Onboarding";
import ProjectItem from "@/components/ProjectItem";
import Settings from "@/components/Settings";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Project } from "@/types";
import { fuzzySearch } from "@/utils/fzf";
import { importSettingsFromFile } from "@/utils/storage";

export default function Command() {
  const {
    applyImportedSettings,
    defaultApp,
    fzfAvailable,
    fzfPath,
    isLoading,
    loadData,
    onboardingCompleted,
    pinnedProjects,
    projects,
    recentProjects,
    recentProjectsCount,
    recordProjectOpen,
    reorderPinnedProject,
    setOnboardingCompleted,
    showFzfStatus,
    showGitStatus,
    showRecentProjects,
    terminalApp,
    togglePinProject,
    toggleViewMode,
    updateDefaultApp,
    viewMode,
    workspaceApps,
    workspaces: parentWorkspaces,
  } = useWorkspace();

  const [searchText, setSearchText] = useState("");

  const filteredProjects = useMemo(() => {
    if (!projects) {
      return [];
    }

    if (!searchText) {
      return projects;
    }

    if (fzfAvailable && fzfPath && showFzfStatus) {
      const results = fuzzySearch(projects, searchText, fzfPath);
      if (results.length > 0 || searchText === "") {
        return results;
      }
    }

    // Default search (maintain it how it was)
    const searchLower = searchText.toLowerCase();
    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.fullPath.toLowerCase().includes(searchLower) ||
        (showGitStatus && project.gitStatus?.branch?.toLowerCase().includes(searchLower))
      );
    });
  }, [projects, searchText, fzfAvailable, fzfPath, showFzfStatus, showGitStatus]);

  const pinnedSet = useMemo(() => new Set(pinnedProjects), [pinnedProjects]);

  const recentSet = useMemo(() => new Set(recentProjects.map((r) => r.path)), [recentProjects]);

  const projectsByWorkspace = useMemo(() => {
    const map: Record<string, Project[]> = {};

    parentWorkspaces.forEach((ws: string) => {
      map[ws] = filteredProjects.filter(
        (p: Project) =>
          p.parentFolder === ws &&
          (searchText || !pinnedSet.has(p.fullPath)) &&
          (searchText || !showRecentProjects || !recentSet.has(p.fullPath)),
      );
    });

    return map;
  }, [parentWorkspaces, filteredProjects, pinnedSet, recentSet, searchText, showRecentProjects]);

  const projectsMap = useMemo(() => {
    return new Map((projects || []).map((p) => [p.fullPath, p]));
  }, [projects]);

  const pinnedList = useMemo(() => {
    return pinnedProjects.map((path) => projectsMap.get(path)).filter((p): p is Project => !!p);
  }, [projectsMap, pinnedProjects]);

  const recentList = useMemo(() => {
    if (!showRecentProjects) return [];

    return recentProjects
      .map((r) => projectsMap.get(r.path))
      .filter((p): p is Project => !!p && !pinnedSet.has(p.fullPath));
  }, [projectsMap, recentProjects, showRecentProjects, pinnedSet]);

  const hasVisibleProjects = useMemo(() => {
    if (pinnedList.length > 0 && !searchText) {
      return true;
    }

    if (recentList.length > 0 && !searchText) {
      return true;
    }

    return parentWorkspaces.some((workspace) => (projectsByWorkspace[workspace] || []).length > 0);
  }, [parentWorkspaces, pinnedList.length, recentList.length, projectsByWorkspace, searchText]);

  async function handleImportSettings(filePath: string): Promise<boolean> {
    const fallback = {
      defaultApp,
      onboardingCompleted,
      pinnedProjects: Array.from(pinnedSet),
      recentProjects,
      recentProjectsCount,
      showFzfStatus,
      showGitStatus,
      showRecentProjects,
      terminalApp,
      viewMode,
      workspaceApps,
      workspaces: parentWorkspaces,
    };

    const importedSettings = await importSettingsFromFile(filePath, fallback);
    if (!importedSettings) return false;

    await applyImportedSettings(importedSettings);
    await loadData();
    return true;
  }

  if (!isLoading && !onboardingCompleted) {
    return (
      <Onboarding
        defaultApp={defaultApp}
        loadData={loadData}
        onComplete={() => setOnboardingCompleted(true)}
        onImportSettings={handleImportSettings}
        onSelectDefaultApp={(app) => updateDefaultApp({ bundleId: app.bundleId || "", name: app.name })}
        workspaces={parentWorkspaces}
      />
    );
  }

  const renderProjects = (items: Project[], isPinned: boolean) =>
    items.map((project) => (
      <ProjectItem
        defaultApp={defaultApp}
        isPinned={isPinned || pinnedSet.has(project.fullPath)}
        key={project.fullPath}
        onOpen={recordProjectOpen}
        onRefresh={loadData}
        onReorderPin={reorderPinnedProject}
        onTogglePin={togglePinProject}
        project={project}
        showGitStatus={showGitStatus}
        terminalApp={terminalApp}
        viewMode={viewMode}
        workspaceApps={workspaceApps}
        workspacePath={project.parentFolder}
      />
    ));

  // Aliased components to avoid massive JSX duplication
  // The props we use are identical between Grid and List for our use case
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const View = (viewMode === "grid" ? Grid : List) as any;
  const Section = (viewMode === "grid" ? Grid.Section : List.Section) as any;
  const EmptyView = (viewMode === "grid" ? Grid.EmptyView : List.EmptyView) as any;
  const Dropdown = (viewMode === "grid" ? Grid.Dropdown : List.Dropdown) as any;
  const DropdownItem = (viewMode === "grid" ? Grid.Dropdown.Item : List.Dropdown.Item) as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <View
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Dropdown
          onChange={(val: string) => {
            if (val !== viewMode) toggleViewMode();
          }}
          tooltip="View Mode"
          value={viewMode}
        >
          <DropdownItem icon={Icon.List} title="List" value="list" />
          <DropdownItem icon={Icon.AppWindowGrid3x3} title="Grid" value="grid" />
        </Dropdown>
      }
      searchBarPlaceholder="Search for projects..."
      throttle
    >
      {pinnedList.length > 0 && !searchText && <Section title="Pinned">{renderProjects(pinnedList, true)}</Section>}

      {recentList.length > 0 && !searchText && <Section title="Recent">{renderProjects(recentList, false)}</Section>}

      {parentWorkspaces.map((workspace) => {
        const workspaceProjects = projectsByWorkspace[workspace] || [];

        if (workspaceProjects.length === 0) return null;

        const subtitle = `${workspace} • ${workspaceProjects.length} project${workspaceProjects.length === 1 ? "" : "s"}`;

        return (
          <Section key={workspace} subtitle={subtitle} title={path.basename(workspace)}>
            {renderProjects(workspaceProjects, false)}
          </Section>
        );
      })}

      {parentWorkspaces.length === 0 && !isLoading && (
        <EmptyView
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Get Started">
                <Action.Push target={<Settings onWorkspacesChanged={loadData} />} title="Open Settings" />
              </ActionPanel.Section>
            </ActionPanel>
          }
          description="Add a workspace in Settings to see your projects."
          title="No Workspaces"
        />
      )}
      {parentWorkspaces.length > 0 && !isLoading && !searchText && !hasVisibleProjects && (
        <EmptyView
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Manage">
                <Action.Push target={<Settings onWorkspacesChanged={loadData} />} title="Open Settings" />
              </ActionPanel.Section>
            </ActionPanel>
          }
          description="No folders found inside your workspaces. Add or manage workspaces in Settings."
          title="No Projects Found"
        />
      )}
    </View>
  );
}
