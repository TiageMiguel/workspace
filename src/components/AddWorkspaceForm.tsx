import { Action, ActionPanel, Form, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import path from "path";

import { useWorkspace } from "@/hooks/useWorkspace";

interface AddWorkspaceFormProps {
  onDone?: () => void;
}

interface FormValues {
  workspace: string[];
}

export default function AddWorkspaceForm({ onDone }: AddWorkspaceFormProps) {
  const { pop } = useNavigation();
  const { updateWorkspaces, workspaces } = useWorkspace();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const workspacePath = path.resolve(values.workspace[0]);

      if (workspaces.includes(workspacePath)) {
        await showToast({
          message: path.basename(workspacePath),
          style: Toast.Style.Failure,
          title: "Workspace already added",
        });

        return;
      }

      const newWorkspaces = [...workspaces, workspacePath];

      await updateWorkspaces(newWorkspaces);
      await showToast({
        message: path.basename(workspacePath),
        style: Toast.Style.Success,
        title: "Workspace Added",
      });

      if (onDone) {
        onDone();
      } else {
        try {
          pop();
        } catch {
          popToRoot();
        }
      }
    },
    validation: {
      workspace: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Workspace">
            <Action.SubmitForm onSubmit={handleSubmit} title="Add Workspace" />
          </ActionPanel.Section>
        </ActionPanel>
      }
      navigationTitle="Add Workspace"
    >
      <Form.Description
        text="Select a parent folder (workspace) that contains your projects. You can manage your workspaces later in the extension settings."
        title="How It Works"
      />
      <Form.FilePicker
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        title="Workspace"
        {...itemProps.workspace}
      />
    </Form>
  );
}
