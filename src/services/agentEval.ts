import type { EvalCaseEnvironment, EvalTestCaseContent, RubricType } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

class AgentEvalService {
  /** Every dataset, whether or not it belongs to a benchmark. */
  async listAllDatasets() {
    return lambdaClient.agentEval.listDatasets.query({});
  }

  async createTestCase(params: {
    environmentId?: string | null;
    content: {
      category?: string;
      choices?: string[];
      environment?: EvalCaseEnvironment;
      expected?: string;
      input: string;
      /**
       * Conversation replayed into the eval topic before `input` is sent. The
       * router has always accepted it; this client had not exposed it.
       */
      messages?: EvalTestCaseContent['messages'];
    };
    datasetId: string;
    evalConfig?: { criteria?: string; judgePrompt?: string };
    evalMode?: RubricType;
    metadata?: Record<string, unknown>;
  }) {
    return lambdaClient.agentEval.createTestCase.mutate(params);
  }
}

export const agentEvalService = new AgentEvalService();
