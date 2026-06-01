import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { type Application } from "@raycast/api";

import ImportSettingsForm from "@/components/ImportSettingsForm";
import SelectEditor from "@/components/SelectEditor";
import { App } from "@/types";

interface GeneralSettingsProps {
  defaultApp: App | null;
  onExportSettings: () => Promise<void>;
  onImportSettings: (filePath: string) => Promise<boolean>;
  terminalApp: App | null;
  updateDefaultApp: (app: App | null) => Promise<void>;
  updateTerminalApp: (app: App | null) => Promise<void>;
  updateViewMode: (mode: "grid" | "list") => Promise<void>;
  viewMode: "grid" | "list";
}

export default function GeneralSettings({
  defaultApp,
  onExportSettings,
  onImportSettings,
  terminalApp,
  updateDefaultApp,
  updateTerminalApp,
  updateViewMode,
  viewMode,
}: GeneralSettingsProps) {
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

  return (
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
              <Action icon={Icon.Download} onAction={onExportSettings} title="Export Settings to Downloads" />
              <Action.Push
                icon={Icon.Upload}
                target={<ImportSettingsForm onImport={onImportSettings} />}
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
  );
}
