import type { AnyRouter } from '@trpc/server';

/**
 * The LobeHub server's tRPC routers. Their source lives in the LobeHub repository, not in this
 * one, so the clients are untyped against them and each service types what it sends and reads.
 */
export type AsyncRouter = AnyRouter;
export type LambdaRouter = AnyRouter;
export type ToolsRouter = AnyRouter;

/** A client of one of those routers: any procedure path, with untyped input and output. */
export type UntypedClient = any;
