import type { Draft, Patch } from 'immer';
import { applyPatches } from 'immer';
import type { StoreApi } from 'zustand';

type StoreState = object;
type AnyStore = StoreHandle<StoreState>;
type Recipe<S> = (draft: Draft<S>) => void;
type RemoteFn<T> = () => Promise<T>;

type OptimisticMutationStatus = 'failed' | 'inflight' | 'pending' | 'rolled-back' | 'success';

export type StoreHandle<S extends StoreState = StoreState> = Pick<
  StoreApi<S>,
  'getState' | 'setState'
>;

export interface OptimisticMutationSnapshot {
  actionName?: string;
  affectedPaths: string[];
  id: string;
  maxRetries: number;
  retryCount: number;
  status: OptimisticMutationStatus;
  timestamp: Date;
}

interface OptimisticEngineOptions {
  maxHistory?: number;
  maxRetries?: number;
  onMutationError?: (snapshot: OptimisticMutationSnapshot, error: unknown) => void;
  onMutationSuccess?: (snapshot: OptimisticMutationSnapshot) => void;
  onQueueChange?: (snapshots: OptimisticMutationSnapshot[]) => void;
}

interface SetOptions {
  flush?: boolean;
}

interface StorePatchEntry {
  inversePatches: Patch[];
  patches: Patch[];
}

interface QueuedMutation {
  actionName?: string;
  affectedPaths: string[];
  id: string;
  maxRetries: number;
  onError?: (error: unknown) => void | Promise<void>;
  onSuccess?: (result: unknown) => void | Promise<void>;
  reject?: (reason?: unknown) => void;
  remoteFn: RemoteFn<unknown>;
  resolve?: (value: unknown) => void;
  retryCount: number;
  status: OptimisticMutationStatus;
  storePatches: Map<AnyStore, StorePatchEntry>;
  timestamp: number;
}

interface Mutation<T = unknown> extends Omit<QueuedMutation, 'onSuccess' | 'remoteFn' | 'resolve'> {
  onSuccess?: (result: T) => void | Promise<void>;
  remoteFn: RemoteFn<T>;
  resolve?: (value: T) => void;
}

interface SetRecord {
  flushed: boolean;
  inversePatches: Patch[];
  patches: Patch[];
  store: AnyStore;
}

function asAnyStore<S extends StoreState>(store: StoreHandle<S>): AnyStore {
  return store as unknown as AnyStore;
}

const storeIdMap = new WeakMap<AnyStore, string>();
const storeIdCounter = 0;
const mutationIdCounter = 0;

class MutationQueue {
  private history: OptimisticMutationSnapshot[] = [];
  private idleResolvers = new Set<() => void>();
  private inflightIds = new Set<string>();
  private readonly maxHistory: number;
  private readonly options: Required<OptimisticEngineOptions>;
  private queue: QueuedMutation[] = [];

  constructor(options: OptimisticEngineOptions = {}) {
    this.maxHistory = options.maxHistory ?? 20;
    this.options = {
      maxHistory: this.maxHistory,
      maxRetries: options.maxRetries ?? 0,
      onMutationError: options.onMutationError ?? (() => {}),
      onMutationSuccess: options.onMutationSuccess ?? (() => {}),
      onQueueChange: options.onQueueChange ?? (() => {}),
    };
  }

  /**
   * Re-apply the optimistic patches of every mutation still waiting to run.
   * A server refresh replaces the state those patches were applied to, and a
   * queued mutation never refetches after it lands — so without this its edit
   * would vanish from the UI until some later refresh.
   */
  reapplyPending() {
    const pending = this.queue
      .filter((mutation) => mutation.status === 'pending' && !this.inflightIds.has(mutation.id))
      .sort((a, b) => a.timestamp - b.timestamp);
    const stores = new Set<AnyStore>();
    for (const mutation of pending) {
      for (const store of mutation.storePatches.keys()) stores.add(store);
    }

    for (const store of stores) {
      let nextState = store.getState();
      for (const mutation of pending) {
        const entry = mutation.storePatches.get(store);
        if (!entry) continue;
        try {
          nextState = applyPatches(nextState, entry.patches);
        } catch {
          // The refreshed state no longer has the patched path (e.g. the entry
          // is gone); nothing left to re-apply this edit to.
        }
      }
      store.setState(nextState);
    }
  }
}

class Transaction<D extends StoreState = Record<string, never>> {
  private committed = false;
  private readonly defaultStore: AnyStore | null;
  private mutationFn: RemoteFn<unknown> | null = null;
  private readonly name: string;
  private readonly enqueueFn: <T>(mutation: Mutation<T>) => Promise<T>;
  private readonly maxRetries: number;
  private records: SetRecord[] = [];
  private workingStates = new Map<AnyStore, StoreState>();

  constructor(
    name: string,
    enqueueFn: <T>(mutation: Mutation<T>) => Promise<T>,
    maxRetries: number,
    defaultStore?: StoreHandle<D>,
  ) {
    this.defaultStore = defaultStore ? asAnyStore(defaultStore) : null;
    this.enqueueFn = enqueueFn;
    this.maxRetries = maxRetries;
    this.name = name;
  }
}

export class OptimisticEngine<S extends StoreState = Record<string, never>> {
  private readonly defaultStore?: StoreHandle<S>;
  private readonly maxRetries: number;
  private readonly queue: MutationQueue;

  constructor(defaultStore?: StoreHandle<S>, options?: OptimisticEngineOptions) {
    this.defaultStore = defaultStore;
    this.maxRetries = options?.maxRetries ?? 0;
    this.queue = new MutationQueue(options);
  }
}
