import { type PartialDeep } from 'type-fest';

import { type UserSettings } from '@/types/user/settings';

class ShareService {
  /**
   * Decode share settings from search params
   * @param settings
   * @returns
   */
  decodeShareSettings = (settings: string) => {
    try {
      return { data: JSON.parse(settings) as PartialDeep<UserSettings> };
    } catch (e) {
      return { message: JSON.stringify(e) };
    }
  };
}

export const shareService = new ShareService();
