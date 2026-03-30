import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import path from "path";
import { useMemo } from "react";

import Settings from "@/components/Settings";
import { App, GitStatus, Project } from "@/types";

interface ProjectItemProps {
  defaultApp: App | null;
  isPinned: boolean;
  onRefresh: () => Promise<void>;
  onReorderPin: (fullPath: string, direction: "down" | "up") => Promise<void>;
  onTogglePin: (fullPath: string) => Promise<void>;
  project: Project;
  showGitStatus: boolean;
  terminalApp: App | null;
  workspaceApps: Record<string, App>;
  workspacePath: string;
}

export default function ProjectItem({
  defaultApp,
  isPinned,
  onRefresh,
  onReorderPin,
  onTogglePin,
  project,
  showGitStatus,
  terminalApp,
  workspaceApps,
  workspacePath,
}: ProjectItemProps) {
  const workspaceApp = workspaceApps[workspacePath];
  const appToUse = workspaceApp || defaultApp;

  const gitColor = useMemo(() => getGitColor(project.gitStatus), [project.gitStatus]);

  return (
    <List.Item
      accessories={[
        ...(project.gitStatus && showGitStatus
          ? [
              {
                tag: {
                  color: gitColor,
                  value: formatGitBadge(project.gitStatus),
                },
                tooltip: `Branch: ${project.gitStatus.branch}\nPull: ${project.gitStatus.pull}\nPush: ${project.gitStatus.push}`,
              },
            ]
          : []),
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open
              application={appToUse?.bundleId}
              icon={Icon.AppWindow}
              target={project.fullPath}
              title={appToUse ? `Open in ${appToUse.name}` : "Open Project"}
            />
            <Action.Open
              application={terminalApp?.bundleId}
              icon={Icon.Terminal}
              shortcut={{ key: "t", modifiers: ["cmd", "shift"] }}
              target={project.fullPath}
              title="Open in Terminal"
            />
            <Action
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              onAction={() => onTogglePin(project.fullPath)}
              shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
              title={isPinned ? "Unpin Project" : "Pin Project"}
            />
            {isPinned && (
              <>
                <Action
                  icon={Icon.ArrowUp}
                  onAction={() => onReorderPin(project.fullPath, "up")}
                  shortcut={{ key: "arrowUp", modifiers: ["opt", "cmd"] }}
                  title="Move Pinned Project Up"
                />
                <Action
                  icon={Icon.ArrowDown}
                  onAction={() => onReorderPin(project.fullPath, "down")}
                  shortcut={{ key: "arrowDown", modifiers: ["opt", "cmd"] }}
                  title="Move Pinned Project Down"
                />
              </>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder path={project.fullPath} title="Show in Finder" />
            <Action.OpenWith path={project.fullPath} title="Open with…" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard content={project.name} title="Copy Project Name" />
            <Action.CopyToClipboard
              content={project.fullPath}
              shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
              title="Copy Project Path"
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.Gear}
              shortcut={{ key: ",", modifiers: ["cmd", "shift"] }}
              target={<Settings onWorkspacesChanged={onRefresh} />}
              title="Workspace Settings"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={Icon.Folder}
      subtitle={isPinned ? path.dirname(project.fullPath) : ""}
      title={project.name}
    />
  );
}

function formatGitBadge(gitStatus: GitStatus): string {
  const parts: string[] = [];

  if (gitStatus.pull) {
    parts.push(`${gitStatus.pull}↓`);
  }

  if (gitStatus.push) {
    parts.push(`${gitStatus.push}↑`);
  }

  parts.push(gitStatus.branch);

  return parts.join(" ");
}

function getGitColor(gitStatus: GitStatus | null | undefined): Color | undefined {
  if (!gitStatus) {
    return undefined;
  }

  return gitStatus.pull || gitStatus.push ? Color.Orange : Color.Green;
}
