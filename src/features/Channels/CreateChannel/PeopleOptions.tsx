import { DEFAULT_USER_AVATAR } from '@lobechat/const';
import { ActionIcon, Checkbox, Flexbox, Text } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { useDebounce } from 'ahooks';
import { X } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceMembers } from '@/business/client/hooks/useWorkspaceMembers';
import AsyncBoundary from '@/components/AsyncBoundary';
import Avatar from '@/components/Avatar';
import type { ChannelPersonOption } from '@/services/channel';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { activeUserIds, CANDIDATE_LIMIT, localUserCandidates } from './localCandidates';
import { PickerSection } from './PickerSection';
import { pickerStyles } from './pickerStyles';

export interface PeopleSelection {
  /** Unset while creating a Channel: every workspace member except the creator. */
  channelId?: string;
  onChange: Dispatch<SetStateAction<ChannelPersonOption[]>>;
  value: ChannelPersonOption[];
}

export const usePersonName = () => {
  const { t } = useTranslation('channel');
  return (person: ChannelPersonOption) => person.fullName || person.username || t('person');
};

const PersonAvatar = ({ name, person }: { name: string; person: ChannelPersonOption }) => (
  <Avatar avatar={person.avatar || DEFAULT_USER_AVATAR} shape={'circle'} size={28} title={name} />
);

/**
 * The same candidates from the workspace roster replica, so the list paints from disk while the
 * server answers. Undefined until both the roster and, for an existing Channel, its member list
 * are local: a guess without them could offer someone already in.
 */
const useLocalUserCandidates = (channelId: string | undefined, query: string) => {
  const roster = useWorkspaceMembers();
  const selfId = useUserStore(userProfileSelectors.userId);
  const members = useChannelStore((s) =>
    channelId ? channelSelectors.detail({ channelId })(s)?.members : undefined,
  );
  return useMemo(() => {
    if (roster.length === 0 || (channelId ? !members : !selfId)) return;
    const exclude = new Set(members ? activeUserIds(members) : [selfId!]);
    return localUserCandidates(roster, exclude, query);
  }, [channelId, members, query, roster, selfId]);
};

/** Workspace members who are not in the Channel yet, searched on the server. */
export const PeopleOptions = ({ people, search }: { people: PeopleSelection; search: string }) => {
  const { t } = useTranslation('channel');
  const nameOf = usePersonName();
  const query = useDebounce(search.trim(), { wait: 200 });
  const { error, revalidate } = channelActions.useFetchUserCandidates(people.channelId, query);
  const fetched = useChannelStore(
    channelSelectors.userCandidates({ channelId: people.channelId, search: query }),
  );
  const local = useLocalUserCandidates(people.channelId, query);
  // The server stays the authority; the local copy only fills the wait for it.
  const data = fetched ?? local;
  const isLoading = fetched === undefined && !error && !local;
  const toggle = (person: ChannelPersonOption) =>
    people.onChange((current) =>
      current.some((item) => item.userId === person.userId)
        ? current.filter((item) => item.userId !== person.userId)
        : [...current, person],
    );

  return (
    <PickerSection title={t('invite.people')}>
      <AsyncBoundary
        data={data}
        error={error}
        isEmpty={data?.length === 0}
        isLoading={isLoading}
        empty={
          <Text fontSize={12} type="secondary" {...stylex.props(pickerStyles.section)}>
            {t(query ? 'people.noMatches' : people.channelId ? 'people.empty' : 'people.noOthers')}
          </Text>
        }
        onRetry={() => void revalidate()}
      >
        {data?.map((person) => {
          const name = nameOf(person);
          return (
            <label key={person.userId} {...stylex.props(pickerStyles.row)}>
              <Checkbox
                checked={people.value.some((item) => item.userId === person.userId)}
                onChange={() => toggle(person)}
              />
              <PersonAvatar name={name} person={person} />
              <Text ellipsis>{name}</Text>
            </label>
          );
        })}
        {data?.length === CANDIDATE_LIMIT && (
          <Text fontSize={12} type="secondary" {...stylex.props(pickerStyles.section)}>
            {t('people.searchMore')}
          </Text>
        )}
      </AsyncBoundary>
    </PickerSection>
  );
};

export const SelectedPerson = ({
  onRemove,
  person,
}: {
  onRemove: () => void;
  person: ChannelPersonOption;
}) => {
  const { t } = useTranslation('chat');
  const name = usePersonName()(person);
  return (
    <Flexbox horizontal align="center" gap={8} padding={8}>
      <PersonAvatar name={name} person={person} />
      <Text ellipsis style={{ flex: 1 }}>
        {name}
      </Text>
      <ActionIcon
        aria-label={t('group.removeMember')}
        icon={X}
        size="small"
        title={t('group.removeMember')}
        onClick={onRemove}
      />
    </Flexbox>
  );
};
