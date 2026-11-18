import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ONBOARDING_METRICS_EVENTS,
  ONBOARDING_METRICS_SPM,
  trackOnboardingCompleted,
  trackOnboardingMarketplacePicked,
  trackOnboardingMarketplaceShown,
  trackOnboardingStepCompleted,
  trackOnboardingStepViewed,
} from './index';

const analyticsMocks = vi.hoisted(() => ({
  track: vi.fn(),
}));

vi.mock('@/libs/analytics/client', () => ({
  analyticsClient: { track: analyticsMocks.track },
}));

describe('onboardingMetrics', () => {
  const track = analyticsMocks.track;

  beforeEach(() => {
    track.mockReset();
  });

  it('fires onboarding_marketplace_shown with categoryHints and requestId', () => {
    trackOnboardingMarketplaceShown({
      categoryHints: ['engineering', 'design-creative'],
      requestId: 'req-a',
    });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      name: ONBOARDING_METRICS_EVENTS.MARKETPLACE_SHOWN,
      properties: {
        categoryHints: ['engineering', 'design-creative'],
        requestId: 'req-a',
        spm: ONBOARDING_METRICS_SPM.MARKETPLACE_SHOWN,
      },
    });
  });

  it('fires onboarding_marketplace_picked with categoryHints, requestId and selectedTemplateIds', () => {
    trackOnboardingMarketplacePicked({
      categoryHints: ['engineering'],
      requestId: 'req-b',
      selectedTemplateIds: ['pair-programmer', 'code-reviewer'],
    });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      name: ONBOARDING_METRICS_EVENTS.MARKETPLACE_PICKED,
      properties: {
        categoryHints: ['engineering'],
        requestId: 'req-b',
        selectedTemplateIds: ['pair-programmer', 'code-reviewer'],
        spm: ONBOARDING_METRICS_SPM.MARKETPLACE_PICKED,
      },
    });
  });

  it('fires onboarding_step_viewed with flow, step and stepIndex', () => {
    trackOnboardingStepViewed({
      flow: 'common',
      step: 'telemetry',
      stepIndex: 1,
    });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      name: ONBOARDING_METRICS_EVENTS.STEP_VIEWED,
      properties: {
        flow: 'common',
        spm: ONBOARDING_METRICS_SPM.STEP_VIEWED,
        step: 'telemetry',
        stepIndex: 1,
      },
    });
  });

  it('fires onboarding_step_completed with extra step context', () => {
    trackOnboardingStepCompleted({
      action: 'auto_skip',
      flow: 'classic',
      skipped: true,
      step: 'prosettings',
      stepIndex: 3,
    });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      name: ONBOARDING_METRICS_EVENTS.STEP_COMPLETED,
      properties: {
        action: 'auto_skip',
        flow: 'classic',
        skipped: true,
        spm: ONBOARDING_METRICS_SPM.STEP_COMPLETED,
        step: 'prosettings',
        stepIndex: 3,
      },
    });
  });

  it('fires onboarding_completed with the branch flow and targetUrl', () => {
    trackOnboardingCompleted({
      flow: 'classic',
      targetUrl: '/',
    });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      name: ONBOARDING_METRICS_EVENTS.COMPLETED,
      properties: {
        flow: 'classic',
        spm: ONBOARDING_METRICS_SPM.COMPLETED,
        targetUrl: '/',
      },
    });
  });

  it('swallows analytics errors so the caller never observes them', () => {
    track.mockImplementation(() => {
      throw new Error('boom');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      trackOnboardingMarketplacePicked({
        categoryHints: ['engineering'],
        requestId: 'req-d',
        selectedTemplateIds: ['pair-programmer'],
      }),
    ).not.toThrow();

    error.mockRestore();
  });
});
