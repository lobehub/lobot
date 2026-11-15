/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setPostRenderReady: vi.fn(),
  shouldSkipRoutePreload: vi.fn().mockReturnValue(false),
  startConnectorInitialization: vi.fn(),
  startRoutePreload: vi.fn(),
}));

vi.mock('../atoms/app', () => ({
  setPostRenderReady: mocks.setPostRenderReady,
}));

vi.mock('./connectors', () => ({
  startConnectorInitialization: mocks.startConnectorInitialization,
}));

vi.mock('./routePreload', () => ({
  shouldSkipRoutePreload: mocks.shouldSkipRoutePreload,
  startRoutePreload: mocks.startRoutePreload,
}));

describe('startPostRenderInitialization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocks.shouldSkipRoutePreload.mockReturnValue(false);

    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: undefined,
      writable: true,
    });
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: undefined,
      writable: true,
    });
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs post-render warmups after the first paint', async () => {
    const { startPostRenderInitialization } = await import('./postRender');

    startPostRenderInitialization();

    expect(mocks.startConnectorInitialization).not.toHaveBeenCalled();
    expect(mocks.setPostRenderReady).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(mocks.setPostRenderReady).toHaveBeenCalledWith(true);
    expect(mocks.startConnectorInitialization).toHaveBeenCalledTimes(1);
    expect(mocks.startRoutePreload).toHaveBeenCalledTimes(1);
  });

  it('starts post-render initialization only once', async () => {
    const { startPostRenderInitialization } = await import('./postRender');

    startPostRenderInitialization();
    startPostRenderInitialization();
    await vi.runAllTimersAsync();

    expect(mocks.setPostRenderReady).toHaveBeenCalledTimes(1);
    expect(mocks.startConnectorInitialization).toHaveBeenCalledTimes(1);
    expect(mocks.startRoutePreload).toHaveBeenCalledTimes(1);
  });

  it('still marks post-render ready when background preloading is disabled', async () => {
    mocks.shouldSkipRoutePreload.mockReturnValue(true);
    const { startPostRenderInitialization } = await import('./postRender');

    startPostRenderInitialization();
    await vi.runAllTimersAsync();

    expect(mocks.setPostRenderReady).toHaveBeenCalledWith(true);
    expect(mocks.startRoutePreload).toHaveBeenCalledTimes(1);
  });
});
