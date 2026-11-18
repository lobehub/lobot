import { type LobeTool } from '@lobot/types';

import { type MetaData } from '@/types/meta';

const getPluginTitle = (meta?: MetaData) => meta?.title;
const getPluginAvatar = (meta?: MetaData) => meta?.avatar || '🧩';

const isCustomPlugin = (id: string, pluginList: LobeTool[]) =>
  pluginList.some((i) => i.identifier === id && i.type === 'customPlugin');

export const pluginHelpers = {
  getPluginAvatar,
  getPluginTitle,
  isCustomPlugin,
};
