import { type ModelUsage } from '@lobot/types';

export const getDetailsToken = (usage: ModelUsage) => {
  const inputTextTokens = usage.inputTextTokens || (usage as any).inputTokens || 0;
  const totalInputTokens = usage.totalInputTokens || (usage as any).inputTokens || 0;

  const totalOutputTokens = usage.totalOutputTokens || (usage as any).outputTokens || 0;

  const outputReasoningTokens = usage.outputReasoningTokens || (usage as any).reasoningTokens || 0;

  const outputImageTokens = usage.outputImageTokens || (usage as any).imageTokens || 0;

  const inputToolTokens = usage.inputToolTokens || 0;

  const outputTextTokens =
    typeof usage.outputTextTokens === 'number'
      ? usage.outputTextTokens
      : Math.max(
          0,
          totalOutputTokens -
            outputReasoningTokens -
            (usage.outputAudioTokens || 0) -
            outputImageTokens,
        );

  const inputWriteCacheTokens = usage.inputWriteCacheTokens || 0;
  const inputCacheTokens = usage.inputCachedTokens || (usage as any).cachedTokens || 0;

  const inputCacheMissTokens =
    typeof usage?.inputCacheMissTokens === 'number'
      ? usage.inputCacheMissTokens
      : totalInputTokens - (inputCacheTokens || 0) - inputToolTokens;
  const cacheRateInputTokens = inputCacheMissTokens + inputCacheTokens + inputWriteCacheTokens;
  const cacheRate =
    cacheRateInputTokens > 0 && (inputCacheTokens > 0 || inputWriteCacheTokens > 0)
      ? inputCacheTokens / cacheRateInputTokens
      : undefined;

  const count = (token: number) => (token ? { token } : undefined);

  return {
    inputAudio: count(usage.inputAudioTokens || 0),
    inputCacheMiss: count(inputCacheMissTokens),
    inputCached: count(inputCacheTokens),
    inputCachedWrite: count(inputWriteCacheTokens),
    inputCacheRate: cacheRate,
    inputCitation: count(usage.inputCitationTokens || 0),
    inputText: count(inputTextTokens),
    inputTool: count(inputToolTokens),
    outputAudio: count(usage.outputAudioTokens || 0),
    outputImage: count(outputImageTokens),
    outputReasoning: count(outputReasoningTokens),
    outputText: count(outputTextTokens),
    totalInput: count(totalInputTokens),
    totalOutput: count(totalOutputTokens),
    totalTokens: count(usage.totalTokens || 0),
  };
};
