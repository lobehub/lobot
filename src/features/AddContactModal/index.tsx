'use client';

import { createModal } from '@lobehub/ui';
import { t } from 'i18next';

import AddContactContent from './Content';

/**
 * Find a person by username, or another person's Agent by its share handle or link. A query
 * (e.g. from the Messages search) fills the box and runs the lookup straight away.
 */
export const openAddContactModal = (initialQuery?: string) =>
  createModal({
    content: <AddContactContent initialQuery={initialQuery} />,
    footer: null,
    title: t('contacts.add.title', { ns: 'common' }),
    width: 'min(90%, 400px)',
  });
