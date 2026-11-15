import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { fetchOnboardingAgentTemplates } from '@/services/agentMarketplace';
import { getAgentTemplatesSWRKey } from '@/services/agentMarketplace/agentTemplates';

const agentTemplatesSWRConfig = {
  dedupingInterval: 60_000,
  revalidateOnFocus: false,
  shouldRetryOnError: false,
};

export const useOnboardingAgentTemplates = (enabled = true) => {
  const { i18n } = useTranslation();
  const swrLocale = i18n.resolvedLanguage || i18n.language;

  return useSWR(
    enabled ? getAgentTemplatesSWRKey(swrLocale) : null,
    () => fetchOnboardingAgentTemplates(),
    agentTemplatesSWRConfig,
  );
};
