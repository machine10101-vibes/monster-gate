import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const MAX_BODY = 4096;
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

async function guildMaster(admin: Admin, accessToken: unknown): Promise<{ id: string; email: string } | Response> {
  const user = await accountUser(accessToken);
  if (user instanceof Response) return user;
  const { data, error } = await admin.from("admins").select("email").eq("email", user.email).maybeSingle();
  if (error) return json({ error: "The ledger could not be opened." }, 503);
  if (!data) return json({ error: "This gate is for the guild master." }, 403);
  return user;
}

async function overview(admin: Admin): Promise<Response> {
  const accounts = await admin.rpc("admin_account_facts");
  const wallets = await admin.rpc("admin_wallet_facts");
  if (accounts.error || wallets.error) return json({ error: "The ledger could not be opened." }, 503);
  return json({
    accounts: Array.isArray(accounts.data) ? accounts.data : [],
    wallets: Array.isArray(wallets.data) ? wallets.data : [],
  });
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
    if (body.op !== "overview") return json({ error: "The request was not understood." }, 400);
    const admin = ctx.supabaseAdmin as unknown as Admin;
    const user = await guildMaster(admin, body.accessToken);
    if (user instanceof Response) return user;
    return overview(admin);
  }),
};
