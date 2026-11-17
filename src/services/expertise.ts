import { lambdaClient } from '@/libs/trpc/client';

export type ExpertiseOverview = Awaited<
  ReturnType<typeof lambdaClient.expertise.listByAgent.query>
>;
export type ExpertiseDomainDetail = NonNullable<
  Awaited<ReturnType<typeof lambdaClient.expertise.getDomain.query>>
>;
export type ExpertiseLessonDetail = NonNullable<
  Awaited<ReturnType<typeof lambdaClient.expertise.getLesson.query>>
>;
type ExpertiseDomainDraft = Awaited<ReturnType<typeof lambdaClient.expertise.draftDomain.mutate>>;

export type RulesOverview = Awaited<ReturnType<typeof lambdaClient.expertise.listRules.query>>;
export type RuleSource = Awaited<
  ReturnType<typeof lambdaClient.expertise.ruleSources.query>
>[number];
export type RuleRevision = Awaited<
  ReturnType<typeof lambdaClient.expertise.ruleRevisions.query>
>[number];
type DistillInput = Parameters<typeof lambdaClient.expertise.distillRules.mutate>[0];
type CommitDistilledInput = Parameters<
  typeof lambdaClient.expertise.commitDistilledRules.mutate
>[0];
type CreateRuleInput = Parameters<typeof lambdaClient.expertise.createRule.mutate>[0];
type UpdateRuleInput = Omit<
  Parameters<typeof lambdaClient.expertise.updateRule.mutate>[0],
  'lessonId'
>;

class ExpertiseService {
  listByAgent = async (agentId: string) => lambdaClient.expertise.listByAgent.query({ agentId });

  listRules = async () => lambdaClient.expertise.listRules.query();

  ruleSources = async (lessonId: string) => lambdaClient.expertise.ruleSources.query({ lessonId });

  ruleRevisions = async (lessonId: string) =>
    lambdaClient.expertise.ruleRevisions.query({ lessonId });

  getDomain = async (domainId: string) => lambdaClient.expertise.getDomain.query({ domainId });

  getLesson = async (lessonId: string) => lambdaClient.expertise.getLesson.query({ lessonId });

  countHistory = async (agentId: string) => lambdaClient.expertise.countHistory.query({ agentId });
}

export const expertiseService = new ExpertiseService();
