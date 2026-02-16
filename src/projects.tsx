import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState } from "react";
import Settings from "./components/Settings";
import Walkthrough from "./components/Walkthrough";
import path from "path";

import { useWorkspace } from "./hooks/useWorkspace";
import { Project } from "./types";

export default function Command() {
  const {
    folders: parentFolders,
    pinnedProjects,
    defaultApp,
    folderApps,
    projectGitStatus,
    isLoading,
    loadData,
    getSubdirectories,
    walkthroughCompleted,
    setWalkthroughCompleted,
    togglePinProject,
  } = useWorkspace();

  const [searchText, setSearchText] = useState("");

  const filteredFolders = parentFolders.map((folder) => ({
    name: path.basename(folder),
    path: folder,
    projects: getSubdirectories(folder).filter((p) => p.name.toLowerCase().includes(searchText.toLowerCase())),
  }));

  const allProjects = filteredFolders.flatMap((f) => f.projects);
  const pinnedList = allProjects.filter((p) => pinnedProjects.includes(p.fullPath));

  if (!isLoading && !walkthroughCompleted) {
    return (
      <Walkthrough
        onComplete={() => setWalkthroughCompleted(true)}
        folders={parentFolders}
        defaultApp={defaultApp}
        loadData={loadData}
      />
    );
  }

  const ProjectItem = ({ project, folderPath }: { project: Project; folderPath: string }) => {
    const gitStatus = projectGitStatus[project.fullPath];
    const folderApp = folderApps[folderPath];
    const appToUse = folderApp || defaultApp;
    const isPinned = pinnedProjects.includes(project.fullPath);

    return (
      <List.Item
        title={project.name}
        subtitle={isPinned ? path.dirname(project.fullPath) : ""}
        icon={Icon.Folder}
        accessories={[
          ...(gitStatus
            ? [
                {
                  tag: {
                    value: `${gitStatus.pull ? `${gitStatus.pull}↓ ` : ""}${
                      gitStatus.push ? `${gitStatus.push}↑ ` : ""
                    }${gitStatus.branch}`,
                    color: Color.Green,
                  },
                  tooltip: `Branch: ${gitStatus.branch}\nPull: ${gitStatus.pull || 0}\nPush: ${gitStatus.push || 0}`,
                },
              ]
            : []),
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Open
                title={`Open in ${appToUse?.name || "Default App"}`}
                target={project.fullPath}
                application={appToUse?.bundleId}
              />
              <Action
                title={isPinned ? "Unpin Project" : "Pin Project"}
                icon={isPinned ? Icon.PinDisabled : Icon.Pin}
                shortcut={{ modifiers: ["cmd"], key: "p" }}
                onAction={() => togglePinProject(project.fullPath)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.ShowInFinder path={project.fullPath} />
              <Action.OpenWith path={project.fullPath} />
            </ActionPanel.Section>
            <ActionPanel.Section title="Copy">
              <Action.CopyToClipboard title="Copy Project Name" content={project.name} />
              <Action.CopyToClipboard
                title="Copy Project Path"
                content={project.fullPath}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.Push
                title="Settings"
                icon={Icon.Gear}
                target={<Settings onFoldersChanged={loadData} />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects..." onSearchTextChange={setSearchText} throttle>
      {pinnedList.length > 0 && (
        <List.Section title="Pinned">
          {pinnedList.map((project) => (
            <ProjectItem key={`pinned-${project.fullPath}`} project={project} folderPath={project.parentFolder} />
          ))}
        </List.Section>
      )}

      {filteredFolders.map((folder) => (
        <List.Section key={folder.path} title={folder.name} subtitle={folder.path}>
          {folder.projects.map((project) => (
            <ProjectItem key={project.fullPath} project={project} folderPath={folder.path} />
          ))}
        </List.Section>
      ))}

      {parentFolders.length === 0 && (
        <List.EmptyView
          title="No Project Folders"
          description="Add a folder in settings to see your projects."
          actions={
            <ActionPanel>
              <Action.Push title="Open Settings" target={<Settings onFoldersChanged={loadData} />} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
