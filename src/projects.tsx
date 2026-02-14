import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import AddFolderForm from "./components/AddFolderForm";
import Settings from "./components/Settings";
import path from "path";

import { useWorkspace } from "./hooks/useWorkspace";
import { Project } from "./types";

export default function Command() {
  const {
    folders: parentFolders,
    defaultApp: defaultEditor,
    folderApps: folderEditors,
    projectGitStatus,
    isLoading,
    loadData,
    getSubdirectories,
  } = useWorkspace();

  const allProjects: { folder: string; projects: Project[] }[] = parentFolders.map((folder) => ({
    folder,
    projects: getSubdirectories(folder).map((p) => ({
      ...p,
      gitStatus: projectGitStatus[p.fullPath],
    })),
  }));

  const globalEditorName = defaultEditor?.name || "Select App to open";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects...">
      {parentFolders.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Workspace Folders Added"
          description="Use the 'Add Workspace Folder' command to add one."
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push title="Add Workspace Folder" icon={Icon.Plus} target={<AddFolderForm />} onPop={loadData} />
              <Action.Push
                title="Settings"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                target={<Settings onFoldersChanged={loadData} />}
                onPop={loadData}
              />
            </ActionPanel>
          }
        />
      ) : (
        allProjects.map(({ folder, projects }) => {
          const folderEditor = folderEditors[folder] || defaultEditor;
          const currentEditorName = folderEditor?.name || globalEditorName;
          const currentEditorBundleId = folderEditor?.bundleId;

          return (
            <List.Section key={folder} title={path.basename(folder)} subtitle={folder}>
              {projects.map((project) => (
                <List.Item
                  key={project.fullPath}
                  icon={{ source: Icon.Folder, tintColor: Color.Blue }}
                  title={project.name}
                  subtitle={path.basename(folder)}
                  accessories={[
                    project.gitStatus
                      ? {
                          tag: {
                            value: `${project.gitStatus.pull ? `${project.gitStatus.pull}↓ ` : ""}${
                              project.gitStatus.push ? `${project.gitStatus.push}↑ ` : ""
                            }${project.gitStatus.branch}`,
                            color: Color.Green,
                          },
                          tooltip: `Branch: ${project.gitStatus.branch}\nPull: ${project.gitStatus.pull || 0}\nPush: ${project.gitStatus.push || 0}`,
                        }
                      : {},
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section title="Open">
                        {currentEditorBundleId ? (
                          <Action.Open
                            title={`Open in ${currentEditorName}`}
                            target={project.fullPath}
                            application={currentEditorBundleId}
                            icon={Icon.Code}
                          />
                        ) : (
                          <Action.Push
                            title="Select Code Editor"
                            icon={Icon.Gear}
                            target={<Settings onFoldersChanged={loadData} />}
                            onPop={loadData}
                          />
                        )}
                        <Action.Push
                          title="Add Workspace Folder"
                          icon={Icon.Plus}
                          shortcut={{ modifiers: ["cmd"], key: "enter" }}
                          target={<AddFolderForm />}
                          onPop={loadData}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Actions">
                        <Action.ShowInFinder path={project.fullPath} />
                        <Action.OpenWith path={project.fullPath} />
                        <Action.CopyToClipboard
                          title="Copy Path"
                          content={project.fullPath}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Settings">
                        <Action.Push
                          title="Open Settings"
                          icon={Icon.Gear}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                          target={<Settings onFoldersChanged={loadData} />}
                          onPop={loadData}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })
      )}
    </List>
  );
}
