import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  ACCOUNT_SESSION_TAKEN_STATUS,
  decideSession,
  readAccountSession,
  takenBody,
  writeAccountSession,
} from "../_shared/accountSession.js";

const MAX_BODY = 4096;
const ADMIN_EMAIL = "monstergateonline@gmail.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

type Admin = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

type Staff = { id: string; email: string; role: "master" | "moderator" };

async function accountUser(accessToken: unknown): Promise<{ id: string; email: string } | Response> {
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 8192) {
    return json({ error: "Sign in again." }, 401);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return json({ error: "The ledger could not be opened." }, 503);
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

function staffRole(email: string, role: unknown): "master" | "moderator" {
  if (email === ADMIN_EMAIL) return "master";
  return String(role || "").trim().toLowerCase() === "moderator" ? "moderator" : "master";
}

async function guildStaff(admin: Admin, accessToken: unknown): Promise<Staff | Response> {
  const user = await accountUser(accessToken);
  if (user instanceof Response) return user;
  const { data, error } = await admin.from("admins").select("email, role").eq("email", user.email).maybeSingle();
  if (error) return json({ error: "The ledger could not be opened." }, 503);
  if (!data) return json({ error: "This gate is for the guild master." }, 403);
  return { id: user.id, email: user.email, role: staffRole(user.email, data.role) };
}

async function seatStaff(admin: Admin, body: Record<string, unknown>): Promise<(Staff & { sessionId: string }) | Response> {
  const user = await guildStaff(admin, body.accessToken);
  if (user instanceof Response) return user;
  const row = await readAccountSession(admin, user.id);
  if (row.error) return json({ error: "The ledger could not be opened." }, 503);
  const decided = decideSession(row.sessionId, body.sessionId);
  if (decided.taken) return json(takenBody(), ACCOUNT_SESSION_TAKEN_STATUS);
  const sessionId = decided.sessionId || crypto.randomUUID();
  if (decided.adopt) {
    const error = await writeAccountSession(admin, user.id, sessionId);
    if (error) return json({ error: "The ledger could not be opened." }, 503);
  }
  return { ...user, sessionId };
}

async function guildMaster(admin: Admin, accessToken: unknown): Promise<Staff | Response> {
  const user = await guildStaff(admin, accessToken);
  if (user instanceof Response) return user;
  if (user.role !== "master") return json({ error: "Only the guild master can change staff." }, 403);
  return user;
}

const PASS_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makePassCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const raw = Array.from(bytes, (value) => PASS_ALPHABET[value & 31]).join("");
  return `MG-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}`;
}
async function passCodeHash(code: string): Promise<string> {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function passCodeList(admin: Admin): Promise<Response> {
  const { data, error } = await admin.from("membership_pass_codes")
    .select("id, code_hint, created_at, redeemed_at, redeemed_by")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return json({ error: "Free pass codes could not be loaded." }, 503);
  return json({ codes: Array.isArray(data) ? data : [] });
}
async function issuePassCode(admin: Admin, issuerId: string): Promise<Response> {
  const code = makePassCode();
  const hash = await passCodeHash(code);
  const { data, error } = await admin.from("membership_pass_codes")
    .insert({ code_hash: hash, code_hint: code.slice(-4), issued_by: issuerId })
    .select("id, code_hint, created_at").single();
  if (error || !data) return json({ error: "A free pass code could not be issued. Please try again." }, 503);
  return json({ code, pass: data });
}

function hunterId(raw: unknown): string {
  const value = String(raw || "").trim();
  const id = value.startsWith("acct:") ? value.slice(5) : value;
  return UUID_RE.test(id) ? id : "";
}

async function overview(admin: Admin, role: "master" | "moderator", sessionId = ""): Promise<Response> {
  const accounts = await admin.rpc("admin_account_facts");
  const wallets = await admin.rpc("admin_wallet_facts");
  const staff = await admin.from("admins").select("email, role");
  if (accounts.error || wallets.error || staff.error) return json({ error: "The ledger could not be opened." }, 503);
  return json({
    accounts: Array.isArray(accounts.data) ? accounts.data : [],
    wallets: Array.isArray(wallets.data) ? wallets.data : [],
    staff: Array.isArray(staff.data) ? staff.data : [],
    role,
    sessionId,
  });
}

async function changeStaff(admin: Admin, userId: string, role: "moderator" | ""): Promise<Response> {
  const { data: hunt, error } = await admin.from("hunter_accounts").select("user_id, email").eq("user_id", userId).maybeSingle();
  if (error) return json({ error: "The ledger could not be opened." }, 503);
  if (!hunt) return json({ error: "That hunter is not on the record." }, 404);
  const email = String(hunt.email || "").trim().toLowerCase();
  if (!email || email === ADMIN_EMAIL) return json({ error: "The guild master cannot be changed here." }, 400);
  const { data: existing, error: readError } = await admin.from("admins").select("email, role").eq("email", email).maybeSingle();
  if (readError) return json({ error: "The ledger could not be opened." }, 503);
  if (existing && staffRole(email, existing.role) === "master") {
    return json({ error: "The guild master cannot be changed here." }, 400);
  }
  if (role === "moderator") {
    const { error: writeError } = await admin.from("admins").upsert({ email, role: "moderator" }, { onConflict: "email" });
    if (writeError) return json({ error: "The staff list could not be saved." }, 503);
  } else {
    const { error: writeError } = await admin.from("admins").delete().eq("email", email).eq("role", "moderator");
    if (writeError) return json({ error: "The staff list could not be saved." }, 503);
  }
  return overview(admin, "master");
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
      if (text.length > MAX_BODY) return json({ error: "The request was not understood." }, 413);
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return json({ error: "The request was not understood." }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return json({ error: "The request was not understood." }, 400);
    }
    const admin = ctx.supabaseAdmin as unknown as Admin;
    if (body.op === "overview") {
      const user = await seatStaff(admin, body);
      if (user instanceof Response) return user;
      if (user.role !== "master") return json({ error: "This gate is for the guild master." }, 403);
      return overview(admin, user.role, user.sessionId);
    }
    if (body.op === "passcodes_list" || body.op === "passcode_issue") {
      const user = await seatStaff(admin, body);
      if (user instanceof Response) return user;
      if (user.role !== "master") return json({ error: "Only the guild master can issue free passes." }, 403);
      return body.op === "passcodes_list"
        ? passCodeList(admin)
        : issuePassCode(admin, user.id);
    }
    if (body.op === "promote" || body.op === "demote") {
      const user = await seatStaff(admin, body);
      if (user instanceof Response) return user;
      if (user.role !== "master") return json({ error: "Only the guild master can change staff." }, 403);
      const userId = hunterId(body.userId);
      if (!userId) return json({ error: "That hunter is not on the record." }, 400);
      return changeStaff(admin, userId, body.op === "promote" ? "moderator" : "");
    }
    return json({ error: "The request was not understood." }, 400);
  }),
};
