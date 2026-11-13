/**
 * Coalesce character saves. The world server enqueues after every tick
 * that dirties a hunter; the queue writes once the debounce elapses,
 * on a periodic sweep, on disconnect, and on SIGTERM.
 */

const RETRY_DELAYS = [200, 400, 800, 1600];

export function createSaveQueue({
  save,
  debounceMs = 2000,
  intervalMs = 30_000,
  retries = RETRY_DELAYS,
  clock = globalThis,
  onError = console.error,
} = {}) {
  const pending = new Map();
  const inflight = new Map();
  const timers = new Map();
  let interval = null;
  let closed = false;

  function schedule(userId) {
    const existing = timers.get(userId);
    if (existing) clock.clearTimeout(existing);
    const handle = clock.setTimeout(() => {
      timers.delete(userId);
      void flushOne(userId);
    }, debounceMs);
    timers.set(userId, handle);
  }

  async function flushOne(userId) {
    const job = pending.get(userId);
    if (!job) return null;
    if (inflight.has(userId)) {
      await inflight.get(userId);
      if (pending.get(userId) !== job) return flushOne(userId);
    }
    pending.delete(userId);
    const run = writeWithRetry(userId, job);
    inflight.set(userId, run);
    try {
      return await run;
    } finally {
      inflight.delete(userId);
    }
  }

  async function writeWithRetry(userId, job) {
    let lastErr;
    for (let i = 0; i <= retries.length; i++) {
      try {
        return await save(userId, job.state, { expectedVersion: job.expectedVersion });
      } catch (err) {
        lastErr = err;
        if (err?.code === 'conflict' || err?.code === 'not_found' || err?.code === 'invalid' || err?.code === 'name_taken') {
          onError?.(err);
          throw err;
        }
        if (i >= retries.length) break;
        await sleep(retries[i], clock);
      }
    }
    onError?.(lastErr);
    throw lastErr;
  }

  return {
    peek(userId) {
      return pending.get(userId) || null;
    },

    enqueue(userId, state, { expectedVersion } = {}) {
      if (closed) throw new Error('Persistence queue is shut down.');
      const prev = pending.get(userId);
      pending.set(userId, {
        state,
        expectedVersion: expectedVersion ?? prev?.expectedVersion,
      });
      schedule(userId);
    },

    async flush(userId) {
      const handle = timers.get(userId);
      if (handle) {
        clock.clearTimeout(handle);
        timers.delete(userId);
      }
      return flushOne(userId);
    },

    async flushAll() {
      for (const handle of timers.values()) clock.clearTimeout(handle);
      timers.clear();
      const ids = [...new Set([...pending.keys(), ...inflight.keys()])];
      await Promise.all(ids.map((id) => flushOne(id)));
    },

    get size() {
      return pending.size;
    },

    start() {
      if (interval || !intervalMs) return;
      interval = clock.setInterval(() => {
        void this.flushAll();
      }, intervalMs);
      if (typeof interval === 'object' && interval && 'unref' in interval) interval.unref();
    },

    async close() {
      closed = true;
      if (interval) {
        clock.clearInterval(interval);
        interval = null;
      }
      await this.flushAll();
    },
  };
}

function sleep(ms, clock) {
  return new Promise((resolve) => clock.setTimeout(resolve, ms));
}
