import type {
  ConfirmOnboardingUnderstandingInput,
  OnboardingUnderstandingPollingResult,
  PersonalSystemAgentKey,
  RetryOnboardingUnderstandingProviderInput,
  ReviseOnboardingUnderstandingInput,
  StartOnboardingUnderstandingInput,
} from '@lobot/types';
import { type PartialDeep } from 'type-fest';

import { lambdaClient } from '@/libs/trpc/client';
import type { OnboardingUserInfo } from '@/types/agentContext';
import { type MarkdownPatchHunk } from '@/types/markdownPatch';
import {
  type SaveUserQuestionInput,
  type SSOProvider,
  type UserGuide,
  type UserInitializationState,
  type UserOnboarding,
  type UserPreference,
} from '@/types/user';
import { type UserSettings } from '@/types/user/settings';

export class UserService {
  getUserRegistrationDuration = async (): Promise<{
    createdAt: string;
    duration: number;
    updatedAt: string;
  }> => {
    return lambdaClient.user.getUserRegistrationDuration.query();
  };

  getUserState = async (): Promise<UserInitializationState> => {
    return lambdaClient.user.getUserState.query();
  };

  updateOnboarding = async (onboarding: UserOnboarding) => {
    return lambdaClient.user.updateOnboarding.mutate(onboarding);
  };

  updateAvatar = async (avatar: string) => {
    return lambdaClient.user.updateAvatar.mutate(avatar);
  };

  updateInterests = async (interests: string[]) => {
    return lambdaClient.user.updateInterests.mutate(interests);
  };

  updateFullName = async (fullName: string) => {
    return lambdaClient.user.updateFullName.mutate(fullName);
  };

  updateUsername = async (username: string) => {
    return lambdaClient.user.updateUsername.mutate(username);
  };

  updatePreference = async (preference: Partial<UserPreference>) => {
    return lambdaClient.user.updatePreference.mutate(preference);
  };

  updateToolIntervention = async (value: {
    appendAllowList?: string[];
    approvalMode?: 'auto-run' | 'allow-list' | 'manual';
  }) => {
    return lambdaClient.user.updateToolIntervention.mutate(value);
  };

  updateUserSettings = async (value: PartialDeep<UserSettings>, signal?: AbortSignal) => {
    return lambdaClient.user.updateSettings.mutate(value, { signal });
  };
}

export const userService = new UserService();
