import { useTranslation } from 'react-i18next';

import {
  onboardingTemplatesSelectors,
  useFetchOnboardingAgentTemplates,
  useOnboardingTemplatesStore,
} from '@/features/Onboarding/store';

export const useOnboardingAgentTemplates = (enabled = true) => {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language;

  const { error } = useFetchOnboardingAgentTemplates(locale, enabled);
  const data = useOnboardingTemplatesStore(onboardingTemplatesSelectors.agentTemplates(locale));

  return { data, error, isLoading: enabled && data === undefined && !error };
};
