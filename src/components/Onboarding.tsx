import { Action, ActionPanel, type Application, Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

import AddWorkspaceForm from "@/components/AddWorkspaceForm";
import ImportSettingsForm from "@/components/ImportSettingsForm";
import SelectEditor from "@/components/SelectEditor";
import Settings from "@/components/Settings";
import { App } from "@/types";

interface OnboardingProps {
  defaultApp: App | null;
  loadData: () => Promise<void>;
  onComplete: () => void;
  onImportSettings: (filePath: string) => Promise<boolean>;
  onSelectDefaultApp: (app: Application) => Promise<void>;
  workspaces: string[];
}

export default function Onboarding({
  defaultApp,
  loadData,
  onComplete,
  onImportSettings,
  onSelectDefaultApp,
  workspaces,
}: OnboardingProps) {
  const hasWorkspaces = workspaces.length > 0;
  const hasApp = !!defaultApp;
  const isReady = hasWorkspaces && hasApp;
  const nextStep = !hasWorkspaces ? "Add your first workspace" : !hasApp ? "Choose a default app" : "Finish onboarding";

  return (
    <List navigationTitle="Workspace Onboarding">
      <List.Section title="Workspace">
        <List.Item
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Next Step">
                {!hasWorkspaces && (
                  <Action.Push
                    icon={Icon.Folder}
                    shortcut={{ key: "n", modifiers: ["cmd"] }}
                    target={<AddWorkspaceForm />}
                    title="Add Workspace"
                  />
                )}
                {hasWorkspaces && !hasApp && (
                  <Action.Push
                    icon={Icon.AppWindow}
                    shortcut={{ key: "e", modifiers: ["cmd"] }}
                    target={<SelectEditor onSelect={onSelectDefaultApp} />}
                    title="Select Default App"
                  />
                )}
                {isReady && <Action icon={Icon.Check} onAction={onComplete} title="Finish Onboarding" />}
              </ActionPanel.Section>
              <ActionPanel.Section title="Setup Actions">
                <Action.Push
                  icon={Icon.Folder}
                  onPop={loadData}
                  shortcut={{ key: "n", modifiers: ["cmd"] }}
                  target={<AddWorkspaceForm />}
                  title="Add Workspace"
                />
                <Action.Push
                  icon={Icon.AppWindow}
                  shortcut={{ key: "e", modifiers: ["cmd"] }}
                  target={<SelectEditor onSelect={onSelectDefaultApp} />}
                  title="Select Default App"
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Navigation">
                <Action.Push
                  icon={Icon.Gear}
                  shortcut={{ key: ".", modifiers: ["cmd", "shift"] }}
                  target={<Settings onWorkspacesChanged={loadData} />}
                  title="Open Settings"
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          icon={Icon.Info}
          subtitle={`Next step: ${nextStep}. You can always change these later in Settings.`}
          title="Setup Guide"
        />
        <List.Item
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Workspace">
                <Action.Push
                  icon={Icon.Folder}
                  onPop={loadData}
                  shortcut={{ key: "n", modifiers: ["cmd"] }}
                  target={<AddWorkspaceForm />}
                  title="Add Workspace"
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Navigation">
                <Action.Push
                  icon={Icon.Gear}
                  shortcut={{ key: ".", modifiers: ["cmd", "shift"] }}
                  target={<Settings onWorkspacesChanged={loadData} />}
                  title="Open Settings"
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          icon={getProgressIcon(hasWorkspaces ? 1 : 0, Color.Green)}
          subtitle={
            hasWorkspaces
              ? `${workspaces.length} workspace${workspaces.length > 1 ? "s" : ""} added`
              : "Choose a parent folder that contains your projects"
          }
          title="1. Add Workspace"
        />
        <List.Item
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Application">
                <Action.Push
                  icon={Icon.AppWindow}
                  onPop={loadData}
                  shortcut={{ key: "e", modifiers: ["cmd"] }}
                  target={<SelectEditor onSelect={onSelectDefaultApp} />}
                  title="Select App"
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Navigation">
                <Action.Push
                  icon={Icon.Gear}
                  shortcut={{ key: ".", modifiers: ["cmd", "shift"] }}
                  target={<Settings onWorkspacesChanged={loadData} />}
                  title="Open Settings"
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          icon={getProgressIcon(hasApp ? 1 : 0, Color.Green)}
          subtitle={hasApp ? `Selected: ${defaultApp.name}` : "Choose which app opens your projects"}
          title="2. Default App"
        />
        {isReady && (
          <List.Item
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Complete">
                  <Action icon={Icon.Check} onAction={onComplete} title="Finish Onboarding" />
                </ActionPanel.Section>
                <ActionPanel.Section title="Navigation">
                  <Action.Push
                    icon={Icon.Gear}
                    shortcut={{ key: ".", modifiers: ["cmd", "shift"] }}
                    target={<Settings onWorkspacesChanged={loadData} />}
                    title="Open Settings"
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            subtitle="You're ready to go."
            title="3. Finish Setup"
          />
        )}
      </List.Section>
      <List.Section title="Import Existing Setup">
        <List.Item
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Import">
                <Action.Push
                  icon={Icon.Upload}
                  target={<ImportSettingsForm onImport={onImportSettings} />}
                  title="Import Settings File"
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Navigation">
                <Action.Push
                  icon={Icon.Gear}
                  shortcut={{ key: ".", modifiers: ["cmd", "shift"] }}
                  target={<Settings onWorkspacesChanged={loadData} />}
                  title="Open Settings"
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          icon={Icon.Upload}
          subtitle="Import a JSON backup to prefill workspaces, apps, and preferences"
          title="Import Settings File"
        />
      </List.Section>
    </List>
  );
}
