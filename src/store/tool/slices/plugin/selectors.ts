import { type LobeTool, type Meta, type ToolManifest } from '@lobot/types';

import { isInstalledPluginAvailableInCurrentEnv } from '@/helpers/toolAvailability';
import { type InstallPluginMeta, type LobeToolCustomPlugin } from '@/types/tool/plugin';

import { type ToolStoreState } from '../../initialState';
import { INSTALLED_PLUGINS_KEY } from './projection';

const EMPTY_PLUGINS: LobeTool[] = [];

/**
 * The installed-plugins list for display: identity, manifest and the runtime
 * discriminators. On a reload it is the persisted display projection until the
 * network answers, so it never carries `settings` or connection parameters
 * there — read those through {@link confirmedInstalledPlugins}.
 */
const installedPlugins = (s: ToolStoreState) => s.installedPlugins;

/**
 * Whether the list on screen is only the persisted display projection (hydrated
 * from IndexedDB, not yet confirmed by the server).
 */
const isInstalledPluginsCacheOnly = (s: ToolStoreState) =>
  s.installedPluginsReplica?.entries[INSTALLED_PLUGINS_KEY]?.source === 'storage';

/**
 * The full installed-plugin records — settings and MCP connection included —
 * that tool assembly, tool execution, edit forms and writes may act on. Empty
 * while only the cached display projection is loaded — the same empty list
 * these paths saw before the first fetch landed when there was no cache.
 */
const confirmedInstalledPlugins = (s: ToolStoreState) =>
  isInstalledPluginsCacheOnly(s) ? EMPTY_PLUGINS : s.installedPlugins;

/**
 * Marketplace `PluginManifest` shape (`@lobehub/market-types`): flat
 * `name` / `description` / `icon` and no `meta` object. The server-side agent
 * builder install path stores this shape verbatim in `user_installed_plugins`,
 * so a community MCP row can reach the client without `manifest.meta`.
 */
interface MarketShapedManifest {
  description?: string;
  icon?: string;
  meta?: Meta;
  name?: string;
  tags?: string[];
}

/**
 * Resolve the display meta of an installed plugin manifest.
 *
 * Prefers the LobeChat `manifest.meta`; when it is absent, derive it from the
 * marketplace shape so the row still renders its real name instead of a blank
 * label.
 */
const resolvePluginManifestMeta = (manifest?: ToolManifest | null): Meta | undefined => {
  if (!manifest) return;
  if (manifest.meta) return manifest.meta;

  const { description, icon, name, tags } = manifest as MarketShapedManifest;
  // `Meta.title` is required; without a market `name` there is nothing to
  // derive and consumers fall back to the identifier.
  if (!name) return;

  return {
    avatar: icon,
    description,
    tags,
    title: name,
  };
};

const getPluginMetaById = (id: string) => (s: ToolStoreState) => {
  return resolvePluginManifestMeta(getToolManifestById(id)(s));
};

const getCustomPluginById = (id: string) => (s: ToolStoreState) =>
  confirmedInstalledPlugins(s).find((i) => i.identifier === id && i.type === 'customPlugin') as
    LobeToolCustomPlugin | undefined;

const getToolManifestById = (id: string) => (s: ToolStoreState) =>
  installedPlugins(s).find((p) => p.identifier === id)?.manifest;

/** Manifests offered to the model: only plugins whose full record is loaded. */
const installedPluginManifestList = (s: ToolStoreState) =>
  confirmedInstalledPlugins(s)
    .map((i) => i.manifest as ToolManifest)
    .filter((i) => !!i);

const installedPluginMetaList = (s: ToolStoreState) =>
  installedPlugins(s)
    // Filter out Composio plugins (they have their own display location)
    .filter((p) => !p.customParams?.composio)
    .filter((plugin) => isInstalledPluginAvailableInCurrentEnv(plugin))
    .map<InstallPluginMeta>((p) => ({
      author: p.manifest?.author,
      createdAt: p.manifest?.createdAt || (p.manifest as any)?.createAt,
      homepage: p.manifest?.homepage,
      identifier: p.identifier,
      /*
       * should remove meta
       */
      meta: getPluginMetaById(p.identifier)(s),
      runtimeType: p.runtimeType,
      type: p.source || p.type,
      ...getPluginMetaById(p.identifier)(s),
    }));

export const pluginSelectors = {
  confirmedInstalledPlugins,
  getCustomPluginById,
  getPluginMetaById,
  getToolManifestById,
  installedPluginManifestList,
  installedPluginMetaList,
  installedPlugins,
  isInstalledPluginsCacheOnly,
};
