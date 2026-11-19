'use client';

import { GROUP_CHAT_URL } from '@lobechat/const';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentGroupAvatar from '@/features/AgentGroupAvatar';
import { useGroupDropdownMenu } from '@/features/HomeSidebar/Body/Agent/List/AgentGroupItem/useDropdownMenu';

import ConversationRow from './ConversationRow';
import { type Conversation } from './conversations';
import { conversationAvatarSize } from './style';

interface GroupConversationProps {
  active: boolean;
  conversation: Conversation;
  /** Large when this is the only pin; compact when several are pinned. */
  tile?: 'solo' | 'pair' | 'compact' | 'dense';
  variant?: 'row' | 'tile';
}

const GroupConversation = memo<GroupConversationProps>(
  ({ active, conversation, tile, variant }) => {
    const { item, preview, activeAt } = conversation;
    const { id, avatar, backgroundColor, description, pinned, userId } = item;
    const { t } = useTranslation('chat');
    const title = item.title || t('untitledAgent');
    const customAvatar = typeof avatar === 'string' ? avatar : undefined;
    const memberAvatars = Array.isArray(avatar) ? avatar : [];
    // Rename opens an inline popover anchored on the row.
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const contextMenuItems = useGroupDropdownMenu({
      anchor,
      avatar: customAvatar,
      backgroundColor: backgroundColor || undefined,
      description,
      id,
      memberAvatars,
      pinned: pinned ?? false,
      title,
      userId,
    });

    return (
      <ConversationRow
        active={active}
        activeAt={activeAt}
        contextMenuItems={contextMenuItems}
        hideKey={id}
        preview={preview}
        ref={setAnchor}
        tile={tile}
        title={title}
        unread={item.unreadCount}
        url={GROUP_CHAT_URL(id)}
        variant={variant}
        avatar={
          <AgentGroupAvatar
            avatar={customAvatar}
            backgroundColor={backgroundColor || undefined}
            memberAvatars={memberAvatars}
            size={conversationAvatarSize(variant, tile)}
          />
        }
      />
    );
  },
);

GroupConversation.displayName = 'GroupConversation';

export default GroupConversation;
