import type { AcceptanceVisibility } from '@lobechat/const/verify';
import type {
  AcceptanceChecklistItem,
  AcceptanceCheckReviewAction,
  AcceptanceRejectIntent,
  AcceptanceReviewAnnotation,
  CreatableAcceptanceSubjectType,
  ReviewAdjudication,
  ReviewProposalEdit,
  VerifierType,
  VerifyCheckDefinition,
  VerifyCheckItem,
  VerifyEvidence,
  VerifyOnFailStrategy,
  VerifyReport,
  VerifyRubricConfig,
  VerifyUserDecision,
} from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';
import type {
  VerifyAutoRepairOutcome,
  VerifyCheckResultItem,
  VerifyCriterionItem,
  VerifyRubricItem,
  VerifyRunItem,
  VerifyStatus,
} from '@/types/serverData';

/** Criterion row plus the judge instruction resolved from its linked document. */
type GoalCriterionWithInstruction = VerifyCriterionItem & { instruction?: string };

type AcceptanceBundle = Awaited<ReturnType<typeof lambdaClient.acceptance.getBundle.query>>;
type AcceptanceListItem = Awaited<ReturnType<typeof lambdaClient.acceptance.list.query>>[number];

type AcceptanceListPage = Awaited<ReturnType<typeof lambdaClient.acceptance.listPage.query>>;

/** The list's status split, shared by the flat and paged reads. */
type AcceptanceListFilter = 'active' | 'all' | 'completed';

/** Whose acceptances: the active scope, only mine, or any I commented on. */
type AcceptanceListScope = 'all' | 'created' | 'participated';

/** Where the acceptance came from; `standalone` also covers documents. */
type AcceptanceListSource = 'all' | 'goal' | 'standalone' | 'task' | 'topic';

/** Every list narrowing beyond search. `projectId: null` = filed under no project. */
interface AcceptanceListQuery {
  filter?: AcceptanceListFilter;
  projectId?: string | null;
  scope?: AcceptanceListScope;
  source?: AcceptanceListSource;
}

/** The lifecycle states a reviewer may set by hand from the acceptance list. */
type AcceptanceStatusOverride = 'accepted' | 'closed' | 'delivered' | 'rejected';

/** Editable fields of a single delivery-check criterion. */
interface UpdateCriterionValue {
  archivedAt?: Date | null;
  definition?: VerifyCheckDefinition | null;
  description?: string | null;
  documentId?: string | null;
  onFail?: VerifyOnFailStrategy;
  required?: boolean;
  tags?: string[];
  title?: string;
  verifierConfig?: Record<string, unknown>;
  verifierType?: VerifierType;
}

/** Fields for authoring a new delivery-check criterion. */
interface CreateCriterionInput {
  definition?: VerifyCheckDefinition;
  description?: string;
  documentId?: string;
  onFail?: VerifyOnFailStrategy;
  required?: boolean;
  tags?: string[];
  title: string;
  verifierConfig?: Record<string, unknown>;
  verifierType: VerifierType;
}

/** Fields for authoring a new rubric (named criteria group). */
interface CreateRubricInput {
  config?: VerifyRubricConfig;
  description?: string;
  title: string;
}

/**
 * A proposed (or user-edited) acceptance criterion before it is persisted. The
 * shape returned by `generateCriteria` and the shape `createCriteria` accepts.
 */
interface VerifyCriterionDraft {
  description?: string;
  /** Reuse an existing instruction doc (preserves the rubric on re-save). */
  documentId?: string | null;
  instruction?: string;
  onFail?: VerifyOnFailStrategy;
  required?: boolean;
  title: string;
  verifierConfig?: Record<string, unknown>;
  verifierType?: VerifierType;
}

interface VerifyStateResponse {
  /** The server's auto-repair decision for a failed round; absent until it decided. */
  verifyAutoRepair?: VerifyAutoRepairOutcome | null;
  verifyPlan: VerifyCheckItem[] | null;
  verifyPlanConfirmedAt: Date | null;
  verifyStatus: VerifyStatus | null;
}

/** One evidence artifact plus resolved display metadata, when file-backed. */
type VerifyEvidenceWithUrl = VerifyEvidence & {
  fileName: string | null;
  fileUrl: string | null;
  /** `terminal` evidence only: signed URLs for the stdout / stderr / output / recording files. */
  terminalArtifacts?: Partial<
    Record<
      'cast' | 'output' | 'stderr' | 'stdout',
      { fileUrl: string | null; sha256: string; size: number }
    >
  >;
};

/** One check result plus the evidence artifacts attached to it. */
type VerifyResultWithEvidence = VerifyCheckResultItem & {
  evidence: VerifyEvidenceWithUrl[];
};

/** Everything the standalone report viewer needs for one verification session. */
interface VerifyReportBundle {
  /**
   * Whether the viewer authored this run. Report URLs are public, so
   * author-only affordances (the origin conversation) gate on this — the server
   * redacts `run.metadata.origin` for everyone else.
   */
  isOwner: boolean;
  report: VerifyReport | null;
  results: VerifyResultWithEvidence[];
  run: VerifyRunItem;
}

/** The acceptance round a verify run belongs to — where its old `/verify/:runId` link lands. */
interface VerifyRunAcceptanceRound {
  acceptanceId: string;
  roundIndex: number | null;
}

interface GenerateDraftPlanInput {
  context?: string;
  enableAiGeneration?: boolean;
  goal: string;
  maxAiCriteria?: number;
  operationId: string;
  verifyCriteriaIds?: string[];
  verifyRubricId?: string | null;
}

/** Client wrapper around the `verify` lambda router. */
class VerifyService {
  // ---- subject-level acceptance ----
  getAcceptanceBundle = (id: string): Promise<AcceptanceBundle> =>
    lambdaClient.acceptance.getBundle.query({ id });

  /** Full report payload for the standalone viewer, addressed by verifyRunId. */
  getReportBundle = (verifyRunId: string): Promise<VerifyReportBundle | null> =>
    lambdaClient.verify.getReportBundle.query({
      verifyRunId,
    }) as Promise<VerifyReportBundle | null>;
}

export const verifyService = new VerifyService();
