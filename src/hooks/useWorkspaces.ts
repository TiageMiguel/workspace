import { useCachedState } from "@raycast/utils";

import { App } from "@/types";
import { STORAGE_KEY_WORKSPACE_APPS, STORAGE_KEY_WORKSPACES } from "@/utils/constants";

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useCachedState<string[]>(STORAGE_KEY_WORKSPACES, []);
  const [workspaceApps, setWorkspaceApps] = useCachedState<Record<string, App>>(STORAGE_KEY_WORKSPACE_APPS, {});

  const updateWorkspaces = async (newWorkspaces: string[]): Promise<void> => setWorkspaces(newWorkspaces);
  const updateWorkspaceApps = async (newWorkspaceApps: Record<string, App>): Promise<void> =>
    setWorkspaceApps(newWorkspaceApps);

  return {
    updateWorkspaceApps,
    updateWorkspaces,
    workspaceApps,
    workspaces,
  };
}
