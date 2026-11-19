import { type DropdownItem } from '@lobehub/ui';
import { describe, expect, it } from 'vitest';

import { flattenChannelMenu, withoutChannelMore } from './flattenChannelMenu';

const menu: DropdownItem[] = [
  { key: 'pin', label: 'pin' },
  { key: 'mute', label: 'mute' },
  { type: 'divider' },
  {
    children: [
      { key: 'rename', label: 'rename' },
      { key: 'delete', label: 'delete' },
    ],
    key: 'more',
    label: 'more',
  },
];
const keys = (items: DropdownItem[]) =>
  items.map((item) => (item && 'key' in item ? item.key : item && 'type' in item && item.type));

describe('channel menu', () => {
  it('lifts More into the top level for callers that pick actions by key', () => {
    expect(keys(flattenChannelMenu(menu))).toEqual(['pin', 'mute', 'divider', 'rename', 'delete']);
  });

  it('drops More and the divider leading into it for a list row', () => {
    expect(keys(withoutChannelMore(menu))).toEqual(['pin', 'mute']);
  });

  it('keeps a menu without More as it is', () => {
    const peer: DropdownItem[] = [
      { key: 'pin', label: 'pin' },
      { type: 'divider' },
      { danger: true, key: 'deleteChat', label: 'deleteChat' },
    ];
    expect(keys(withoutChannelMore(peer))).toEqual(['pin', 'divider', 'deleteChat']);
  });
});
