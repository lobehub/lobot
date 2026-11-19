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
