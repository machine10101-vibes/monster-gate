import { createClient } from '@supabase/supabase-js';
import { alreadyImported, conflict, invalid, nameTaken, notFound, PersistenceError } from '../errors.js';
import { requireUserId } from '../ids.js';
import { requireName } from '../names.js';
import { blankState, characterView, columnsFromState, sanitizeState } from '../schema.js';

const ACCEPT_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i;
const LOCAL_URL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function createSupabaseAdapter({ url, serviceRoleKey } = {}) {
  const supabaseUrl = String(url || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = String(serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !(ACCEPT_URL.test(supabaseUrl) || LOCAL_URL.test(supabaseUrl))) {
    throw invalid('SUPABASE_URL is missing or not a Supabase project URL.');
  }
  if (!key) throw invalid('SUPABASE_SERVICE_ROLE_KEY is required for character persistence.');

  const db = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return {
    kind: 'supabase',

    async load(userId) {
      const id = requireUserId(userId);
      const { data, error } = await db.from('characters').select('*').eq('user_id', id).maybeSingle();
      if (error) throw wrap(error);
      return data ? characterView(data) : null;
    },

    async create(userId, name, extra = {}) {
      const id = requireUserId(userId);
      const clean = requireName(name);
      const state = sanitizeState({ ...blankState(clean, extra.look), ...extra.state, name: clean });
      const cols = columnsFromState(state);
      const { data, error } = await db
        .from('characters')
        .insert({
          user_id: id,
          name: cols.name,
          zone: cols.zone,
          x: cols.x,
          y: cols.y,
          z: cols.z,
          gold: cols.gold,
          last_seen: cols.last_seen,
          imported_at: cols.imported_at,
          version: 1,
          state,
        })
        .select('*')
        .single();
      if (error) throw wrap(error, { name: clean, userId: id });
      return characterView(data);
    },

    async save(userId, state, { expectedVersion, importedAt } = {}) {
      const id = requireUserId(userId);
      const current = await this.load(id);
      if (!current) throw notFound(id);
      if (expectedVersion != null && current.version !== expectedVersion) throw conflict(current);

      const nextState = sanitizeState({ ...current.state, ...state, name: state.name || current.name });
      if (importedAt) nextState.importedAt = Date.parse(importedAt) || Date.now();
      const cols = columnsFromState(nextState);
      const patch = {
        name: cols.name,
        zone: cols.zone,
        x: cols.x,
        y: cols.y,
        z: cols.z,
        gold: cols.gold,
        last_seen: cols.last_seen || new Date().toISOString(),
        imported_at: cols.imported_at || (current.importedAt ? new Date(current.importedAt).toISOString() : null),
        version: current.version + 1,
        state: nextState,
        updated_at: new Date().toISOString(),
      };
      if (importedAt) patch.imported_at = importedAt;

      let query = db.from('characters').update(patch).eq('user_id', id);
      if (expectedVersion != null) query = query.eq('version', expectedVersion);
      const { data, error } = await query.select('*').maybeSingle();
      if (error) throw wrap(error, { name: cols.name, userId: id });
      if (!data) {
        const latest = await this.load(id);
        if (!latest) throw notFound(id);
        throw conflict(latest);
      }
      return characterView(data);
    },

    async markImported(userId, at = new Date().toISOString()) {
      const id = requireUserId(userId);
      const current = await this.load(id);
      if (!current) throw notFound(id);
      if (current.importedAt) throw alreadyImported(current);
      const state = { ...current.state, importedAt: Date.parse(at) || Date.now() };
      const { data, error } = await db
        .from('characters')
        .update({ imported_at: at, state, updated_at: new Date().toISOString() })
        .eq('user_id', id)
        .is('imported_at', null)
        .select('*')
        .maybeSingle();
      if (error) throw wrap(error);
      if (!data) throw alreadyImported(await this.load(id));
      return characterView(data);
    },
  };
}

function wrap(error, extra = {}) {
  const code = error?.code;
  const message = error?.message || 'Supabase request failed.';
  if (code === '23505') {
    if (/characters_name/i.test(message) || /name/i.test(error?.details || '')) {
      return nameTaken(extra.name);
    }
    if (/characters_pkey|user_id/i.test(message)) {
      return invalid('This account already has a character.', extra);
    }
  }
  if (code === '23503') return invalid('userId is not a known auth user.', extra);
  return new PersistenceError('unavailable', message, { cause: error, ...extra });
}
