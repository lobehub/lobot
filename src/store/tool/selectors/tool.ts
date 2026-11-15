import { type ToolManifest } from '@lobechat/types';

import { type MetaData } from '@/types/meta';
import { type LobeToolMeta } from '@/types/tool/tool';

import { type ToolStoreState } from '../initialState';
import { lobehubSkillStoreSelectors } from '../slices/lobehubSkillStore';
import { pluginSelectors } from '../slices/plugin/selectors';

const metaList = (s: ToolStoreState): LobeToolMeta[] => {
  const pluginList = pluginSelectors.installedPluginMetaList(s) as LobeToolMeta[];
  const lobehubSkillList = lobehubSkillStoreSelectors.metaList(s) as LobeToolMeta[];

  return pluginList.concat(lobehubSkillList);
};

const getMetaById =
  (id: string) =>
  (s: ToolStoreState): MetaData | undefined => {
    const item = metaList(s).find((m) => m.identifier === id);

    if (!item) return;

    if (item.meta) return item.meta;

    return {
      avatar: item?.avatar,
      backgroundColor: item?.backgroundColor,
      description: item?.description,
      title: item?.title,
    };
  };

const getManifestById =
  (id: string) =>
  (s: ToolStoreState): ToolManifest | undefined =>
    pluginSelectors.installedPluginManifestList(s).find((i) => i.identifier === id);

// Get plugin manifest loading status
const getManifestLoadingStatus = (id: string) => (s: ToolStoreState) => {
  const manifest = getManifestById(id)(s);

  if (s.pluginInstallLoading[id]) return 'loading';

  if (s.pluginInstallErrors[id]) return 'error';

  if (!manifest) return 'error';

  if (!!manifest) return 'success';
};

const getPluginInstallError = (id: string) => (s: ToolStoreState) => s.pluginInstallErrors[id];

const isToolHasUI = (id: string) => (s: ToolStoreState) => {
  const manifest = getManifestById(id)(s);

  return !!manifest?.ui;
};

export const toolSelectors = {
  getManifestById,
  getManifestLoadingStatus,
  getPluginInstallError,
  getMetaById,
  isToolHasUI,
  metaList,
};
