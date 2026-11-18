import { lambdaClient } from '@/libs/trpc/client';

type Client = typeof lambdaClient.projectWorkingDirectory;

interface AssociateTopicInput {
  /** The directory to file it under; the topic's own binding decides when left out. */
  directoryId?: string;
  projectId: string;
  topicId: string;
}

interface AttachRepositoryInput {
  projectId: string;
  repository: { defaultBranch?: string; name: string; url: string };
  /** `public` for a workspace-public agent, which applies published environments only. */
  visibility?: 'private' | 'public';
}

interface BindProjectDirectoryInput {
  agentId?: string;
  deviceId: string;
  environmentId?: string;
  name: string;
  path: string;
  projectId: string;
  repositoryUrl?: string;
  topicIds?: string[];
}

interface CreateProjectTopicInput {
  agentId: string;
  /** The project repository the conversation works in; the first one when left out. */
  environmentId?: string;
  projectId: string;
  title: string;
}

interface RelocateDirectoryInput {
  deviceId: string;
  id: string;
  path: string;
  projectId: string;
}

class ProjectWorkingDirectoryService {
  listProjectTopics = (projectId: string) =>
    lambdaClient.projectWorkingDirectory.listProjectTopics.query({ projectId });
  createProjectTopic = (input: CreateProjectTopicInput) =>
    lambdaClient.projectWorkingDirectory.createProjectTopic.mutate(input);
  associateTopic = (input: AssociateTopicInput) =>
    lambdaClient.projectWorkingDirectory.associateTopic.mutate(input);
  listEnvironments = (projectId?: string) =>
    lambdaClient.projectWorkingDirectory.listEnvironments.query({ projectId });
  saveEnvironment = (input: Parameters<Client['saveEnvironment']['mutate']>[0]) =>
    lambdaClient.projectWorkingDirectory.saveEnvironment.mutate(input);
  attachEnvironment = (projectId: string, environmentId: string) =>
    lambdaClient.projectWorkingDirectory.attachEnvironment.mutate({ projectId, environmentId });
  attachRepository = (input: AttachRepositoryInput) =>
    lambdaClient.projectWorkingDirectory.attachRepository.mutate(input);
  bind = (input: BindProjectDirectoryInput) =>
    lambdaClient.projectWorkingDirectory.bind.mutate(input);
  list = (projectId?: string) => lambdaClient.projectWorkingDirectory.list.query({ projectId });
  listTopics = (id: string) => lambdaClient.projectWorkingDirectory.listTopics.query({ id });
  listEnvironmentTopics = async (directoryIds: string[]) => {
    const responses = await Promise.all(directoryIds.map((id) => this.listTopics(id)));
    return {
      data: responses
        .flatMap((response) => response.data)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      success: true,
    };
  };
  moveTopic = (input: Parameters<Client['moveTopic']['mutate']>[0]) =>
    lambdaClient.projectWorkingDirectory.moveTopic.mutate(input);
  relocate = (input: RelocateDirectoryInput) =>
    lambdaClient.projectWorkingDirectory.relocate.mutate(input);
  remove = (input: Parameters<Client['remove']['mutate']>[0]) =>
    lambdaClient.projectWorkingDirectory.remove.mutate(input);
  resolve = (id: string) => lambdaClient.projectWorkingDirectory.resolve.query({ id });
  startTopic = (input: Parameters<Client['startTopic']['mutate']>[0]) =>
    lambdaClient.projectWorkingDirectory.startTopic.mutate(input);
}
export const projectWorkingDirectoryService = new ProjectWorkingDirectoryService();
