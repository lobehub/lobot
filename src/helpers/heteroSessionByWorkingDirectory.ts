import type { ChatTopicMetadata } from '@lobot/types';

const getHeteroWorkingDirectoryKey = (workingDirectory: string | undefined): string =>
  workingDirectory ?? '';

export const getHeteroSessionIdForWorkingDirectory = (
  metadata: ChatTopicMetadata | undefined,
  workingDirectory: string | undefined,
): string | undefined => {
  const key = getHeteroWorkingDirectoryKey(workingDirectory);
  return metadata?.heteroSessionIdByWorkingDirectory?.[key];
};
