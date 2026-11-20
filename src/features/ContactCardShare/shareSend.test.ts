import { describe, expect, it, vi } from 'vitest';

import { sendCardToChannels } from './shareSend';

const agentCard = { agentId: 'agt_1', type: 'agent' } as const;

describe('sendCardToChannels', () => {
  it('sends the card to every conversation, each followed by the note', async () => {
    const calls: string[] = [];
    const result = await sendCardToChannels({
      card: agentCard,
      channelIds: ['chn_a', 'chn_b'],
      note: '  这个好用  ',
      sendCard: async (id) => calls.push(`card:${id}`),
      sendNote: (id, content) => calls.push(`note:${id}:${content}`),
    });

    expect(result).toEqual({ errorKey: undefined, sent: ['chn_a', 'chn_b'] });
    expect(calls).toEqual([
      'card:chn_a',
      'note:chn_a:这个好用',
      'card:chn_b',
      'note:chn_b:这个好用',
    ]);
  });

  it('sends no note when it is blank', async () => {
    const sendNote = vi.fn();
    await sendCardToChannels({
      card: agentCard,
      channelIds: ['chn_a'],
      note: '   ',
      sendCard: async () => {},
      sendNote,
    });

    expect(sendNote).not.toHaveBeenCalled();
  });

  it('moves on past an ordinary failure and reports it', async () => {
    const sendNote = vi.fn();
    const result = await sendCardToChannels({
      card: agentCard,
      channelIds: ['chn_a', 'chn_b'],
      note: 'hi',
      sendCard: async (id) => {
        if (id === 'chn_a') throw new Error('offline');
      },
      sendNote,
    });

    expect(result).toEqual({ errorKey: 'contactCard.error.failed', sent: ['chn_b'] });
    expect(sendNote).toHaveBeenCalledTimes(1);
  });

  it('stops at a refusal of the card itself, which every conversation would repeat', async () => {
    const sendCard = vi.fn().mockRejectedValue({ data: { code: 'FORBIDDEN' } });
    const result = await sendCardToChannels({
      card: { type: 'user', userId: 'u_1' },
      channelIds: ['chn_a', 'chn_b'],
      note: '',
      sendCard,
      sendNote: vi.fn(),
    });

    expect(result).toEqual({ errorKey: 'contactCard.error.userNotShareable', sent: [] });
    expect(sendCard).toHaveBeenCalledTimes(1);
  });
});
