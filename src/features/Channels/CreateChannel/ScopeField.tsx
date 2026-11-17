import { Block, Flexbox, Icon, RadioGroup, Text } from '@lobehub/ui';
import type { LucideIcon } from 'lucide-react';
import { ChevronDownIcon, FolderKanban, FolderPlus, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ProjectSelector from '@/features/AgentTasks/features/ProjectSelector';
import ProjectAvatar from '@/features/Projects/ProjectAvatar';
import { projectListItemSelector, useProjectStore } from '@/store/project';
import { useUserStore } from '@/store/user';
import { labPreferSelectors } from '@/store/user/selectors';

export type ChannelKind = 'general' | 'project';

interface ScopeFieldProps {
  inert?: boolean;
  kind: ChannelKind;
  /** Set while the Channel's project is a new one, created together with it. */
  newProjectName?: string;
  /** Starts a new project, named by what was typed into the picker's search. */
  onCreateProject?: (name: string) => void;
  onKindChange: (kind: ChannelKind) => void;
  onProjectChange: (projectId: string | null) => void;
  /** The project of a project Channel; `null` until one is picked. */
  projectId: string | null;
}

const KindLabel = ({ desc, icon, title }: { desc: string; icon: LucideIcon; title: string }) => (
  <Flexbox gap={2}>
    <Flexbox horizontal align={'center'} gap={6}>
      <Icon icon={icon} size={16} />
      <Text weight={500}>{title}</Text>
    </Flexbox>
    <Text fontSize={12} type={'secondary'}>
      {desc}
    </Text>
  </Flexbox>
);

/** Whether the Projects lab is on; without it every Channel is general and no type is asked. */
export const useChannelKindsEnabled = () => useUserStore(labPreferSelectors.enableProjects);

/**
 * The kind of a new Channel, asked first like Discord's channel type: a general Channel, or a
 * project's, which lists under that project and offers its Agents first.
 */
export const ScopeField = ({
  inert,
  kind,
  newProjectName,
  onCreateProject,
  onKindChange,
  onProjectChange,
  projectId,
}: ScopeFieldProps) => {
  const { t } = useTranslation('channel');
  const project = useProjectStore(projectListItemSelector(projectId));
  const creating = newProjectName !== undefined;
  const label = creating
    ? newProjectName.trim() || t('scope.newProject')
    : (project?.name ?? t('scope.pickProject'));

  return (
    <Flexbox gap={8} inert={inert}>
      <Text weight={500}>{t('scope.label')}</Text>
      <RadioGroup
        gap={12}
        horizontal={false}
        value={kind}
        options={[
          {
            label: (
              <KindLabel desc={t('scope.generalHint')} icon={Hash} title={t('scope.general')} />
            ),
            value: 'general',
          },
          {
            label: (
              <KindLabel
                desc={t('scope.projectHint')}
                icon={FolderKanban}
                title={t('scope.project')}
              />
            ),
            value: 'project',
          },
        ]}
        onChange={(value) => onKindChange(value as ChannelKind)}
      />
      {kind === 'project' && (
        <ProjectSelector
          fullWidth
          value={creating ? undefined : projectId}
          onChange={onProjectChange}
          onCreate={onCreateProject}
        >
          <Block
            clickable
            horizontal
            align={'center'}
            gap={8}
            paddingBlock={6}
            paddingInline={11}
            style={{ width: '100%' }}
            variant={'filled'}
          >
            {creating ? (
              <Icon icon={FolderPlus} size={16} />
            ) : (
              project && (
                <ProjectAvatar
                  avatar={project.avatar}
                  id={project.id}
                  name={project.name}
                  size={18}
                />
              )
            )}
            <Text
              ellipsis
              style={{ flex: 1 }}
              type={(creating ? newProjectName.trim() : project) ? undefined : 'secondary'}
            >
              {label}
            </Text>
            <Icon icon={ChevronDownIcon} size={14} />
          </Block>
        </ProjectSelector>
      )}
    </Flexbox>
  );
};
