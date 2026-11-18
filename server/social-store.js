/** Account-keyed social persistence. Supabase service role is server-only. */
const TABLE = 'friendships';

export function createMemorySocialStore() {
  const rows = new Map();
  const key = (a, b) => `${a}:${b}`;
  return {
    kind: 'memory',
    async list(userId) { return [...rows.values()].filter(r => r.requester_id === userId || r.target_id === userId); },
    async put(row) { rows.set(key(row.requester_id, row.target_id), { ...row, updated_at: new Date().toISOString() }); },
    async remove(a, b) { rows.delete(key(a, b)); },
  };
}

export function createSupabaseSocialStore(env = process.env) {
  const url = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!url || !key) return null;
  const request = async (path, init = {}) => {
    const res = await fetch(`${url}/rest/v1/${TABLE}${path}`, {
      ...init,
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const err = new Error(detail || `Social storage failed (${res.status})`);
      err.code = 'persist';
      throw err;
    }
    return res.status === 204 ? null : res.json();
  };
  return {
    kind: 'supabase',
    async list(userId) {
      const q = new URLSearchParams({ select: '*', or: `(requester_id.eq.${userId},target_id.eq.${userId})` });
      return request(`?${q}`) || [];
    },
    async put(row) {
      const q = new URLSearchParams({ on_conflict: 'requester_id,target_id' });
      await request(`?${q}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
    },
    async remove(a, b) {
      const q = new URLSearchParams({ requester_id: `eq.${a}`, target_id: `eq.${b}` });
      await request(`?${q}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    },
  };
}
