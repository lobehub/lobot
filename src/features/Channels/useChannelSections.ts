import { confirmModal, toast } from '@lobehub/ui';
import type { ChannelListItem, ChannelSection } from '@lobot/types';
import { FolderInput, FolderOutput, FolderPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { openRenameModal } from '@/components/RenameModal';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';

const SECTION_NAME_LENGTH = 100;

/**
 * The person's own sections of their conversation list: create, rename and delete one, and file
 * a conversation under one. Sections are per person and scope, so nobody else sees them.
 */
export const useChannelSections = () => {
  const { t } = useTranslation('channel');
  const sections = useChannelStore(channelSelectors.sections);

  const failed = (action: string) => (error: unknown) => {
    console.error(`Failed to ${action}`, error);
    toast.error(t('actionFailed'));
  };

  const moveTo = (channelId: string, sectionId: string | null) =>
    channelActions.moveToSection(channelId, sectionId).catch(failed('move Channel to section'));

  /** Asks for a name, then adds the section; a conversation given here is moved into it. */
  const create = (channelId?: string) =>
    openRenameModal({
      defaultValue: '',
      maxLength: SECTION_NAME_LENGTH,
      title: t('section.create'),
      onSave: async (name) => {
        if (!name.trim()) return;
        try {
          const id = await channelActions.createSection(name.trim());
          if (channelId) await channelActions.moveToSection(channelId, id);
        } catch (error) {
          failed('create section')(error);
          throw error; // Keep the dialog open with the typed name.
        }
      },
    });

  const rename = (section: ChannelSection) =>
    openRenameModal({
      defaultValue: section.name,
      maxLength: SECTION_NAME_LENGTH,
      title: t('section.rename'),
      onSave: async (name) => {
        if (!name.trim() || name.trim() === section.name) return;
        try {
          await channelActions.renameSection(section.id, name.trim());
        } catch (error) {
          failed('rename section')(error);
          throw error;
        }
      },
    });

  const remove = (section: ChannelSection) =>
    confirmModal({
      cancelText: t('cancel'),
      content: t('section.deleteConfirm', { name: section.name }),
      okButtonProps: { danger: true },
      okText: t('section.delete'),
      title: t('section.delete'),
      onOk: async () => {
        try {
          await channelActions.removeSection(section.id);
        } catch (error) {
          failed('delete section')(error);
          throw error;
        }
      },
    });

  /**
   * "Move to section" for a conversation's menu: every other section, a new one, and out of the
   * current one. Nothing until the sections load, so a server without them shows no entry.
   */
  const menuItem = (channel: ChannelListItem) => {
    if (!sections) return;
    const current = sections.some((section) => section.id === channel.sectionId)
      ? channel.sectionId
      : null;
    return {
      children: [
        ...sections
          .filter((section) => section.id !== current)
          .map((section) => ({
            key: `moveToSection-${section.id}`,
            label: section.name,
            onClick: () => void moveTo(channel.id, section.id),
          })),
        ...(sections.length > 1 || (sections.length === 1 && !current)
          ? [{ type: 'divider' as const }]
          : []),
        {
          icon: FolderPlus,
          key: 'moveToSection-new',
          label: t('section.new'),
          onClick: () => create(channel.id),
        },
        ...(current
          ? [
              {
                icon: FolderOutput,
                key: 'moveToSection-out',
                label: t('section.moveOut'),
                onClick: () => void moveTo(channel.id, null),
              },
            ]
          : []),
      ],
      icon: FolderInput,
      key: 'moveToSection',
      label: t('section.moveTo'),
    };
  };

  return { create, menuItem, remove, rename, sections };
};
