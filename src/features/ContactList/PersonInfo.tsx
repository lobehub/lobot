'use client';

import { ActionIcon, CopyButton, Flexbox } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { MailIcon } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { WorkspaceMemberWithProfile } from '@/business/client/hooks/useWorkspaceMembers';

import { infoStyles } from './ContactInfo';
import { workspaceRoleKey } from './ExternalRows';

interface Row {
  actions?: ReactNode;
  key: string;
  label: string;
  multiline?: boolean;
  value: string;
}

/**
 * A workspace member's profile under their card, the same fields as their badge — role, joined
 * date, email and responsibilities — laid out as the contact info list. Rows the member has
 * nothing for are left out, except responsibilities, which says it has not been filled in.
 */
export const PersonInfo = memo<{ member: WorkspaceMemberWithProfile }>(({ member }) => {
  const { i18n, t } = useTranslation('common');
  const { t: tSetting } = useTranslation('setting');
  const email = member.user?.email;
  const joinedAt = new Date(member.joinedAt);

  const rows: Row[] = [
    {
      key: 'role',
      label: tSetting('workspace.member.profileCard.role'),
      value: tSetting(workspaceRoleKey(member.role)),
    },
  ];
  if (!Number.isNaN(joinedAt.getTime()))
    rows.push({
      key: 'joined',
      label: tSetting('workspace.member.profileCard.joined'),
      value: joinedAt.toLocaleDateString(i18n.language, { dateStyle: 'long' }),
    });
  if (email)
    rows.push({
      actions: (
        <>
          <CopyButton content={email} size={'small'} />
          <a aria-label={t('contacts.info.sendMail')} href={`mailto:${email}`}>
            <ActionIcon icon={MailIcon} size={'small'} title={t('contacts.info.sendMail')} />
          </a>
        </>
      ),
      key: 'email',
      label: tSetting('workspace.member.profileCard.email'),
      value: email,
    });
  rows.push({
    key: 'responsibilities',
    label: tSetting('workspace.member.profileCard.responsibilities'),
    multiline: true,
    value:
      member.responsibilities?.trim() ||
      tSetting('workspace.member.profileCard.noResponsibilities'),
  });

  return (
    <div {...stylex.props(infoStyles.list)}>
      {rows.map((row, index) => (
        <Flexbox
          horizontal
          align={'center'}
          gap={8}
          key={row.key}
          {...stylex.props(infoStyles.row, index > 0 && infoStyles.divided)}
        >
          <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
            <span {...stylex.props(infoStyles.label)}>{row.label}</span>
            <span
              title={row.multiline ? undefined : row.value}
              {...stylex.props(infoStyles.value, row.multiline && infoStyles.bio)}
            >
              {row.value}
            </span>
          </Flexbox>
          {row.actions}
        </Flexbox>
      ))}
    </div>
  );
});

PersonInfo.displayName = 'PersonInfo';
