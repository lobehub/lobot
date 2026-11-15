import { Icon } from '@lobehub/ui';
import { Minimize2 } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import BaseErrorForm from './BaseErrorForm';

/**
 * Copy for a request the provider rejected as too large: an over-long history or an
 * oversized request body (e.g. many large images inlined by the provider).
 */
const COPY = {
  exceededContext: {
    desc: 'exceededContext.desc',
    title: 'exceededContext.title',
  },
  requestBodyTooLarge: {
    desc: 'requestBodyTooLarge.desc',
    title: 'requestBodyTooLarge.title',
  },
} as const;

interface ExceededContextWindowErrorProps {
  reason?: keyof typeof COPY;
}

const ExceededContextWindowError = memo<ExceededContextWindowErrorProps>(
  ({ reason = 'exceededContext' }) => {
    const { t } = useTranslation('error');

    return (
      <BaseErrorForm
        avatar={<Icon icon={Minimize2} size={24} />}
        desc={t(COPY[reason].desc)}
        title={t(COPY[reason].title)}
      />
    );
  },
);

export default ExceededContextWindowError;
