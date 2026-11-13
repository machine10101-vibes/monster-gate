import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { mergeAccountProgress } from "./huntMerge.js";
import {
  RETIRED_HUNTER_ERROR,
  RETIRED_HUNTER_STATUS,
  isRetiredHunterOp,
} from "../_shared/retiredHunter.js";

const MAX_BODY = 300_000;
const MAX_PROGRESS = 262144;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

type Admin = {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

function sanitizeProgress(value: unknown, now: number): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const progress: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  let savedAt = Number(progress.savedAt);
  if (!Number.isFinite(savedAt)) savedAt = now;
  if (savedAt > now + 5 * 60 * 1000) savedAt = now;
  if (savedAt < 0) savedAt = 0;
  progress.savedAt = Math.floor(savedAt);
  if (JSON.stringify(progress).length > MAX_PROGRESS) return null;
  return progress;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function accountUser(accessToken: unknown): Promise<{ id: string; email: string } | Response> {
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 8192) {
    return json({ error: "Sign in again." }, 401);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return json({ error: "The guild record could not be opened." }, 503);
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { authorization: `Bearer ${accessToken}`, apikey: key },
  });
  if (!res.ok) return json({ error: "Sign in again." }, 401);
  const user = await res.json().catch(() => null) as { id?: string; email?: string } | null;
  const id = typeof user?.id === "string" ? user.id : "";
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!UUID_RE.test(id) || email.length < 3) return json({ error: "Sign in again." }, 401);
  return { id, email };
}

async function accountLoad(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const user = await accountUser(body.accessToken);
  if (user instanceof Response) return user;
  const { data, error } = await admin
    .from("hunter_accounts")
    .select("progress, revision")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return json({ error: "The guild record could not be opened." }, 503);
  const row = data as { progress?: Record<string, unknown>; revision?: number | string } | null;
  if (!row?.progress) return json({ progress: null, revision: 0, savedAt: 0 });
  return json({
    progress: row.progress,
    revision: Number(row.revision) || 0,
    savedAt: Number(row.progress.savedAt) || 0,
  });
}

async function accountSave(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const user = await accountUser(body.accessToken);
  if (user instanceof Response) return user;
  const progress = sanitizeProgress(body.progress, Date.now());
  if (!progress) return json({ error: "That hunt cannot be stored." }, 400);
  const { data: existing, error: readError } = await admin
    .from("hunter_accounts")
    .select("progress")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return json({ error: "The guild record could not be saved." }, 503);
  const stored = (existing as { progress?: Record<string, unknown> } | null)?.progress ?? null;
  const merged = mergeAccountProgress(stored, progress) as Record<string, unknown> | null;
  if (!merged) return json({ error: "That hunt cannot be stored." }, 400);
  const { data, error } = await admin.rpc("save_account_hunt", {
    p_user_id: user.id,
    p_email: user.email,
    p_progress: merged,
  });
  if (error || !data || typeof data !== "object") return json({ error: "The guild record could not be saved." }, 503);
  const result = data as { ok?: boolean; revision?: number | string; savedAt?: number | string; progress?: unknown };
  const savedAt = Number(result.savedAt) || Number(merged.savedAt) || 0;
  const revision = Number(result.revision) || 0;
  if (!result.ok) {
    return json({
      error: "A newer hunt is already saved to this account.",
      progress: result.progress ?? stored ?? null,
      revision,
      savedAt,
    }, 409);
  }
  return json({ revision, savedAt, progress: merged });
}

function retiredHunter(): Response {
  return json({ error: RETIRED_HUNTER_ERROR, gone: true }, RETIRED_HUNTER_STATUS);
}

export default {
  fetch: withSupabase({
    auth: ["publishable"],
    cors: {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    },
  }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "Send a POST." }, 405);
    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      if (text.length > MAX_BODY) return json({ error: "That hunt is too large to store." }, 413);
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json({ error: "The request was not understood." }, 400);
      body = parsed as Record<string, unknown>;
    } catch {
      return json({ error: "The request was not understood." }, 400);
    }
    if (isRetiredHunterOp(body.op)) return retiredHunter();
    const admin = ctx.supabaseAdmin as unknown as Admin;
    if (body.op === "account-load") return accountLoad(admin, body);
    if (body.op === "account-save") return accountSave(admin, body);
    return json({ error: "The request was not understood." }, 400);
  }),
};
