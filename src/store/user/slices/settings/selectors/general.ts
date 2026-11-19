import { isDesktop } from '@lobechat/const';

import { DEFAULT_LANG } from '@/const/locale';
import { type Locales, normalizeLocale } from '@/locales/resources';
import { type ContextMenuMode, type UserGeneralConfig } from '@/types/user/settings';
import { getSystemLanguage } from '@/utils/client/systemLanguage';
import { isOnServerSide } from '@/utils/env';

import { type UserStore } from '../../../store';
import { currentSettings } from './settings';

const generalConfig = (s: UserStore) => currentSettings(s).general || {};

/**
 * Lobot offers no neutral-color or context-menu picker, so a value saved from
 * LobeHub never applies here: both settings stay on their defaults.
 */
const neutralColor = (_s: UserStore): UserGeneralConfig['neutralColor'] => undefined;
const primaryColor = (s: UserStore) => generalConfig(s).primaryColor;
const fontSize = (s: UserStore) => generalConfig(s).fontSize;
const transitionMode = (s: UserStore) => generalConfig(s).transitionMode;
const animationMode = (s: UserStore) => generalConfig(s).animationMode;
const contextMenuMode = (_s: UserStore): ContextMenuMode => (isDesktop ? 'default' : 'disabled');
const responseLanguage = (s: UserStore) => generalConfig(s).responseLanguage;
const currentResponseLanguage = (s: UserStore): Locales => {
  const locale = responseLanguage(s);

  if (locale) return normalizeLocale(locale);
  if (isOnServerSide) return DEFAULT_LANG;

  return normalizeLocale(getSystemLanguage());
};
const telemetry = (s: UserStore) => generalConfig(s).telemetry;
const enableAutoScrollOnStreaming = (s: UserStore) =>
  generalConfig(s).enableAutoScrollOnStreaming ?? true;
const enableMessageLinkIcon = (s: UserStore) => generalConfig(s).enableMessageLinkIcon ?? true;
// Users who switched off the retired `enableInputMarkdown` lab did so to keep pasted text verbatim.
const enablePasteAutoConvert = (s: UserStore) =>
  generalConfig(s).enablePasteAutoConvert ?? s.preference.lab?.enableInputMarkdown !== false;
const fontAntialiasing = (s: UserStore) => generalConfig(s).fontAntialiasing ?? true;
/** The workspace column is opt-in. An unset value stays hidden. */
const showWorkspaceRail = (s: UserStore) => generalConfig(s).showWorkspaceRail === true;
/** The setting is a boolean: either the live tool list is open or it is a
 *  summary row. "Open" means the full list — the height-capped middle level
 *  just hid part of what the user asked to see. */
const workflowStreamingExpandLevel = (s: UserStore) =>
  generalConfig(s).expandWorkflowWhileStreaming ? 'full' : 'collapsed';

export const userGeneralSettingsSelectors = {
  animationMode,
  config: generalConfig,
  contextMenuMode,
  enableAutoScrollOnStreaming,
  enableMessageLinkIcon,
  enablePasteAutoConvert,
  fontAntialiasing,
  fontSize,
  neutralColor,
  primaryColor,
  currentResponseLanguage,
  responseLanguage,
  showWorkspaceRail,
  telemetry,
  transitionMode,
  workflowStreamingExpandLevel,
};
