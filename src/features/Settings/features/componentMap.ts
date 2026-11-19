import { SettingsTabs } from '@/store/global/initialState';

import About from '../about';
import Appearance from '../appearance';
import Hotkey from '../hotkey';
import Language from '../language';
import { DesktopNotificationSettings } from '../notification';
import Profile from '../profile';
import Proxy from '../proxy';

/**
 * Lobot keeps only the everyday sections. They are imported directly so opening
 * the settings popup paints the page itself instead of a chunk skeleton.
 */
export const componentMap = {
  [SettingsTabs.Profile]: Profile,
  [SettingsTabs.Appearance]: Appearance,
  [SettingsTabs.Language]: Language,
  [SettingsTabs.Notification]: DesktopNotificationSettings,
  [SettingsTabs.Hotkey]: Hotkey,
  [SettingsTabs.Proxy]: Proxy,
  [SettingsTabs.About]: About,
};
