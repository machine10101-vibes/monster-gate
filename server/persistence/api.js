import { createMemoryAdapter } from './adapters/memory.js';
import { createNoopAdapter } from './adapters/noop.js';
import { alreadyImported, PersistenceError } from './errors.js';
import { requireUserId } from './ids.js';
import { createSaveQueue } from './queue.js';
import { extractLocalHunt, mergeState, sanitizeState } from './schema.js';

/**
 * Pluggable character persistence. Pass an adapter, or let
 * `openPersistence()` pick Supabase from env / memory for local tests.
 */
export function createPersistence(options = {}) {
  const adapter = options.adapter || createMemoryAdapter();
  const versions = new Map();
  const queue = createSaveQueue({
    save: (userId, state, opts) => write(userId, state, opts),
    debounceMs: options.debounceMs ?? 2000,
    intervalMs: options.intervalMs ?? 30_000,
    retries: options.retries,
    clock: options.clock,
    onError: options.onError,
  });
  if (options.autoStart !== false) queue.start();

  const signals = [];

  async function write(userId, state, { expectedVersion, importedAt } = {}) {
    const id = requireUserId(userId);
    const version = expectedVersion ?? versions.get(id);
    const saved = await adapter.save(id, withSeen(state), { expectedVersion: version, importedAt });
    versions.set(id, saved.version);
    return saved;
  }

  function remember(row) {
    if (row?.userId) versions.set(row.userId, row.version);
    return row;
  }

  return {
    adapter,
    queue,

    async loadCharacter(userId) {
      return remember(await adapter.load(userId));
    },

    async createCharacter(userId, name, extra = {}) {
      return remember(await adapter.create(userId, name, extra));
    },

    /**
     * Persist `state`. By default the write is coalesced. Pass
     * `{ immediate: true }` on disconnect.
     */
    async saveCharacter(userId, state, opts = {}) {
      const id = requireUserId(userId);
      const queued = queue.peek(id)?.state;
      const next = sanitizeState(mergeState(queued || (await peekState(adapter, id)), state));
      queue.enqueue(id, next, { expectedVersion: opts.expectedVersion ?? versions.get(id) });
      if (opts.immediate) return queue.flush(id);
      return { ok: true, queued: true, userId: id };
    },

    /**
     * One-shot import of a browser hunt (Progress JSON or roster record).
     * Stats are clamped to game caps so a local save cannot inflate XP,
     * gold, stacks, or skill points. Guests are not persisted; the world
     * server should only call this for an authenticated userId.
     */
    async importLocalSave(userId, localSaveJson) {
      const id = requireUserId(userId);
      const hunt = extractLocalHunt(localSaveJson);
      const state = sanitizeState(hunt, { importMode: true });
      state.importedAt = Date.now();
      state.last_seen = new Date().toISOString();
      let row = await adapter.load(id);
      if (row?.importedAt) throw alreadyImported(row);
      if (!row) {
        row = await adapter.create(id, state.name || hunt.name || 'Hunter', {
          look: state.look,
          state,
        });
      } else {
        row = await adapter.save(id, state, {
          expectedVersion: row.version,
          importedAt: new Date(state.importedAt).toISOString(),
        });
      }
      if (adapter.markImported && !row.importedAt) {
        row = await adapter.markImported(id);
      }
      return remember(row);
    },

    flush(userId) {
      return queue.flush(userId);
    },

    flushAll() {
      return queue.flushAll();
    },

    installShutdownHandlers(proc = process) {
      const stop = async () => {
        try {
          await queue.close();
        } catch (err) {
          options.onError?.(err);
        }
      };
      for (const signal of ['SIGTERM', 'SIGINT']) {
        const handler = () => {
          void stop();
        };
        proc.on(signal, handler);
        signals.push([proc, signal, handler]);
      }
      return stop;
    },

    async close() {
      for (const [proc, signal, handler] of signals) proc.off(signal, handler);
      signals.length = 0;
      await queue.close();
    },

    async listFriends(userId) {
      return adapter.listFriends(requireUserId(userId));
    },

    async requestFriend(fromUserId, toUserIdOrName) {
      requireUserId(fromUserId);
      return adapter.requestFriend(fromUserId, toUserIdOrName);
    },

    async acceptFriend(userId, otherUserId) {
      return adapter.acceptFriend(requireUserId(userId), requireUserId(otherUserId));
    },

    async declineFriend(userId, otherUserId) {
      return adapter.declineFriend(requireUserId(userId), requireUserId(otherUserId));
    },

    async removeFriend(userId, otherUserId) {
      return adapter.removeFriend(requireUserId(userId), requireUserId(otherUserId));
    },
  };
}

export async function openPersistence(options = {}) {
  const adapter = options.adapter || (await resolveAdapter(options));
  return createPersistence({ ...options, adapter });
}

async function resolveAdapter(options) {
  const kind = options.adapterKind || process.env.MG_PERSISTENCE_ADAPTER || '';
  if (kind === 'noop') return createNoopAdapter();
  if (kind === 'memory' || options.memory) return createMemoryAdapter();
  const url = options.supabaseUrl || process.env.SUPABASE_URL || '';
  const key = options.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (url && key) {
    const { createSupabaseAdapter } = await import('./adapters/supabase.js');
    return createSupabaseAdapter({ url, serviceRoleKey: key });
  }
  return createMemoryAdapter();
}

function withSeen(state) {
  return { ...state, last_seen: state.last_seen || new Date().toISOString(), savedAt: Date.now() };
}

async function peekState(adapter, userId) {
  try {
    const row = await adapter.load(userId);
    return row?.state || {};
  } catch (err) {
    if (err instanceof PersistenceError && err.code === 'not_found') return {};
    throw err;
  }
}
