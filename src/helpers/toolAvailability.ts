import { isDesktop } from '@lobechat/const';

import { shouldEnableTool } from './toolFilters';

/** Builtin skills the product drives itself; never listed to the user. */
const USER_HIDDEN_BUILTIN_SKILLS = new Set<string>(['task']);

/** Builtin skills that only work where the run can execute commands on a device. */
const DEVICE_ONLY_BUILTIN_SKILLS = new Set<string>(['lobe-agent-browser']);

export interface ToolAvailabilityInstalledPlugin {
  customParams?: {
    mcp?: {
      type?: string;
    } | null;
  } | null;
  identifier: string;
}

export interface ToolAvailabilityContext {
  installedPlugins?: ToolAvailabilityInstalledPlugin[];
  isDesktop?: boolean;
}

export const isBuiltinToolAvailableInCurrentEnv = (id: string) => shouldEnableTool(id);

export const isBuiltinSkillAvailableInCurrentEnv = (
  id: string,
  context: Omit<ToolAvailabilityContext, 'installedPlugins'> = {},
) => {
  if (USER_HIDDEN_BUILTIN_SKILLS.has(id)) return false;
  if (DEVICE_ONLY_BUILTIN_SKILLS.has(id)) return context.isDesktop ?? isDesktop;
  return true;
};

export const isInstalledPluginAvailableInCurrentEnv = (
  plugin: ToolAvailabilityInstalledPlugin,
  context: Omit<ToolAvailabilityContext, 'installedPlugins'> = {},
) => (context.isDesktop ?? isDesktop) || plugin.customParams?.mcp?.type !== 'stdio';

export const isToolAvailableInCurrentEnv = (id: string, context: ToolAvailabilityContext = {}) => {
  if (!isBuiltinToolAvailableInCurrentEnv(id)) return false;
  if (!isBuiltinSkillAvailableInCurrentEnv(id, context)) return false;

  const plugin = context.installedPlugins?.find((item) => item.identifier === id);

  if (!plugin) return true;

  return isInstalledPluginAvailableInCurrentEnv(plugin, context);
};

export const filterToolIdsByCurrentEnv = (ids: string[], context: ToolAvailabilityContext = {}) =>
  ids.filter((id) => isToolAvailableInCurrentEnv(id, context));
