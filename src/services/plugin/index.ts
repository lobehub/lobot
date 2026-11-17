import { type LobeTool, type ToolManifest } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';
import { type LobeToolCustomPlugin } from '@/types/tool/plugin';

interface InstallPluginParams {
  customParams?: Record<string, any>;
  identifier: string;
  manifest: ToolManifest;
  settings?: Record<string, any>;
  type: 'plugin' | 'customPlugin';
}

export class PluginService {
  getInstalledPlugins = (): Promise<LobeTool[]> => {
    return lambdaClient.plugin.getPlugins.query();
  };

  updatePluginManifest = async (id: string, manifest: ToolManifest): Promise<void> => {
    await lambdaClient.plugin.updatePlugin.mutate({ id, manifest });
  };
}

export const pluginService = new PluginService();
