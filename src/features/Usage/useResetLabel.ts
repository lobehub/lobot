import { useTranslation } from 'react-i18next';

import { resetDistance } from './quota';

/** "Resets in 5 days" / "Resets in 3 hours"; a window not yet opened starts with the next request. */
export const useResetLabel = () => {
  const { t } = useTranslation('subscription');
  return (resetAt: Date | null) => {
    if (!resetAt) return t('usage.window.notStarted');
    const { count, unit } = resetDistance(resetAt);
    return unit === 'hours'
      ? t('usage.overview.resetsInHours', { count })
      : t('usage.overview.resetsIn', { count });
  };
};

/** A date without the year in the viewer's language: "11月25日", "Nov 25". */
export const useFormatResetDate = () => {
  const { i18n } = useTranslation();
  return (date: Date) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(date);
};
