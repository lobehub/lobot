import type { IEditor } from '@lobehub/editor';

type Listener = (itemKey: string) => void;

const listeners = new WeakMap<IEditor, Set<Listener>>();

/** Subscribes the number menu of `editor` to requests to open it on an item. */
export const onListNumberMenuRequest = (editor: IEditor, listener: Listener) => {
  const set = listeners.get(editor) ?? new Set();
  listeners.set(editor, set);
  set.add(listener);

  return () => {
    set.delete(listener);
  };
};
