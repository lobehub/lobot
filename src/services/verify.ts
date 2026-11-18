import type { VerifyEvidence, VerifyReport } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';
import type { VerifyCheckResultItem, VerifyRunItem } from '@/types/serverData';

type AcceptanceBundle = Awaited<ReturnType<typeof lambdaClient.acceptance.getBundle.query>>;

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
