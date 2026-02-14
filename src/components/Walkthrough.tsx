import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import AddFolderForm from "./AddFolderForm";
import SelectEditor from "./SelectEditor";
import { App } from "../types";

interface WalkthroughProps {
  onComplete: () => void;
  folders: string[];
  defaultApp: App | null;
  loadData: () => Promise<void>;
}

export default function Walkthrough({ onComplete, folders, defaultApp, loadData }: WalkthroughProps) {
  const hasFolders = folders.length > 0;
  const hasApp = !!defaultApp;
  const isReady = hasFolders && hasApp;

  const handleFinish = async () => {
    // await showHUD("🎉 You're all set!");
    onComplete();
  };

  return (
    <List>
      <List.Section title="Welcome to Workspace Projects 🚀">
        <List.Item
          title="1. Add Workspace Project Folder"
          subtitle={hasFolders ? `${folders[0]}` : "Select a folder containing your projects"}
          icon={getProgressIcon(hasFolders ? 1 : 0, Color.Green)}
          actions={
            <ActionPanel>
              <Action.Push title="Add Folder" icon={Icon.Folder} target={<AddFolderForm />} onPop={loadData} />
            </ActionPanel>
          }
        />
        <List.Item
          title="2. Default App"
          subtitle={hasApp ? `Selected App: ${defaultApp.name}` : "Choose the app to open your projects"}
          icon={getProgressIcon(hasApp ? 1 : 0, Color.Green)}
          actions={
            <ActionPanel>
              <Action.Push title="Select Editor" icon={Icon.AppWindow} target={<SelectEditor />} onPop={loadData} />
            </ActionPanel>
          }
        />
        {isReady && (
          <List.Item
            title="3. Finish Setup"
            subtitle="You're ready to go!"
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action title="Finish Walkthrough" icon={Icon.Check} onAction={handleFinish} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
