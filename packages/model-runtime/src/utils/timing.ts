import debug from 'debug';

import { isRecord, pickString } from './object';

interface TimingContext {
  requestId: string;
  startedAt: number;
}

interface TimingMetadata {
  [key: string]: unknown;
}

interface TimingParams {
  timingRequestId?: string;
  timingStartedAt?: number;
}

interface TimingSink {
  log: (event: string, metadata?: TimingMetadata) => void;
}

type TimingLogger = (formatter: string, ...args: unknown[]) => void;

const createDebugTimingLogger = (namespace: string): TimingLogger => debug(namespace);

export const getDurationMs = (startedAt: number) => Date.now() - startedAt;

const getTimingErrorMetadata = (error: unknown): TimingMetadata => {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
    };
  }

  if (isRecord(error)) {
    return {
      errorType: pickString(error.errorType),
      status: typeof error.status === 'number' ? error.status : undefined,
    };
  }

  return { errorMessage: String(error) };
};

const toTimingContext = (params?: TimingParams): TimingContext | undefined =>
  params?.timingRequestId
    ? { requestId: params.timingRequestId, startedAt: params.timingStartedAt ?? Date.now() }
    : undefined;

const logTiming = (
  logger: TimingLogger,
  context: TimingContext | undefined,
  event: string,
  metadata?: TimingMetadata,
) => {
  if (!context) return;

  const totalMs = getDurationMs(context.startedAt);
  if (metadata) {
    logger('[%s] %s totalMs=%d %O', context.requestId, event, totalMs, metadata);
    return;
  }

  logger('[%s] %s totalMs=%d', context.requestId, event, totalMs);
};

const markTimingStageDone = (
  logger: TimingLogger,
  context: TimingContext | undefined,
  stage: string,
  metadata?: TimingMetadata,
) => {
  if (!context) return;

  logTiming(logger, context, `${stage}:done`, {
    ...metadata,
    stageMs: 0,
  });
};

const runTimedStage = async <T>(
  logger: TimingLogger,
  context: TimingContext | undefined,
  stage: string,
  task: () => T | Promise<T>,
  metadata?: TimingMetadata,
): Promise<Awaited<T>> => {
  if (!context) return await task();

  const startedAt = Date.now();
  logTiming(logger, context, `${stage}:start`, metadata);

  try {
    const result = await task();
    logTiming(logger, context, `${stage}:done`, {
      ...metadata,
      stageMs: getDurationMs(startedAt),
    });

    return result;
  } catch (error) {
    logTiming(logger, context, `${stage}:error`, {
      ...metadata,
      ...getTimingErrorMetadata(error),
      stageMs: getDurationMs(startedAt),
    });

    throw error;
  }
};

const createPrefixedTimingContext = (
  logger: TimingLogger,
  context: TimingContext | undefined,
  prefix: string,
): TimingSink | undefined =>
  context
    ? {
        log: (event: string, metadata?: TimingMetadata) => {
          logTiming(logger, context, `${prefix}.${event}`, metadata);
        },
      }
    : undefined;

export const createTimingHelpers = (namespace: string) => {
  const logger = createDebugTimingLogger(namespace);

  return {
    createPrefixedTimingContext: (context: TimingContext | undefined, prefix: string) =>
      createPrefixedTimingContext(logger, context, prefix),
    logger,
    logTiming: (context: TimingContext | undefined, event: string, metadata?: TimingMetadata) =>
      logTiming(logger, context, event, metadata),
    markStageDone: (context: TimingContext | undefined, stage: string, metadata?: TimingMetadata) =>
      markTimingStageDone(logger, context, stage, metadata),
    runTimedStage: <T>(
      context: TimingContext | undefined,
      stage: string,
      task: () => T | Promise<T>,
      metadata?: TimingMetadata,
    ) => runTimedStage(logger, context, stage, task, metadata),
    toTimingContext,
  };
};
