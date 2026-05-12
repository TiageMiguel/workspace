import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

interface ImportSettingsFormProps {
  onImport: (filePath: string) => Promise<boolean>;
}

interface ImportSettingsFormValues {
  file: string[];
}

export default function ImportSettingsForm({ onImport }: ImportSettingsFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<ImportSettingsFormValues>({
    async onSubmit(values) {
      const imported = await onImport(values.file[0]);
      if (imported) {
        pop();
      }
    },
    validation: {
      file: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Import">
            <Action.SubmitForm onSubmit={handleSubmit} title="Import Settings" />
          </ActionPanel.Section>
        </ActionPanel>
      }
      navigationTitle="Import Settings"
    >
      <Form.FilePicker
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        title="Settings File"
        {...itemProps.file}
      />
    </Form>
  );
}
