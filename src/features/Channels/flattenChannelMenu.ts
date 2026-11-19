import { type DropdownItem } from '@lobehub/ui';

/**
 * The menu with More's rare actions lifted back to the top level, for callers that pick single
 * actions out of it by key.
 */
export const flattenChannelMenu = (items: DropdownItem[]): DropdownItem[] =>
  items.flatMap((item) =>
    item && 'key' in item && item.key === 'more' && 'children' in item && item.children
      ? (item.children as DropdownItem[])
      : [item],
  );

/**
 * The menu without More, for the message list: a row keeps the person's own list settings only.
 * Managing the Channel lives in its header and settings. The divider that led into More goes too.
 */
export const withoutChannelMore = (items: DropdownItem[]): DropdownItem[] => {
  const kept = items.filter((item) => !(item && 'key' in item && item.key === 'more'));
  while (kept.length > 0) {
    const last = kept.at(-1);
    if (!(last && 'type' in last && last.type === 'divider')) break;
    kept.pop();
  }
  return kept;
};
