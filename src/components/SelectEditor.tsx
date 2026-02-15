import { Action, ActionPanel, Icon, List, useNavigation, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getApplications, type Application } from "@raycast/api";

import { saveStoredApp } from "../utils/storage";

interface SelectEditorProps {
  onSelect?: (app: Application) => void;
  onReset?: () => void;
}

export default function SelectEditor({ onSelect, onReset }: SelectEditorProps) {
  const { pop } = useNavigation();
  const { isLoading, data: apps } = usePromise(getApplications);

  const setEditor = async (app: Application) => {
    if (onSelect) {
      onSelect(app);
      pop(); // Fix: Return to settings after selection
      return;
    }

    // Default behavior for Settings: save and pop
    await saveStoredApp({ name: app.name, bundleId: app.bundleId || "" });
    await showToast({ style: Toast.Style.Success, title: "App Updated", message: app.name });
    pop();
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for an application...">
      {onReset && (
        <List.Item
          title="Use Default App"
          subtitle="Remove folder-specific override"
          icon={Icon.ArrowCounterClockwise}
          actions={
            <ActionPanel>
              <Action
                title="Select Default App"
                onAction={() => {
                  onReset();
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      )}
      {apps?.map((app) => (
        <List.Item
          key={app.path}
          title={app.name}
          icon={{ fileIcon: app.path }}
          actions={
            <ActionPanel>
              <Action title="Select App" icon={Icon.Check} onAction={() => setEditor(app)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
