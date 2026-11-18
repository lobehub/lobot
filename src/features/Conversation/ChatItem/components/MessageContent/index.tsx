import { createStaticStyles, cx, Flexbox, type ModalInstance } from '@lobehub/ui';
import { type ReactNode } from 'react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { usePrintMode } from '@/features/Conversation/components/PrintModeContext';
import { dataSelectors, useConversationStore } from '@/features/Conversation/store';
import { openEditorModal } from '@/features/EditorModal';
import { usePermission } from '@/hooks/usePermission';

import { type ChatItemProps } from '../../type';
import { useEditConfirmation } from './useEditConfirmation';

export const MSG_CONTENT_CLASSNAME = 'msg_content_flag';

const styles = createStaticStyles(({ css, cssVar }) => {
  return {
    bubble: css`
      padding-block: 8px;
      padding-inline: 12px;
      border-radius: ${cssVar.borderRadiusLG};
      background-color: ${cssVar.colorFillTertiary};
    `,
    disabled: css`
      user-select: ${'none'};
      color: ${cssVar.colorTextSecondary};
    `,
    message: css`
      position: relative;
      overflow: hidden;
      max-width: 100%;
    `,
  };
});

interface MessageContentProps {
  children?: ReactNode;
  className?: string;
  disabled?: ChatItemProps['disabled'];
  editing?: ChatItemProps['editing'];
  id: string;
  message?: ReactNode;
  messageExtra?: ChatItemProps['messageExtra'];
  onDoubleClick?: ChatItemProps['onDoubleClick'];
  variant?: 'bubble' | 'default';
}

interface MessageEditorModalProps {
  canCreate: boolean;
  canEdit: boolean;
  id: string;
  message?: ReactNode;
  onEditingChange: (editing: boolean) => void;
}

/**
 * Opens the message editor while mounted. Only the row being edited mounts it, so the
 * edit-confirmation hooks (Codex runtime, execution target, workspace preference) run for that
 * one row instead of for every message in a feed.
 */
const MessageEditorModal = ({
  canCreate,
  canEdit,
  id,
  message,
  onEditingChange,
}: MessageEditorModalProps) => {
  const { t } = useTranslation('common');
  const editorData = useConversationStore(
    (s) => dataSelectors.getDisplayMessageById(id)(s)?.editorData,
  );
  const { onConfirm, shouldSendOnConfirm } = useEditConfirmation({
    canCreate,
    canEdit,
    editing: true,
    id,
    onEditingChange,
  });

  // Held in a ref rather than in the effect's deps: the editor snapshots the
  // message when it opens, so a re-render (a streaming token, a permission
  // refresh) must not tear down and reopen a modal the user is typing in.
  const openEditorRef = useRef<() => ModalInstance>(undefined);
  openEditorRef.current = () =>
    openEditorModal({
      editorData,
      okText: shouldSendOnConfirm ? t('send') : t('save'),
      value: message ? String(message) : '',
      onClose: () => onEditingChange(false),
      onConfirm: (value, data) => onConfirm(value, data as Record<string, unknown> | undefined),
    });

  useEffect(() => {
    const instance = openEditorRef.current!();
    return () => instance.close();
  }, []);

  return null;
};

const MessageContent = memo<MessageContentProps>(
  ({
    editing,
    id,
    message,
    messageExtra,
    children,
    onDoubleClick,
    disabled,
    className,
    variant,
  }) => {
    const toggleMessageEditing = useConversationStore((s) => s.toggleMessageEditing);
    const printMode = usePrintMode();

    const { allowed: canCreate } = usePermission('create_content');
    const { allowed: canEdit } = usePermission('edit_own_content');

    const onEditingChange = useCallback(
      (edit: boolean) => {
        if (!canEdit && edit) return;
        toggleMessageEditing(id, edit);
      },
      [canEdit, id, toggleMessageEditing],
    );

    return (
      <Flexbox
        gap={16}
        className={cx(
          MSG_CONTENT_CLASSNAME,
          styles.message,
          variant === 'bubble' && styles.bubble,
          disabled && styles.disabled,
          className,
        )}
        onDoubleClick={onDoubleClick}
      >
        {children || message}
        {messageExtra}
        {/* The print copy renders this component too; opening a second editor for it
            would close the real one (and drop its draft) when printing ends. */}
        {editing && !printMode && (
          <MessageEditorModal
            canCreate={canCreate}
            canEdit={canEdit}
            id={id}
            message={message}
            onEditingChange={onEditingChange}
          />
        )}
      </Flexbox>
    );
  },
);

export default MessageContent;
