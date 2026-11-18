import type { VerifyCodingScope } from '@lobot/types';
import type { TFunction } from 'i18next';

import { goalStatusKey } from '@/features/AgentGoals/goalPresentation';
import { agentService } from '@/services/agent';
import { documentService } from '@/services/document';
import { goalService } from '@/services/goal';
import { taskService } from '@/services/task';
import { verifyService } from '@/services/verify';

import type { InternalLinkReference } from '../internalLink';

export interface PreviewData {
  avatar?: string | null;
  backgroundColor?: string | null;
  description?: string | null;
  meta?: string | null;
  secondaryMeta?: string | null;
  title?: string | null;
}

const getVerifyStatusLabel = (status: string | null | undefined, t: TFunction<'chat'>) => {
  switch (status) {
    case 'delivered': {
      return t('internalLink.preview.verifyStatus.delivered');
    }
    case 'errored': {
      return t('internalLink.preview.verifyStatus.errored');
    }
    case 'failed': {
      return t('internalLink.preview.verifyStatus.failed');
    }
    case 'passed': {
      return t('internalLink.preview.verifyStatus.passed');
    }
    case 'planned': {
      return t('internalLink.preview.verifyStatus.planned');
    }
    case 'repairing': {
      return t('internalLink.preview.verifyStatus.repairing');
    }
    case 'uncertain': {
      return t('internalLink.preview.verifyStatus.uncertain');
    }
    case 'unverified': {
      return t('internalLink.preview.verifyStatus.unverified');
    }
    case 'verifying': {
      return t('internalLink.preview.verifyStatus.verifying');
    }
    default: {
      return null;
    }
  }
};

/** The part of an acceptance bundle's check row the preview counts. */
interface AcceptanceBundleCheck {
  /** Final cross-round state of the check. */
  state: 'failed' | 'not_executed' | 'passed' | 'uncertain';
}

export const getPreviewData = async (
  reference: InternalLinkReference,
  t: TFunction<'chat'>,
): Promise<PreviewData | null> => {
  switch (reference.type) {
    case 'acceptance': {
      const bundle = await verifyService.getAcceptanceBundle(reference.acceptanceId);
      if (!bundle) return null;

      const passed = bundle.checks.filter(
        (check: AcceptanceBundleCheck) => check.state === 'passed',
      ).length;
      const exceptions = bundle.checks.filter(
        (check: AcceptanceBundleCheck) => check.state === 'failed' || check.state === 'uncertain',
      ).length;

      return {
        description: bundle.acceptance.requirement || bundle.latestReport?.summary,
        meta: t('internalLink.preview.acceptanceCounts', {
          exceptions,
          passed,
          total: bundle.checks.length,
        }),
        secondaryMeta: t('internalLink.preview.acceptanceRounds', {
          count: bundle.rounds.length,
        }),
        title: bundle.subject.title || bundle.subject.id,
      };
    }
    case 'agent': {
      return agentService.getAgentConfigById(reference.agentId);
    }
    case 'document': {
      const document = await documentService.getDocumentById(reference.documentId);
      return document
        ? {
            description: document.content,
            title: document.title || document.filename,
          }
        : null;
    }
    case 'goal': {
      const { decisions, goal, nodes } = await goalService.getGraph(reference.goalId);
      const tasks = nodes.filter((node) => node.kind === 'task');
      const done = tasks.filter((node) =>
        ['rejected', 'resolved', 'retired'].includes(node.status),
      ).length;
      const pending = decisions.filter((decision) => decision.status === 'pending').length;

      return {
        description: goal.requirement,
        meta: [
          pending > 0 ? t('goalList.needsYou', { count: pending }) : t(goalStatusKey(goal.status)),
          t('goalList.taskProgress', { done, total: tasks.length }),
        ].join(' · '),
        title: goal.title,
      };
    }
    case 'task': {
      const result = await taskService.getDetail(reference.taskId);
      const task = result.data;
      return task
        ? {
            description: task.description || task.instruction,
            title: task.name || task.identifier,
          }
        : null;
    }
    case 'verify': {
      const bundle = await verifyService.getReportBundle(reference.runId);
      if (!bundle) return null;

      const { report, run } = bundle;
      const status = report?.verdict ?? run.status;
      const counts = report
        ? t('internalLink.preview.verifyCounts', {
            failed: report.failedChecks ?? 0,
            passed: report.passedChecks ?? 0,
            uncertain: report.uncertainChecks ?? 0,
          })
        : null;
      // Branch/commit chips only exist on a coding scope (a run with no
      // scenario predates the column and is coding); testedAt is shared.
      const codingScope =
        (run.scenario ?? 'coding') === 'coding' ? (run.context as VerifyCodingScope | null) : null;
      const testedAt = (run.context as { testedAt?: string } | null)?.testedAt;
      const scope = [
        codingScope?.branch,
        codingScope?.commit?.slice(0, 10),
        testedAt ? new Date(testedAt).toLocaleString() : null,
      ].filter(Boolean);

      return {
        description: report?.summary,
        meta: [getVerifyStatusLabel(status, t), counts].filter(Boolean).join(' · '),
        secondaryMeta: scope.join(' · '),
        title: run.title,
      };
    }
    case 'route': {
      return null;
    }
  }
};
