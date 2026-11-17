import { toolsClient } from '@/libs/trpc/client';
import {
  type CallToolResult,
  type ExecInSandboxInput,
  type ExportAndUploadFileInput,
  type ExportAndUploadFileResult,
} from '@/server/routers/tools/market';

class CloudSandboxService {
  /**
   * Call a cloud sandbox tool
   * @param toolName - The name of the tool to call (e.g., 'runCommand', 'writeFile')
   * @param params - The parameters for the tool
   * @param context - Session context containing topicId and optional userId for isolation
   */
  async callTool(
    toolName: string,
    params: Record<string, any>,
    context: { topicId: string; userId?: string },
  ): Promise<CallToolResult> {
    const input: ExecInSandboxInput = {
      params,
      toolName,
      topicId: context.topicId,
      userId: context.userId,
    };

    return toolsClient.market.execInSandbox.mutate(input);
  }
}

export const cloudSandboxService = new CloudSandboxService();
