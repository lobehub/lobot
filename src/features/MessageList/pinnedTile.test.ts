import { conversationAvatarSize, pinnedAvatarSize, pinnedTile } from './style';

describe('pinnedTile', () => {
  it('steps the tile down from one pin through four or more', () => {
    expect(pinnedTile(1)).toBe('solo');
    expect(pinnedTile(2)).toBe('pair');
    expect(pinnedTile(3)).toBe('compact');
    expect(pinnedTile(4)).toBe('dense');
    expect(pinnedTile(5)).toBe('dense');
  });

  it('keeps each step smaller, and matches the list avatar at four or more', () => {
    expect(pinnedAvatarSize('solo')).toBeGreaterThan(pinnedAvatarSize('pair'));
    expect(pinnedAvatarSize('pair')).toBeGreaterThan(pinnedAvatarSize('compact'));
    expect(pinnedAvatarSize('compact')).toBeGreaterThan(pinnedAvatarSize('dense'));
    expect(pinnedAvatarSize('dense')).toBe(32);
    expect(conversationAvatarSize('tile', 'dense')).toBe(conversationAvatarSize('row'));
  });
});
