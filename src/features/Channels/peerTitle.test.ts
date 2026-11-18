import { describe, expect, it } from 'vitest';

import { channelTitle } from './peerTitle';

const member = (userId: string, userName: string) =>
  ({ actorType: 'user', name: null, userId, userName, username: null }) as never;

describe('channelTitle', () => {
  const detail = {
    channel: { peerUserId: 'u_bob', title: 'Bob' },
    members: [member('u_alice', 'Alice'), member('u_bob', 'Bob')],
  } as never;

  it('names the other person for either side of a conversation between people', () => {
    expect(channelTitle(detail, 'u_alice')).toBe('Bob');
    expect(channelTitle(detail, 'u_bob')).toBe('Alice');
  });

  it('keeps the stored title of any other Channel', () => {
    expect(
      channelTitle({ channel: { peerUserId: null, title: 'Team' }, members: [] } as never, 'u'),
    ).toBe('Team');
  });

  it("names a project's default Channel after the project", () => {
    const general = { channel: { peerUserId: null, projectId: 'prj_1', title: 'General' } };
    expect(channelTitle({ ...general, members: [] } as never, 'u', 'lobe-editor')).toBe(
      'lobe-editor',
    );
  });

  it('keeps the own name of a project Channel renamed from the default', () => {
    const renamed = { channel: { peerUserId: null, projectId: 'prj_1', title: 'Launch' } };
    expect(channelTitle({ ...renamed, members: [] } as never, 'u', 'lobe-editor')).toBe('Launch');
  });

  it('keeps "General" until the project name is known, and outside a project', () => {
    const general = { channel: { peerUserId: null, projectId: 'prj_1', title: 'General' } };
    expect(channelTitle({ ...general, members: [] } as never, 'u')).toBe('General');
    const standalone = { channel: { peerUserId: null, projectId: null, title: 'General' } };
    expect(channelTitle({ ...standalone, members: [] } as never, 'u', 'lobe-editor')).toBe(
      'General',
    );
  });
});
