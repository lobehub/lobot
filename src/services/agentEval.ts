import type {
  AgentEvalDatasetPackageBindings,
  AgentEvalRunListItem,
  EvalCaseEnvironment,
  EvalConfig,
  EvalRunInputConfig,
  EvalTestCaseContent,
  RubricType,
} from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

class AgentEvalService {
  // ============ Experiment ============
  async listExperiments() {
    return lambdaClient.agentEval.listExperiments.query();
  }

  async getExperiment(id: string) {
    return lambdaClient.agentEval.getExperiment.query({ id });
  }

  // ============ Benchmark ============
  async listBenchmarks() {
    return lambdaClient.agentEval.listBenchmarks.query();
  }

  async getBenchmark(id: string) {
    return lambdaClient.agentEval.getBenchmark.query({ id });
  }

  // ============ Dataset ============
  // ============================================
  // Environments
  // ============================================
  async listEvalConnectors(datasetId: string) {
    return lambdaClient.agentEval.listEvalConnectors.query({ datasetId });
  }

  async getEvalConnector(datasetId: string, id: string) {
    return lambdaClient.agentEval.getEvalConnector.query({ datasetId, id });
  }

  async getDatasetConnectorBindings(datasetId: string) {
    return lambdaClient.agentEval.getDatasetConnectorBindings.query({ datasetId });
  }

  async listEnvironments() {
    return lambdaClient.agentEval.listEnvironments.query();
  }

  async listDatasets(benchmarkId: string) {
    return lambdaClient.agentEval.listDatasets.query({ benchmarkId });
  }

  /** Every dataset, whether or not it belongs to a benchmark. */
  async listAllDatasets() {
    return lambdaClient.agentEval.listDatasets.query({});
  }

  async getDataset(id: string) {
    return lambdaClient.agentEval.getDataset.query({ id });
  }

  // ============ Test Case ============
  async getTestCase(id: string) {
    return lambdaClient.agentEval.getTestCase.query({ id });
  }

  async listTestCases(params: { datasetId: string; limit?: number; offset?: number }) {
    return lambdaClient.agentEval.listTestCases.query(params);
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

  // ============ Run ============
  async listRuns(params: {
    benchmarkId?: string;
    datasetId?: string;
    experimentId?: string;
    limit?: number;
    offset?: number;
  }) {
    return lambdaClient.agentEval.listRuns.query(params);
  }

  /** Complete run list for summaries and actions that must cover every run. */
  async listAllRuns(params: { benchmarkId?: string; datasetId?: string; experimentId?: string }) {
    const runs = new Map<string, AgentEvalRunListItem>();
    const limit = 100;
    for (let offset = 0; ; offset += limit) {
      const { data } = await this.listRuns({ ...params, limit, offset });
      // Concurrent inserts can shift an offset boundary between requests.
      for (const run of data) runs.set(run.id, run);
      // listRuns.total currently counts this page, not all matching runs.
      if (data.length < limit) return [...runs.values()];
    }
  }

  async getRunDetails(id: string) {
    return lambdaClient.agentEval.getRunDetails.query({ id });
  }

  async getRunResults(id: string) {
    return lambdaClient.agentEval.getRunResults.query({ id });
  }
}

export const agentEvalService = new AgentEvalService();
