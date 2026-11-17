import type { WorkspaceListItem } from '../hooks/useActiveWorkspace';
import type { WorkspaceMemberWithProfile } from '../hooks/useWorkspaceMembers';

// Lazy: the hooks reading the workspace store sit under the tRPC client's own imports.
const client = async () => (await import('@/libs/trpc/client')).lambdaClient;
const workspaceClient = async (workspaceId: string) =>
  (await import('@/libs/trpc/client')).createWorkspaceLambdaClient(workspaceId);

/** The cloud workspace API (`workspace.*` on the LobeHub Cloud lambda router). */
export const workspaceService = {
  create: async (input: { name: string; slug: string }): Promise<WorkspaceListItem> =>
    (await client()).workspace.create.mutate(input) as Promise<WorkspaceListItem>,
  list: async (): Promise<WorkspaceListItem[]> =>
    (await client()).workspace.list.query() as Promise<WorkspaceListItem[]>,
  /**
   * Members of a workspace with their profiles. Pinned to that workspace rather than the active
   * one, so an answer can never land under another workspace's roster.
   */
  listMembers: async (workspaceId: string): Promise<WorkspaceMemberWithProfile[]> =>
    (await workspaceClient(workspaceId)).workspaceMember.list.query({
      includeDeleted: false,
    }) as Promise<WorkspaceMemberWithProfile[]>,
};
