import { Button, Flexbox, Text } from '@lobehub/ui';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { openInWebApp } from '@/features/Electron/navigation/webApp';
import ProjectAvatar from '@/features/Projects/ProjectAvatar';
import { projectListItemSelector, useProjectStore } from '@/store/project';

import { FormCard } from './FormCard';

/** The project a Channel belongs to; the project itself is managed in the LobeHub web app. */
export function ProjectSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('channel');
  const sync = useProjectStore((s) => s.useFetchProjectList)();
  const project = useProjectStore(projectListItemSelector(projectId));

  return (
    <FormCard
      description={t('settings.project.description')}
      hint={t('settings.project.manageHint')}
      title={t('settings.project.title')}
      action={
        <Button
          icon={ExternalLink}
          onClick={() => openInWebApp(`/project/${encodeURIComponent(project?.slug || projectId)}`)}
        >
          {t('settings.project.manage')}
        </Button>
      }
    >
      {project ? (
        <Flexbox horizontal align="center" gap={12}>
          <ProjectAvatar avatar={project.avatar} id={project.id} name={project.name} size={40} />
          <Flexbox gap={2} style={{ minWidth: 0 }}>
            <Text ellipsis weight={500}>
              {project.name}
            </Text>
            {project.description && (
              <Text ellipsis={{ rows: 2 }} fontSize={13} type="secondary">
                {project.description}
              </Text>
            )}
          </Flexbox>
        </Flexbox>
      ) : (
        // Until the list has synced, an absent row is only not loaded yet.
        sync.isHydrated &&
        !sync.isValidating && <Text type="secondary">{t('settings.project.missing')}</Text>
      )}
    </FormCard>
  );
}
