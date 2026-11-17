import { analyticsClient } from '@/libs/analytics/client';

export const ONBOARDING_METRICS_EVENTS = {
  COMPLETED: 'onboarding_completed',
  MARKETPLACE_PICKED: 'onboarding_marketplace_picked',
  MARKETPLACE_SHOWN: 'onboarding_marketplace_shown',
  PROFILE_CONFIRMED: 'onboarding_profile_confirmed',
  PROFILE_VIEWED: 'onboarding_profile_viewed',
  STARTED: 'onboarding_started',
  STEP_COMPLETED: 'onboarding_step_completed',
  STEP_VIEWED: 'onboarding_step_viewed',
  UNDERSTANDING_COMPLETED: 'onboarding_understanding_completed',
  UNDERSTANDING_PROGRESS: 'onboarding_understanding_progress',
  UNDERSTANDING_STARTED: 'onboarding_understanding_started',
} as const;

export const ONBOARDING_METRICS_SPM = {
  COMPLETED: 'onboarding.completed',
  MARKETPLACE_PICKED: 'onboarding.marketplace.picked',
  MARKETPLACE_SHOWN: 'onboarding.marketplace.shown',
  PROFILE_CONFIRMED: 'onboarding.profile.confirmed',
  PROFILE_VIEWED: 'onboarding.profile.viewed',
  STARTED: 'onboarding.started',
  STEP_COMPLETED: 'onboarding.step.completed',
  STEP_VIEWED: 'onboarding.step.viewed',
  UNDERSTANDING_COMPLETED: 'onboarding.understanding.completed',
  UNDERSTANDING_PROGRESS: 'onboarding.understanding.progress',
  UNDERSTANDING_STARTED: 'onboarding.understanding.started',
} as const;

interface AnalyticsLike {
  track: (event: { name: string; properties?: Record<string, unknown> }) => unknown;
}

const injectedClient: AnalyticsLike | null = null;

const emit = (name: string, properties: Record<string, unknown>): void => {
  const client = injectedClient ?? analyticsClient;

  try {
    client.track({ name, properties });
  } catch (error) {
    console.error('[OnboardingMetrics] track failed', error);
  }
};

type OnboardingFlow = 'agent' | 'classic' | 'common' | 'web';

type OnboardingStep =
  | 'agentpicker'
  | 'chief_agent'
  | 'connect_apps'
  | 'conversation'
  | 'fullname'
  | 'interests'
  | 'learn_your_world'
  | 'messenger'
  | 'profile'
  | 'prosettings'
  | 'response_language'
  | 'starter_tasks'
  | 'telemetry'
  | 'welcome';

interface OnboardingStepPayload extends Record<string, unknown> {
  flow: OnboardingFlow;
  onboarding_session_id?: string;
  onboarding_version?: number;
  skipped?: boolean;
  step: OnboardingStep;
  stepIndex?: number;
}

interface OnboardingStartedPayload extends Record<string, unknown> {
  flow: Exclude<OnboardingFlow, 'common'>;
  onboarding_session_id: string;
  onboarding_version: number;
}

interface OnboardingCompletedPayload extends Record<string, unknown> {
  flow: Exclude<OnboardingFlow, 'common'>;
  onboarding_session_id?: string;
  onboarding_version?: number;
  skipped?: boolean;
  targetUrl?: string;
}

type OnboardingUnderstandingProgressPhase =
  | 'collecting-sources'
  | 'generating-understanding'
  | 'generating-detailed-persona'
  | 'recommending-tasks'
  | 'completed'
  | 'partial'
  | 'failed';

type OnboardingUnderstandingStepStatus = 'pending' | 'running' | 'completed' | 'failed';

type OnboardingUnderstandingTerminalStatus = 'completed' | 'partial' | 'failed';

interface OnboardingUnderstandingStartedPayload extends Record<string, unknown> {
  flow: Exclude<OnboardingFlow, 'common'>;
  onboarding_session_id: string;
  onboarding_version: number;
  understanding_session_id: string;
}

interface OnboardingUnderstandingProgressPayload extends Record<string, unknown> {
  collect_sources_status: OnboardingUnderstandingStepStatus;
  detailed_persona_status: OnboardingUnderstandingStepStatus;
  flow: Exclude<OnboardingFlow, 'common'>;
  onboarding_session_id: string;
  onboarding_version: number;
  phase: OnboardingUnderstandingProgressPhase;
  task_recommendations_status: OnboardingUnderstandingStepStatus;
  understanding_session_id: string;
  understanding_status: OnboardingUnderstandingStepStatus;
}

interface OnboardingUnderstandingCompletedPayload extends Record<string, unknown> {
  duration_ms?: number;
  flow: Exclude<OnboardingFlow, 'common'>;
  onboarding_session_id: string;
  onboarding_version: number;
  profile_available?: boolean;
  source_count?: number;
  source_failed_count?: number;
  source_succeeded_count?: number;
  status: OnboardingUnderstandingTerminalStatus;
  understanding_session_id: string;
}

interface OnboardingProfilePayload extends Record<string, unknown> {
  flow: Exclude<OnboardingFlow, 'common'>;
  onboarding_session_id: string;
  onboarding_version: number;
  understanding_session_id: string;
}

export const trackOnboardingStepViewed = (payload: OnboardingStepPayload): void => {
  emit(ONBOARDING_METRICS_EVENTS.STEP_VIEWED, {
    ...payload,
    spm: ONBOARDING_METRICS_SPM.STEP_VIEWED,
  });
};

export const trackOnboardingStepCompleted = (payload: OnboardingStepPayload): void => {
  emit(ONBOARDING_METRICS_EVENTS.STEP_COMPLETED, {
    ...payload,
    spm: ONBOARDING_METRICS_SPM.STEP_COMPLETED,
  });
};

export const trackOnboardingCompleted = (payload: OnboardingCompletedPayload): void => {
  emit(ONBOARDING_METRICS_EVENTS.COMPLETED, {
    ...payload,
    spm: ONBOARDING_METRICS_SPM.COMPLETED,
  });
};

interface MarketplaceShownPayload {
  categoryHints: string[];
  requestId: string;
}

export const trackOnboardingMarketplaceShown = (payload: MarketplaceShownPayload): void => {
  emit(ONBOARDING_METRICS_EVENTS.MARKETPLACE_SHOWN, {
    ...payload,
    spm: ONBOARDING_METRICS_SPM.MARKETPLACE_SHOWN,
  });
};

interface MarketplacePickedPayload {
  categoryHints: string[];
  requestId: string;
  selectedTemplateIds: string[];
}

export const trackOnboardingMarketplacePicked = (payload: MarketplacePickedPayload): void => {
  emit(ONBOARDING_METRICS_EVENTS.MARKETPLACE_PICKED, {
    ...payload,
    spm: ONBOARDING_METRICS_SPM.MARKETPLACE_PICKED,
  });
};
