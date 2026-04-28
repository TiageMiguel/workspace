import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { readFile } from "fs/promises";
import path from "path";
import { useMemo, useState } from "react";

import Onboarding from "@/components/Onboarding";
import ProjectItem from "@/components/ProjectItem";
import Settings from "@/components/Settings";
import { useWorkspace } from "@/hooks/useWorkspace";
import { App, Project } from "@/types";
import { fuzzySearch } from "@/utils/fzf";

export default function Command() {
  const {
    defaultApp,
    fzfAvailable,
    fzfPath,
    isLoading,
    loadData,
    onboardingCompleted,
    pinnedProjects,
    projects,
    reorderPinnedProject,
    setOnboardingCompleted,
    showFzfStatus,
    showGitStatus,
    terminalApp,
    togglePinProject,
    updateDefaultApp,
    updatePinnedProjects,
    updateShowFzfStatus,
    updateShowGitStatus,
    updateTerminalApp,
    updateWorkspaceApps,
    updateWorkspaces,
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

  const projectsByWorkspace = useMemo(() => {
    const map: Record<string, Project[]> = {};

    parentWorkspaces.forEach((ws: string) => {
      map[ws] = filteredProjects.filter(
        (p: Project) => p.parentFolder === ws && (searchText || !pinnedSet.has(p.fullPath)),
      );
    });

    return map;
  }, [parentWorkspaces, filteredProjects, pinnedSet, searchText]);

  const pinnedList = useMemo(() => {
    const projectsMap = new Map((projects || []).map((p) => [p.fullPath, p]));

    return pinnedProjects.map((path) => projectsMap.get(path)).filter((p): p is Project => !!p);
  }, [projects, pinnedProjects]);

  const hasVisibleProjects = useMemo(() => {
    if (pinnedList.length > 0 && !searchText) {
      return true;
    }

    return parentWorkspaces.some((workspace) => (projectsByWorkspace[workspace] || []).length > 0);
  }, [parentWorkspaces, pinnedList.length, projectsByWorkspace, searchText]);

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

  async function importSettingsFromFile(filePath: string): Promise<boolean> {
    try {
      const fileContents = await readFile(filePath, "utf-8");
      const parsed = JSON.parse(fileContents) as unknown;
      const parsedSettings =
        parsed &&
        typeof parsed === "object" &&
        "settings" in parsed &&
        parsed.settings &&
        typeof parsed.settings === "object"
          ? (parsed.settings as Record<string, unknown>)
          : ((parsed || {}) as Record<string, unknown>);

      const importedDefaultApp = isApp(parsedSettings.defaultApp) ? parsedSettings.defaultApp : null;
      const importedTerminalApp = isApp(parsedSettings.terminalApp) ? parsedSettings.terminalApp : null;
      const importedWorkspaces = Array.isArray(parsedSettings.workspaces)
        ? parsedSettings.workspaces.filter((value): value is string => typeof value === "string")
        : [];
      const importedWorkspaceApps =
        parsedSettings.workspaceApps && typeof parsedSettings.workspaceApps === "object"
          ? Object.fromEntries(
              Object.entries(parsedSettings.workspaceApps).filter(
                (entry): entry is [string, App] => typeof entry[0] === "string" && isApp(entry[1]),
              ),
            )
          : {};
      const importedPinnedProjects = Array.isArray(parsedSettings.pinnedProjects)
        ? parsedSettings.pinnedProjects.filter((value): value is string => typeof value === "string")
        : [];
      const importedShowGitStatus =
        typeof parsedSettings.showGitStatus === "boolean" ? parsedSettings.showGitStatus : true;
      const importedShowFzfStatus =
        typeof parsedSettings.showFzfStatus === "boolean" ? parsedSettings.showFzfStatus : true;
      const importedOnboardingCompleted =
        typeof parsedSettings.onboardingCompleted === "boolean" ? parsedSettings.onboardingCompleted : false;

      await updateDefaultApp(importedDefaultApp);
      await updateTerminalApp(importedTerminalApp);
      await updateWorkspaces(importedWorkspaces);
      await updateWorkspaceApps(importedWorkspaceApps);
      await updatePinnedProjects(importedPinnedProjects);
      await updateShowGitStatus(importedShowGitStatus);
      await updateShowFzfStatus(importedShowFzfStatus);
      await setOnboardingCompleted(importedOnboardingCompleted);
      await loadData();

      await showToast({
        message: path.basename(filePath),
        style: Toast.Style.Success,
        title: "Settings Imported",
      });
      return true;
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Failed to Import Settings File" });
      return false;
    }
  }

  if (!isLoading && !onboardingCompleted) {
    return (
      <Onboarding
        defaultApp={defaultApp}
        loadData={loadData}
        onComplete={() => setOnboardingCompleted(true)}
        onImportSettings={importSettingsFromFile}
        onSelectDefaultApp={(app) => updateDefaultApp({ bundleId: app.bundleId || "", name: app.name })}
        workspaces={parentWorkspaces}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for projects..."
      throttle
    >
      {pinnedList.length > 0 && !searchText && (
        <List.Section title="Pinned">
          {pinnedList.map((project) => (
            <ProjectItem
              defaultApp={defaultApp}
              isPinned={true}
              key={`pinned-${project.fullPath}`}
              onRefresh={loadData}
              onReorderPin={reorderPinnedProject}
              onTogglePin={togglePinProject}
              project={project}
              showGitStatus={showGitStatus}
              terminalApp={terminalApp}
              workspaceApps={workspaceApps}
              workspacePath={project.parentFolder}
            />
          ))}
        </List.Section>
      )}

      {parentWorkspaces.map((workspace) => {
        const workspaceProjects = projectsByWorkspace[workspace] || [];

        if (workspaceProjects.length === 0) {
          return null;
        }

        return (
          <List.Section key={workspace} subtitle={workspace} title={path.basename(workspace)}>
            {workspaceProjects.map((project: Project) => (
              <ProjectItem
                defaultApp={defaultApp}
                isPinned={pinnedSet.has(project.fullPath)}
                key={project.fullPath}
                onRefresh={loadData}
                onReorderPin={reorderPinnedProject}
                onTogglePin={togglePinProject}
                project={project}
                showGitStatus={showGitStatus}
                terminalApp={terminalApp}
                workspaceApps={workspaceApps}
                workspacePath={workspace}
              />
            ))}
          </List.Section>
        );
      })}

      {parentWorkspaces.length === 0 && !isLoading && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Get Started">
                <Action.Push target={<Settings onWorkspacesChanged={loadData} />} title="Open Settings" />
              </ActionPanel.Section>
            </ActionPanel>
          }
          description="Add a workspace in settings to see your projects."
          title="No Workspaces"
        />
      )}
      {parentWorkspaces.length > 0 && !isLoading && !searchText && !hasVisibleProjects && (
        <List.EmptyView
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Manage">
                <Action.Push target={<Settings onWorkspacesChanged={loadData} />} title="Open Settings" />
              </ActionPanel.Section>
            </ActionPanel>
          }
          description="No folders found inside your workspaces. Add or manage workspaces in settings."
          title="No Projects Found"
        />
      )}
    </List>
  );
}
