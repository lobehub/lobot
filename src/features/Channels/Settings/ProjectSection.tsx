import { Button, Flexbox, Text } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';

import { openInWebApp } from '@/features/Electron/navigation/webApp';
import ProjectAvatar from '@/features/Projects/ProjectAvatar';
import { projectListItemSelector, useProjectStore } from '@/store/project';

/** The project a Channel belongs to; the project itself is managed in the LobeHub web app. */
export function ProjectSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation(['channel', 'common']);
  const sync = useProjectStore((s) => s.useFetchProjectList)();
  const project = useProjectStore(projectListItemSelector(projectId));
  const missing = sync.isHydrated && !sync.isValidating && !project;

  return (
    <Flexbox gap={8} style={{ minWidth: 0 }}>
      <Text weight={400}>{t('settings.project.title')}</Text>
      <Flexbox horizontal align="center" gap={8} style={{ minWidth: 0 }}>
        <Flexbox flex={1} style={{ minWidth: 0 }}>
          {project ? (
            <Flexbox horizontal align="center" gap={8} style={{ minWidth: 0 }}>
              <ProjectAvatar
                avatar={project.avatar}
                id={project.id}
                name={project.name}
                size={32}
              />
              <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
                <Text ellipsis weight={400}>
                  {project.name}
                </Text>
                {project.description && (
                  <Text ellipsis={{ rows: 2 }} fontSize={12} type="secondary">
                    {project.description}
                  </Text>
                )}
              </Flexbox>
            </Flexbox>
          ) : (
            missing && <Text type="secondary">{t('settings.project.missing')}</Text>
          )}
        </Flexbox>
        <Button
          size="small"
          style={{ flexShrink: 0, fontWeight: 400 }}
          type="fill"
          onClick={() => openInWebApp(`/project/${encodeURIComponent(project?.slug || projectId)}`)}
        >
          {t('contacts.manage', { ns: 'common' })}
        </Button>
      </Flexbox>
    </Flexbox>
  );
}
