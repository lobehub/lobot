/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from 'vitest';

import { groupAvatar } from './groupAvatar';

const row = (id: string, { avatar = false, continuation = false } = {}) => {
  const element = document.createElement('div');
  element.setAttribute('role', 'article');
  element.setAttribute('data-message-id', id);
  if (continuation) element.setAttribute('data-continuation', 'true');
  if (avatar) {
    const face = document.createElement('span');
    face.setAttribute('data-message-avatar', '');
    element.append(face);
  }
  return element;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('groupAvatar', () => {
  it('uses the avatar on the same row', () => {
    const head = row('a', { avatar: true });
    document.body.append(head);

    expect(groupAvatar(head)).toBe(head.firstElementChild);
  });

  it('walks back through continuations so later threads reach the group avatar', () => {
    const head = row('a', { avatar: true });
    const second = row('b', { continuation: true });
    const third = row('c', { continuation: true });
    document.body.append(head, second, third);

    expect(groupAvatar(second)).toBe(head.firstElementChild);
    expect(groupAvatar(third)).toBe(head.firstElementChild);
  });

  it('does not jump a divider to an older avatar', () => {
    const head = row('a', { avatar: true });
    const divider = document.createElement('div');
    divider.setAttribute('role', 'separator');
    const next = row('b', { continuation: true });
    document.body.append(head, divider, next);

    expect(groupAvatar(next)).toBeNull();
  });
});
