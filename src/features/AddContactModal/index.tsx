'use client';

import { createModal } from '@lobehub/ui';
import { t } from 'i18next';

import AddContactContent from './Content';

/** Find a person by username, or another person's Agent by its share handle or link. */
export const openAddContactModal = () =>
  createModal({
    content: <AddContactContent />,
    footer: null,
    title: t('contacts.add.title', { ns: 'common' }),
    width: 'min(90%, 440px)',
  });
