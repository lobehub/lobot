'use client';

import { Icon } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { UserRoundPlusIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { openAddContactModal } from '@/features/AddContactModal';

import { styles } from './style';

/**
 * The last row while searching, like WeChat's 网络查找微信号: the list only knows my own
 * conversations, so this hands the query to the contact lookup to find a person or an Agent.
 */
const NetworkSearchRow = memo<{ query: string }>(({ query }) => {
  const { t } = useTranslation('common');

  return (
    <div
      role="button"
      tabIndex={0}
      {...stylex.props(styles.row)}
      onClick={() => openAddContactModal(query)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openAddContactModal(query);
      }}
    >
      <span {...stylex.props(styles.networkSearchIcon)}>
        <Icon icon={UserRoundPlusIcon} size={16} />
      </span>
      <div {...stylex.props(styles.rowText, styles.networkSearchText)}>
        <span {...stylex.props(styles.title)}>{t('messageList.networkSearch')}</span>
        <span {...stylex.props(styles.preview, styles.networkSearchQuery)}>{query}</span>
      </div>
    </div>
  );
});

NetworkSearchRow.displayName = 'MessageListNetworkSearchRow';

export default NetworkSearchRow;
