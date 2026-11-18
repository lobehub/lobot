import { describe, expect, it, vi } from 'vitest';

import type { App } from '@/core/App';

import { buildDockMenuTemplate, buildTrayMenuTemplate } from './trayMenu';

const createApp = () => {
  const mainWindow = {
    broadcast: vi.fn(),
    show: vi.fn(),
  };
  const app = {
    browserManager: {
      getMainWindow: vi.fn(() => mainWindow),
      openQuickChatPopup: vi.fn(),
      showMainWindow: vi.fn(),
    },
    i18n: {
      ns: vi.fn(() => (key: string) => key),
    },
    screenCaptureManager: {
      startSession: vi.fn(),
    },
  } as unknown as App;

  return { app, mainWindow };
};

describe('buildTrayMenuTemplate', () => {
  it('only keeps opening and quitting the app', () => {
    const { app } = createApp();

    const template = buildTrayMenuTemplate(app);

    expect(template.map((item) => item.label ?? item.type)).toEqual([
      'tray.open',
      'separator',
      'tray.quit',
    ]);
  });

  it('opens the main window', () => {
    const { app } = createApp();

    buildTrayMenuTemplate(app)[0].click?.({} as never, undefined, {} as never);

    expect(app.browserManager.showMainWindow).toHaveBeenCalled();
  });
});

describe('buildDockMenuTemplate', () => {
  it('is empty when navigation data is empty', () => {
    const { app } = createApp();

    const template = buildDockMenuTemplate(
      app,
      { agents: [], pinned: [], recent: [] },
      { includeAgents: true },
    );

    expect(template).toEqual([]);
  });

  it('leaves out recent items, Quick Composer and new chat', () => {
    const { app } = createApp();
    const template = buildDockMenuTemplate(app, {
      agents: [],
      pinned: [{ title: 'Pinned task', url: '/tasks/pinned' }],
      recent: [{ title: 'Recent topic', url: '/agent/a/t' }],
    });
    const labels = template.map((item) => item.label);

    expect(labels).toEqual(['tray.pinned', 'Pinned task']);
  });

  it('limits dynamic sections and offers More only for agents', () => {
    const { app } = createApp();
    const template = buildDockMenuTemplate(
      app,
      {
        agents: Array.from({ length: 4 }, (_, index) => ({
          id: `agent-${index}`,
          title: `Agent ${index}`,
          url: `/agent/agent-${index}`,
        })),
        pinned: Array.from({ length: 4 }, (_, index) => ({
          title: `Pinned ${index}`,
          url: `/page/pinned-${index}`,
        })),
        recent: Array.from({ length: 6 }, (_, index) => ({
          title: `Recent ${index}`,
          url: `/page/recent-${index}`,
        })),
      },
      { includeAgents: true },
    );
    const labels = template.map((item) => item.label);

    expect(labels.filter((label) => String(label).startsWith('Pinned '))).toHaveLength(3);
    expect(labels.filter((label) => String(label).startsWith('Agent '))).toHaveLength(3);
    expect(labels).toContain('tray.moreAgents');
    expect(labels).not.toContain('tray.more');
  });

  it('lists topics awaiting input before running ones, each capped', () => {
    const { app } = createApp();
    const template = buildDockMenuTemplate(
      app,
      {
        activeTopics: [
          ...Array.from({ length: 6 }, (_, index) => ({
            status: 'running' as const,
            title: `Running ${index}`,
            url: `/agent/a/running-${index}`,
          })),
          { status: 'waitingForHuman', subtitle: 'Researcher', title: 'Deploy', url: '/agent/a/t' },
        ],
        agents: [],
        pinned: [],
        recent: [],
      },
      { includeAgents: true },
    );
    const labels = template.map((item) => item.label);

    expect(labels.slice(0, 3)).toEqual(['tray.waitingForHuman', 'Deploy', undefined]);
    expect(labels[3]).toBe('tray.running');
    expect(labels.filter((label) => String(label).startsWith('Running '))).toHaveLength(5);
    expect(template.find(({ label }) => label === 'Deploy')).toMatchObject({
      sublabel: 'Researcher',
    });
  });

  it('opens dynamic routes in the main window', () => {
    const { app, mainWindow } = createApp();
    const template = buildDockMenuTemplate(
      app,
      {
        agents: [],
        pinned: [{ title: 'Pinned task', url: '/tasks/pinned' }],
        recent: [],
      },
      { includeAgents: true },
    );
    const item = template.find(({ label }) => label === 'Pinned task');

    item?.click?.(null as never, null as never, null as never);

    expect(mainWindow.show).toHaveBeenCalled();
    expect(mainWindow.broadcast).toHaveBeenCalledWith('navigate', {
      escape: true,
      path: '/tasks/pinned',
    });
  });

  it('opens agents without creating a new topic', () => {
    const { app, mainWindow } = createApp();
    const template = buildDockMenuTemplate(
      app,
      {
        agents: [{ id: 'agent-1', title: 'Researcher', url: '/agent/agent-1' }],
        pinned: [],
        recent: [],
      },
      { includeAgents: true },
    );

    template
      .find(({ label }) => label === 'Researcher')
      ?.click?.(null as never, null as never, null as never);
    expect(mainWindow.broadcast).toHaveBeenCalledWith('navigate', {
      escape: true,
      path: '/agent/agent-1',
    });
    expect(mainWindow.broadcast).not.toHaveBeenCalledWith('createNewTopic');
  });
});
