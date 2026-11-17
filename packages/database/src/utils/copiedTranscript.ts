/**
 * Raw-SQL twin of `notCopiedTranscript`, for aggregates assembled as SQL
 * text rather than through the query builder (`recomputeTopicUsage`). Assumes
 * `messages` is the (only) table in scope.
 */
export const NOT_COPIED_TRANSCRIPT_SQL = `COALESCE(metadata ->> 'copied', '') <> 'true'`;
