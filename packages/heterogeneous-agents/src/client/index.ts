import type { IconType } from '@lobehub/icons';
import {
  Amp,
  ClaudeCode,
  CodeBuddy,
  Codex,
  Cursor,
  DeepSeek,
  Devin,
  getLobeIconCDN,
  GithubCopilot,
  Grok,
  Kimi,
  OpenCode,
  Pi,
  Qoder,
  Trae,
} from '@lobehub/icons';

import { HETEROGENEOUS_AGENT_CONFIGS, LOCAL_RUNTIME_HETEROGENEOUS_AGENT_CONFIGS } from '../config';
import { DROID_AVATAR_URL, DroidIcon } from './DroidIcon';

export { DroidIcon };

type HeterogeneousAgentClientConfig = (typeof HETEROGENEOUS_AGENT_CONFIGS)[number] & {
  avatar: string;
  icon: IconType;
};

type LocalRuntimeHeterogeneousAgentClientConfig =
  (typeof LOCAL_RUNTIME_HETEROGENEOUS_AGENT_CONFIGS)[number] & {
    avatar: string;
    icon: IconType;
  };

const heterogeneousAgentIcons = {
  'amp': Amp,
  'claude-code': ClaudeCode,
  'codebuddy': CodeBuddy,
  'codex': Codex,
  'copilot': GithubCopilot,
  'cursor': Cursor,
  'droid': DroidIcon,
  'devin': Devin,
  'grok-build': Grok,
  'kimi-code': Kimi,
  'opencode': OpenCode,
  'pi': Pi,
  'qoder': Qoder,
  'trae': Trae,
} as const satisfies Record<HeterogeneousAgentClientConfig['type'], IconType>;

const createAgentAvatar = (iconId: string) =>
  iconId === 'Droid'
    ? DROID_AVATAR_URL
    : getLobeIconCDN(iconId, {
        cdn: 'aliyun',
        format: 'avatar',
      });

export const HETEROGENEOUS_AGENT_CLIENT_CONFIGS = HETEROGENEOUS_AGENT_CONFIGS.map((config) => ({
  ...config,
  avatar: createAgentAvatar(config.iconId),
  icon: heterogeneousAgentIcons[config.type],
})) as readonly HeterogeneousAgentClientConfig[];

export const LOCAL_RUNTIME_HETEROGENEOUS_AGENT_CLIENT_CONFIGS =
  LOCAL_RUNTIME_HETEROGENEOUS_AGENT_CONFIGS.map((config) => ({
    ...config,
    avatar: createAgentAvatar(config.iconId),
    icon: DeepSeek,
  })) as readonly LocalRuntimeHeterogeneousAgentClientConfig[];
