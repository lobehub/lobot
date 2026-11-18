import { describe, expect, it } from 'vitest';

import { type ChatStore } from '@/store/chat';
import { initialState } from '@/store/chat/initialState';
import { topicMapKey } from '@/store/chat/utils/topicMapKey';
import { merge } from '@/utils/merge';

import { topicSelectors } from './selectors';

const topicState = <T>(key: string, topics: T[], total: number) => ({
  topicDataMap: {
    [key]: {
      items: topics,
      total,
      currentPage: 0,
      hasMore: false,
      pageSize: 20,
    },
  },
  activeAgentId: 'test',
});

// Mock i18next
vi.mock('i18next', () => ({
  t: vi.fn().mockImplementation((key) => key),
}));

const initialStore = initialState as ChatStore;

const topicItems = [
  { id: 'topic1', name: 'Topic 1', favorite: true },
  { id: 'topic2', name: 'Topic 2' },
];

// Helper to create topicDataMap with correct key format
const createTopicDataMap = (agentId: string, groupId?: string) => ({
  [topicMapKey({ agentId, groupId })]: {
    items: topicItems,
    total: topicItems.length,
    currentPage: 0,
    hasMore: false,
    pageSize: 20,
  },
});

const topicDataMap = createTopicDataMap('test');

describe('topicSelectors', () => {
  describe('currentTopics', () => {
    it('should return undefined if there are no topics with activeAgentId', () => {
      const topics = topicSelectors.currentTopics(initialStore);
      expect(topics).toBeUndefined();
    });

    it('should return all current topics from the store', () => {
      const state = merge(initialStore, { topicDataMap, activeAgentId: 'test' });

      const topics = topicSelectors.currentTopics(state);
      expect(topics).toEqual(topicItems);
    });
  });

  describe('reasoning + hetero pins', () => {
    const pinTopicDataMap = createTopicDataMap('test');
    pinTopicDataMap[topicMapKey({ agentId: 'test' })].items = [
      {
        id: 'pinned',
        metadata: { reasoningConfig: { reasoningEffort: 'high' } },
        model: 'gpt-5',
        name: 'Pinned',
        provider: 'openai',
      },
      { id: 'legacy', model: 'gpt-5', name: 'Legacy', provider: 'openai' },
      { id: 'noModel', metadata: { reasoningConfig: {} }, name: 'No Model' },
      {
        id: 'heteroBoth',
        metadata: { heteroEffort: 'max' },
        model: 'opus',
        name: 'Hetero',
        provider: 'claude-code',
      },
      { id: 'heteroEffortOnly', metadata: { heteroEffort: 'default' }, name: 'Hetero effort' },
      { id: 'heteroNone', name: 'Hetero none' },
    ] as any;
    const state = merge(initialStore, { topicDataMap: pinTopicDataMap, activeAgentId: 'test' });

    it('getTopicHeteroPinById combines the model columns with the effort pin', () => {
      expect(topicSelectors.getTopicHeteroPinById('heteroBoth')(state)).toEqual({
        effort: 'max',
        model: 'opus',
        provider: 'claude-code',
      });
      expect(topicSelectors.getTopicHeteroPinById('heteroEffortOnly')(state)).toEqual({
        effort: 'default',
      });
      expect(topicSelectors.getTopicHeteroPinById('heteroNone')(state)).toBeUndefined();
      expect(topicSelectors.getTopicHeteroPinById('missing')(state)).toBeUndefined();
    });
  });

  describe('currentTopicDeviceId', () => {
    const stateWithTopicMetadata = (topicMeta: Record<string, unknown> | undefined) =>
      merge(initialStore, {
        ...topicState(
          topicMapKey({ agentId: 'test' }),
          [{ id: 'topic-device', metadata: topicMeta }],
          1,
        ),
        activeTopicId: 'topic-device',
      }) as ChatStore;

    it('prefers the running operation device over the bound device', () => {
      const state = stateWithTopicMetadata({
        boundDeviceId: 'device-bound',
        runningOperation: { deviceId: 'device-running', operationId: 'op-1' },
      });

      expect(topicSelectors.currentTopicDeviceId(state)).toBe('device-running');
    });

    it('falls back to the bound device when no run is in flight', () => {
      const state = stateWithTopicMetadata({
        boundDeviceId: 'device-bound',
        runningOperation: null,
      });

      expect(topicSelectors.currentTopicDeviceId(state)).toBe('device-bound');
    });

    it('returns undefined when the topic has neither', () => {
      expect(topicSelectors.currentTopicDeviceId(stateWithTopicMetadata({}))).toBeUndefined();
      expect(
        topicSelectors.currentTopicDeviceId(stateWithTopicMetadata(undefined)),
      ).toBeUndefined();
      expect(topicSelectors.currentTopicDeviceId(initialStore)).toBeUndefined();
    });
  });

  describe('currentActiveTopic', () => {
    it('should return undefined if there is no active topic', () => {
      const topic = topicSelectors.currentActiveTopic(initialStore);
      expect(topic).toBeUndefined();
    });

    it('should tolerate a partial store state without the detail cache', () => {
      const state = {
        activeAgentId: 'test',
        activeTopicId: 'missing-topic',
        topicDataMap: {},
      } as ChatStore;

      expect(topicSelectors.currentActiveTopic(state)).toBeUndefined();
      expect(topicSelectors.getTopicById('missing-topic')(state)).toBeUndefined();
    });

    it('should return the current active topic', () => {
      const state = merge(initialStore, {
        topicDataMap,
        activeAgentId: 'test',
        activeTopicId: 'topic1',
      });
      const topic = topicSelectors.currentActiveTopic(state);
      expect(topic).toEqual(topicItems[0]);
    });

    it('should fall back to the detail cache when the topic is missing from the list bucket', () => {
      // An archived (completed) topic is excluded from the sidebar list fetch,
      // so it never lands in topicDataMap — only in the by-id detail cache.
      const archived = { id: 'archived1', title: 'Archived topic', status: 'completed' };
      const state = merge(initialStore, {
        topicDataMap,
        topicDetailMap: { archived1: archived },
        activeAgentId: 'test',
        activeTopicId: 'archived1',
      });
      expect(topicSelectors.currentActiveTopic(state)).toEqual(archived);
    });

    it('should prefer the list bucket row over the detail cache', () => {
      const state = merge(initialStore, {
        topicDataMap,
        topicDetailMap: { topic1: { id: 'topic1', title: 'stale detail' } },
        activeAgentId: 'test',
        activeTopicId: 'topic1',
      });
      expect(topicSelectors.currentActiveTopic(state)).toEqual(topicItems[0]);
    });
  });

  describe('getTopicById', () => {
    it('should fall back to the detail cache when the topic is missing from the list bucket', () => {
      const archived = { id: 'archived1', title: 'Archived topic', status: 'completed' };
      const state = merge(initialStore, {
        topicDataMap,
        topicDetailMap: { archived1: archived },
        activeAgentId: 'test',
      });
      expect(topicSelectors.getTopicById('archived1')(state)).toEqual(archived);
      expect(topicSelectors.getTopicById('topic1')(state)).toEqual(topicItems[0]);
    });
  });

  describe('getTopicById', () => {
    it('should return undefined if topic is not found', () => {
      const state = merge(initialStore, { topicDataMap, activeAgentId: 'test' });
      const topic = topicSelectors.getTopicById('notfound')(state);
      expect(topic).toBeUndefined();
    });

    it('should return the topic with the given id', () => {
      const state = merge(initialStore, { topicDataMap, activeAgentId: 'test' });
      const topic = topicSelectors.getTopicById('topic1')(state);
      expect(topic).toEqual(topicItems[0]);
    });

    it('should find a topic loaded under another agent for split desktop panes', () => {
      const backgroundTopic = { id: 'background-topic', name: 'Background topic' };
      const state = merge(initialStore, {
        activeAgentId: 'focused-agent',
        topicDataMap: {
          ...createTopicDataMap('focused-agent'),
          [topicMapKey({ agentId: 'background-agent' })]: {
            currentPage: 0,
            hasMore: false,
            items: [backgroundTopic],
            pageSize: 20,
            total: 1,
          },
        },
      });

      expect(topicSelectors.getTopicById('background-topic')(state)).toEqual(backgroundTopic);
    });
  });

  describe('getTopicWorkingDirectory', () => {
    // Two topics with distinct working directories; A is the active topic.
    const wdTopics = [
      { id: 'topicA', metadata: { workingDirectory: '/project-a' }, name: 'A' },
      { id: 'topicB', metadata: { workingDirectory: '/project-b' }, name: 'B' },
    ];
    const wdState = merge(initialStore, {
      activeAgentId: 'test',
      activeTopicId: 'topicA',
      topicDataMap: {
        [topicMapKey({ agentId: 'test' })]: {
          currentPage: 0,
          hasMore: false,
          items: wdTopics,
          pageSize: 20,
          total: wdTopics.length,
        },
      },
    }) as ChatStore;

    // Regression: while topic A is active, a tool call captured for topic B must
    // resolve B's directory — not A's — so a mid-stream topic switch can't make
    // grep search the wrong project.
    it('binds to the requested topic id, not the active topic', () => {
      expect(topicSelectors.getTopicWorkingDirectory('topicB')(wdState)).toBe('/project-b');
      expect(topicSelectors.getTopicWorkingDirectory('topicA')(wdState)).toBe('/project-a');
    });

    it('falls back to the active topic when no id is given', () => {
      expect(topicSelectors.getTopicWorkingDirectory()(wdState)).toBe('/project-a');
    });

    it('treats an explicit null as a new-topic route without a directory', () => {
      expect(topicSelectors.getTopicWorkingDirectory(null)(wdState)).toBeUndefined();
    });

    it('returns undefined for an unknown topic id', () => {
      expect(topicSelectors.getTopicWorkingDirectory('nope')(wdState)).toBeUndefined();
    });
  });

  describe('group session support', () => {
    const timestamp = Date.now();

    it('should return topics for group session when only groupId is set', () => {
      const groupTopics = [
        {
          id: 'group-topic1',
          title: 'Group Topic 1',
          favorite: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: 'group-topic2',
          title: 'Group Topic 2',
          favorite: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];

      // Note: When in group session, activeAgentId may still have a value (e.g., 'inbox')
      // but we prioritize groupId for topic data lookup
      const state = {
        ...initialStore,
        topicDataMap: {
          [topicMapKey({ groupId: 'group-123' })]: {
            items: groupTopics,
            total: groupTopics.length,
            currentPage: 0,
            hasMore: false,
            pageSize: 20,
          },
        },
        activeAgentId: undefined as any,
        activeGroupId: 'group-123',
      };

      const topics = topicSelectors.currentTopics(state);
      expect(topics).toEqual(groupTopics);
    });

    it('should return topics for group_agent session when both groupId and agentId are set', () => {
      const groupAgentTopics = [
        {
          id: 'ga-topic1',
          title: 'Group Agent Topic 1',
          favorite: false,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ];

      const state = merge(initialStore, {
        topicDataMap: {
          [topicMapKey({ agentId: 'agent-456', groupId: 'group-123' })]: {
            items: groupAgentTopics,
            total: groupAgentTopics.length,
            currentPage: 0,
            hasMore: false,
            pageSize: 20,
          },
        },
        activeAgentId: 'agent-456',
        activeGroupId: 'group-123',
      });

      const topics = topicSelectors.currentTopics(state);
      expect(topics).toEqual(groupAgentTopics);
    });
  });

  describe('displayTopicsForSidebar', () => {
    it('does not pin an open channel topic back into the sidebar', () => {
      const channelTopic = { ...topicItems[0], id: 'channel1', trigger: 'channel' };
      const state = merge(initialStore, {
        activeAgentId: 'test',
        activeTopicId: channelTopic.id,
        topicDataMap,
        topicDetailMap: { [channelTopic.id]: channelTopic },
      });

      expect(topicSelectors.displayTopicsForSidebar(20)(state)).toEqual(topicItems);
      expect(topicSelectors.currentActiveTopic(state)).toEqual(channelTopic);
    });

    it('hides completed topics immediately when completed topics are excluded', () => {
      const now = Date.now();
      const state = merge(initialStore, {
        activeAgentId: 'agent-1',
        topicDataMap: {
          [topicMapKey({ agentId: 'agent-1' })]: {
            currentPage: 0,
            hasMore: false,
            items: [
              { createdAt: now, id: 'active', status: 'active', updatedAt: now },
              { createdAt: now, id: 'completed', status: 'completed', updatedAt: now },
            ],
            pageSize: 20,
            total: 2,
          },
        },
      });

      expect(topicSelectors.displayTopicsForSidebar(20, 'updatedAt', false)(state)).toEqual([
        expect.objectContaining({ id: 'active' }),
      ]);
      expect(topicSelectors.displayTopicsForSidebar(20, 'updatedAt', true)(state)).toHaveLength(2);
    });

    it('keeps the active topic visible when it falls outside the configured page', () => {
      const state = merge(initialStore, {
        activeAgentId: 'agent-1',
        activeTopicId: 'older-active',
        topicDataMap: {
          [topicMapKey({ agentId: 'agent-1' })]: {
            currentPage: 0,
            hasMore: true,
            items: [
              { id: 'newest', updatedAt: 3 },
              { id: 'newer', updatedAt: 2 },
              { id: 'older-active', updatedAt: 1 },
            ],
            pageSize: 2,
            total: 3,
          },
        },
      });

      expect(
        topicSelectors
          .displayTopicsForSidebar(
            2,
            'updatedAt',
            false,
          )(state)
          ?.map(({ id }) => id),
      ).toEqual(['newest', 'newer', 'older-active']);
    });

    it('keeps an active completed topic from the detail cache visible', () => {
      const state = merge(initialStore, {
        activeAgentId: 'agent-1',
        activeTopicId: 'archived-active',
        topicDataMap: {
          [topicMapKey({ agentId: 'agent-1' })]: {
            currentPage: 0,
            hasMore: true,
            items: [{ id: 'visible', status: 'active', updatedAt: 2 }],
            pageSize: 20,
            total: 2,
          },
        },
        topicDetailMap: {
          'archived-active': { id: 'archived-active', status: 'completed', updatedAt: 1 },
        },
      });

      expect(
        topicSelectors
          .displayTopicsForSidebar(
            20,
            'updatedAt',
            false,
          )(state)
          ?.map(({ id }) => id),
      ).toEqual(['visible', 'archived-active']);
    });

    it('keeps an injected active favorite before regular topics', () => {
      const state = merge(initialStore, {
        activeAgentId: 'agent-1',
        activeTopicId: 'archived-favorite',
        topicDataMap: {
          [topicMapKey({ agentId: 'agent-1' })]: {
            currentPage: 0,
            hasMore: true,
            items: [
              { favorite: true, id: 'visible-favorite', updatedAt: 3 },
              { id: 'regular', updatedAt: 2 },
            ],
            pageSize: 20,
            total: 3,
          },
        },
        topicDetailMap: {
          'archived-favorite': {
            favorite: true,
            id: 'archived-favorite',
            status: 'completed',
            updatedAt: 1,
          },
        },
      });

      expect(
        topicSelectors
          .displayTopicsForSidebar(
            20,
            'updatedAt',
            false,
          )(state)
          ?.map(({ id }) => id),
      ).toEqual(['visible-favorite', 'archived-favorite', 'regular']);
    });

    it('does not duplicate an active topic already in the visible page', () => {
      const state = merge(initialStore, {
        activeAgentId: 'agent-1',
        activeTopicId: 'active',
        topicDataMap: {
          [topicMapKey({ agentId: 'agent-1' })]: {
            currentPage: 0,
            hasMore: false,
            items: [{ id: 'active', updatedAt: 1 }],
            pageSize: 20,
            total: 1,
          },
        },
      });

      expect(topicSelectors.displayTopicsForSidebar(20)(state)).toHaveLength(1);
    });
  });
});
