const DEFAULT_POOL_ACQUIRE_TIMEOUT_MS = 30_000;

/**
 * Pool options shared by the node and neon drivers.
 *
 * `connectionTimeoutMillis` bounds the wait for a free pool connection. pg's default is 0 (wait
 * forever): on 2026-11-02 one exhausted pool hung every request on its Vercel instance for 300s
 * until the function timed out, instead of failing the requests that could not get a connection.
 */
export const buildPoolOptions = (env: {
  DATABASE_POOL_ACQUIRE_TIMEOUT?: number;
  DATABASE_STATEMENT_TIMEOUT?: number;
}) => {
  // When DATABASE_STATEMENT_TIMEOUT is set, Postgres aborts any statement (and any
  // transaction left idle) exceeding it on the server side, so a stuck query can't
  // block indefinitely. Omit the keys entirely when unset to keep Postgres' defaults.
  const statementTimeout = env.DATABASE_STATEMENT_TIMEOUT;

  return {
    connectionTimeoutMillis: env.DATABASE_POOL_ACQUIRE_TIMEOUT ?? DEFAULT_POOL_ACQUIRE_TIMEOUT_MS,
    ...(statementTimeout
      ? {
          idle_in_transaction_session_timeout: statementTimeout,
          statement_timeout: statementTimeout,
        }
      : {}),
  };
};
