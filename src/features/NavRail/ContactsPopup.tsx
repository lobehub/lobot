'use client';

import { ActionIcon, Flexbox, Modal, ScrollArea, SearchBar } from '@lobehub/ui';
import { CirclePlusIcon } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { openAddContactModal } from '@/features/AddContactModal';
import { AgentViewAllPage } from '@/features/AgentViewAll';
import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { ContactListBody } from '@/features/ContactList';
import { ContactDetail } from '@/features/ContactList/ContactDetail';
import { PersonCard } from '@/features/ContactList/PersonDetail';
import { type ContactPreview, ContactPreviewContext } from '@/features/ContactList/previewContext';
import { SharedAgentProfile } from '@/features/ContactList/SharedAgentProfile';
import { useContactsTitle } from '@/features/ContactList/useContactsTitle';
import { useActiveLocation } from '@/hooks/useActiveLocation';

import { useContactsPopupStore } from './contactsPopupStore';

interface ContactsPopupProps {
  onClose: () => void;
  open: boolean;
}

// Same size as the Messages list "+" beside the search box.
const ADD_ICON_SIZE = { blockSize: 32, size: 20, strokeWidth: 1.5 };

const ContactsContent = memo<{ preview: ContactPreview }>(({ preview }) => {
  switch (preview.kind) {
    case 'agent': {
      return <ContactDetail id={preview.id} key={preview.id} />;
    }
    case 'person': {
      return <PersonCard key={preview.userId} userId={preview.userId} />;
    }
    case 'shared': {
      return <SharedAgentProfile key={preview.share} share={preview.share} />;
    }
    default: {
      return <AgentViewAllPage />;
    }
  }
});

ContactsContent.displayName = 'ContactsPopupContent';

const previewPaneKey = (preview: ContactPreview) => {
  switch (preview.kind) {
    case 'agent': {
      return `agent:${preview.id}`;
    }
    case 'person': {
      return `person:${preview.userId}`;
    }
    case 'shared': {
      return `shared:${preview.share}`;
    }
    default: {
      return 'home';
    }
  }
};

/**
 * Contacts in a modal with the list on the left and the page body on the
 * right, matching the Settings popup: local preview state, no nested router.
 */
/** Messages home, personal or under a workspace slug. A contact page is not home. */
const isMessagesHome = (pathname: string, slug: string | null) => {
  const pathOnly = pathname.split('?')[0].split('#')[0];
  const segments = pathOnly.split('/').filter(Boolean);
  const rest = slug && segments[0] === slug ? segments.slice(1) : segments;
  return rest.length === 0;
};

const ContactsPopup = memo<ContactsPopupProps>(({ open, onClose }) => {
  const { t } = useTranslation('common');
  const title = useContactsTitle();
  const channelsEnabled = useChannelsEnabled();
  const preview = useContactsPopupStore((s) => s.preview);
  const setPreview = useContactsPopupStore((s) => s.setPreview);
  const [query, setQuery] = useState('');
  // Each time the popup opens, start from an empty search. Adjusting state
  // while rendering is how a prop change resets state without an effect.
  const [queryEpoch, setQueryEpoch] = useState(open);
  if (open !== queryEpoch) {
    setQueryEpoch(open);
    if (open) setQuery('');
  }
  const { pathname } = useActiveLocation();
  const slug = useActiveWorkspaceSlug();
  const pathWhenOpened = useRef<string | null>(null);

  if (open && pathWhenOpened.current === null) pathWhenOpened.current = pathname;
  if (!open) pathWhenOpened.current = null;

  useEffect(() => {
    if (!open || !pathWhenOpened.current || pathname === pathWhenOpened.current) return;
    // Switching workspace leaves the contact that belonged to the previous
    // scope and lands on Messages. The address book stays open over that home.
    if (isMessagesHome(pathname, slug)) {
      pathWhenOpened.current = pathname;
      return;
    }
    onClose();
  }, [open, pathname, onClose, slug]);

  const previewValue = useMemo(() => ({ preview, setPreview }), [preview, setPreview]);

  return (
    <Modal
      destroyOnHidden
      draggable={false}
      footer={null}
      height={'min(calc(880px + 56px), calc(100vh - 160px))'}
      open={open}
      title={title}
      width={'min(1280px, calc(100vw - 160px))'}
      styles={{
        body: { overflow: 'hidden', padding: 0 },
      }}
      onCancel={onClose}
    >
      <ContactPreviewContext.Provider value={previewValue}>
        <Flexbox horizontal style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
          <Flexbox
            flex={'none'}
            height={'100%'}
            style={{ minWidth: 0, overflow: 'hidden', width: 280 }}
          >
            <Flexbox
              horizontal
              align={'center'}
              flex={'none'}
              gap={6}
              paddingBlock={'0 8px'}
              paddingInline={'10px 8px'}
            >
              <SearchBar
                allowClear
                placeholder={t('messageList.search')}
                style={{ flex: 1, minWidth: 0 }}
                value={query}
                variant={'filled'}
                onChange={(e) => setQuery(e.target.value)}
              />
              {channelsEnabled && (
                <ActionIcon
                  icon={CirclePlusIcon}
                  size={ADD_ICON_SIZE}
                  style={{ flex: 'none' }}
                  title={t('contacts.add')}
                  onClick={() => openAddContactModal()}
                />
              )}
            </Flexbox>
            <ScrollArea
              disableContentFit
              scrollFade="vertical"
              style={{ flex: 1, height: 'auto', minWidth: 0, overflow: 'hidden' }}
            >
              <ContactListBody query={query} />
            </ScrollArea>
          </Flexbox>
          <ScrollArea
            disableContentFit
            key={previewPaneKey(preview)}
            scrollFade={preview.kind === 'home' ? 'vertical' : false}
            style={{ flex: 1, minWidth: 0, height: '100%' }}
          >
            <div style={{ boxSizing: 'border-box', padding: '0 16px 16px' }}>
              {preview.kind === 'home' ? (
                <ContactsContent preview={preview} />
              ) : (
                <Flexbox align={'center'} width={'100%'}>
                  <ContactsContent preview={preview} />
                </Flexbox>
              )}
            </div>
          </ScrollArea>
        </Flexbox>
      </ContactPreviewContext.Provider>
    </Modal>
  );
});

ContactsPopup.displayName = 'ContactsPopup';

export default ContactsPopup;
