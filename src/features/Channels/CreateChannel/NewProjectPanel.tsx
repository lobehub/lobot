import { ActionIcon, Flexbox, Icon, Input, Text } from '@lobehub/ui';
import { FolderPlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NewProjectPanelProps {
  inert?: boolean;
  name: string;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onPressEnter: () => void;
}

/**
 * The right half of the create dialog while its project is a new one: the project is created
 * together with the Channel, which is named after it.
 */
export const NewProjectPanel = ({
  inert,
  name,
  onClose,
  onNameChange,
  onPressEnter,
}: NewProjectPanelProps) => {
  const { t } = useTranslation('channel');

  return (
    <Flexbox gap={16} inert={inert}>
      <Flexbox horizontal align={'center'} gap={8} justify={'space-between'}>
        <Flexbox horizontal align={'center'} gap={6}>
          <Icon icon={FolderPlus} size={16} />
          <Text weight={500}>{t('newProject.title')}</Text>
        </Flexbox>
        <ActionIcon icon={X} size={'small'} title={t('newProject.discard')} onClick={onClose} />
      </Flexbox>
      <Flexbox gap={6}>
        <label htmlFor="new-project-name" style={{ fontWeight: 500 }}>
          {t('newProject.nameLabel')}
        </label>
        <Input
          autoFocus
          id="new-project-name"
          maxLength={255}
          placeholder={t('newProject.namePlaceholder')}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onPressEnter={onPressEnter}
        />
        <Text fontSize={12} type={'secondary'}>
          {t('newProject.channelNameHint')}
        </Text>
      </Flexbox>
    </Flexbox>
  );
};
