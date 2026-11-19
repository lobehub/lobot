'use client';

import { ActionIcon, Flexbox, Modal, ScrollArea, SearchBar } from '@lobehub/ui';
import { CirclePlusIcon } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { openAddContactModal } from '@/features/AddContactModal';
import { AgentViewAllPage } from '@/features/AgentViewAll';
import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { ContactListBody } from '@/features/ContactList';
import { ContactDetail } from '@/features/ContactList/ContactDetail';
import { PersonCard } from '@/features/ContactList/PersonDetail';
import { type ContactPreview, ContactPreviewContext } from '@/features/ContactList/previewContext';
import { SharedAgentProfile } from '@/features/ContactList/SharedAgentProfile';
import { useActiveLocation } from '@/hooks/useActiveLocation';

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
const ContactsPopup = memo<ContactsPopupProps>(({ open, onClose }) => {
  const { t } = useTranslation('common');
  const channelsEnabled = useChannelsEnabled();
  const [preview, setPreview] = useState<ContactPreview>({ kind: 'home' });
  const [query, setQuery] = useState('');
  const { pathname } = useActiveLocation();
  const pathWhenOpened = useRef<string | null>(null);

  if (open && pathWhenOpened.current === null) pathWhenOpened.current = pathname;
  if (!open) pathWhenOpened.current = null;

  useEffect(() => {
    if (open && pathWhenOpened.current && pathname !== pathWhenOpened.current) onClose();
  }, [open, pathname, onClose]);

  useEffect(() => {
    if (open) {
      setPreview({ kind: 'home' });
      setQuery('');
    }
  }, [open]);

  const previewValue = useMemo(() => ({ preview, setPreview }), [preview]);

  return (
    <Modal
      destroyOnHidden
      draggable={false}
      footer={null}
      height={'min(calc(880px + 56px), calc(100vh - 160px))'}
      open={open}
      title={t('tab.contacts')}
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
