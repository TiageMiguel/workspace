import { Form, ActionPanel, Action, showToast, Toast, popToRoot, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import path from "path";

import { getStoredFolders, saveStoredFolders } from "../utils/storage";

interface AddFolderFormProps {
  onDone?: () => void;
}

interface FormValues {
  folder: string[];
}

export default function AddFolderForm({ onDone }: AddFolderFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const folderPath = values.folder[0];
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

      if (onDone) {
        onDone();
      } else {
        try {
          pop();
        } catch {
          // Fallback if popped from root or standalone
          popToRoot();
        }
      }
    },
    validation: {
      folder: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Add Folder"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Folder" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Add Workspace Folder"
        text="Select a parent folder that contains your workspace projects. You can manage your folders later in the extension Settings."
      />
      <Form.FilePicker
        title="Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        {...itemProps.folder}
      />
    </Form>
  );
}
