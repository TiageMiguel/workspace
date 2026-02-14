import { Form, ActionPanel, Action, showToast, Toast, popToRoot, useNavigation } from "@raycast/api";
import { useState } from "react";
import path from "path";

import { getStoredFolders, saveStoredFolders } from "../utils/storage";

export default function AddFolderForm() {
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const { pop } = useNavigation();

  async function handleSubmit() {
    if (selectedPaths.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No folder selected" });
      return;
    }

    const folderPath = selectedPaths[0];
    const folders = await getStoredFolders();

    if (folders.includes(folderPath)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Folder already added",
        message: path.basename(folderPath),
      });
      return;
    }

    folders.push(folderPath);
    await saveStoredFolders(folders);

    await showToast({
      style: Toast.Style.Success,
      title: "Workspace Folder added",
      message: path.basename(folderPath),
    });

    try {
      pop();
    } catch {
      // Fallback if popped from root or standalone
      popToRoot();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Folder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Workspace Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        value={selectedPaths}
        onChange={setSelectedPaths}
      />
      <Form.Description text="Select a parent folder that contains your workspace projects." />
    </Form>
  );
}
