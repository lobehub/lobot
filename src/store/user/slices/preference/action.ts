import { userService } from '@/services/user';
import { type StoreSetter } from '@/store/types';
import { type UserStore } from '@/store/user';
import { type UserPreference } from '@/types/user';
import { merge } from '@/utils/merge';
import { setNamespace } from '@/utils/storeDebug';

import { writeUserDisplaySnapshot } from '../../displaySnapshot';

const n = setNamespace('preference');

type Setter = StoreSetter<UserStore>;
export const createPreferenceSlice = (set: Setter, get: () => UserStore, _api?: unknown) =>
  new PreferenceActionImpl(set, get, _api);

class PreferenceActionImpl {
  readonly #get: () => UserStore;
  readonly #set: Setter;

  constructor(set: Setter, get: () => UserStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  updatePreference = async (preference: Partial<UserPreference>, action?: any): Promise<void> => {
    const nextPreference = merge(this.#get().preference, preference);
    const userId = this.#get().user?.id;

    this.#set({ preference: nextPreference }, false, action || n('updatePreference'));

    await userService.updatePreference(nextPreference);

    writeUserDisplaySnapshot(userId, {
      preference: nextPreference,
    });
  };
}

export type PreferenceAction = Pick<PreferenceActionImpl, keyof PreferenceActionImpl>;
