import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import {
  handleStaffOp,
  parseAdminEmails,
} from "../_shared/staff.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

type Admin = {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

async function accountUser(accessToken: unknown): Promise<{ id: string; email: string } | Response> {
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 8192) {
    return json({ error: "Sign in again." }, 401);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return json({ error: "The account service could not be reached." }, 503);
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

function staffDb(admin: Admin, env: { url: string; key: string }) {
  return {
    async getRole(userId: string) {
      const { data, error } = await admin
        .from("account_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error("The staff list could not be opened.");
      const role = (data as { role?: string } | null)?.role;
      return role === "admin" || role === "moderator" ? role : null;
    },
    async upsertRole(row: { userId: string; email: string; role: string; grantedBy: string }) {
      const { error } = await admin.from("account_roles").upsert({
        user_id: row.userId,
        email: row.email,
        role: row.role,
        granted_by: row.grantedBy,
      }, { onConflict: "user_id" });
      if (error) throw new Error("The staff list could not be saved.");
    },
    async removeRole(userId: string) {
      const { error } = await admin.from("account_roles").delete().eq("user_id", userId);
      if (error) throw new Error("The staff list could not be saved.");
    },
    async listMods() {
      const { data, error } = await admin
        .from("account_roles")
        .select("user_id, email, role, created_at")
        .eq("role", "moderator")
        .order("email");
      if (error) throw new Error("The staff list could not be opened.");
      return ((data as { user_id: string; email: string; role: string; created_at: string }[] | null) || []).map((row) => ({
        userId: row.user_id,
        email: row.email,
        role: row.role,
        createdAt: row.created_at,
      }));
    },
    async findUserByEmail(email: string) {
      const { data, error } = await admin.rpc("auth_user_by_email", { p_email: email });
      if (error) throw new Error("The account could not be looked up.");
      const row = Array.isArray(data) ? data[0] : data;
      const id = row && typeof row === "object" ? (row as { id?: string }).id : "";
      const foundEmail = row && typeof row === "object" ? (row as { email?: string }).email : "";
      if (!id || !UUID_RE.test(id)) return null;
      return { id, email: String(foundEmail || email).toLowerCase() };
    },
    async createAuthUser(email: string, password: string) {
      const res = await fetch(`${env.url}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: env.key,
          authorization: `Bearer ${env.key}`,
        },
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      if (res.ok) {
        const json = await res.json().catch(() => ({})) as { id?: string; user?: { id?: string } };
        const id = json.id || json.user?.id || "";
        if (!UUID_RE.test(id)) return { error: "The account could not be created.", status: 503 };
        return { id, email };
      }
      const err = await res.json().catch(() => ({})) as { msg?: string; message?: string; error_code?: string };
      const msg = `${err.msg || ""} ${err.message || ""} ${err.error_code || ""}`.toLowerCase();
      if (res.status === 422 || msg.includes("already") || msg.includes("exists")) {
        return { error: "That email already has an account. Make it a moderator instead.", status: 409 };
      }
      return { error: "The account could not be created.", status: 503 };
    },
  };
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
      const parsed = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return json({ error: "The request was not understood." }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return json({ error: "The request was not understood." }, 400);
    }
    const user = await accountUser(body.accessToken);
    if (user instanceof Response) return user;
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !key) return json({ error: "The account service could not be reached." }, 503);
    const admin = ctx.supabaseAdmin as unknown as Admin;
    try {
      const result = await handleStaffOp({
        op: String(body.op || ""),
        actor: user,
        body,
        db: staffDb(admin, { url, key }),
        adminEmails: parseAdminEmails(Deno.env.get("MG_ADMIN_EMAILS") || ""),
      });
      const status = typeof result.status === "number" ? result.status : 200;
      const payload = { ...result };
      delete (payload as { status?: number }).status;
      return json(payload, status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The staff list could not be opened.";
      return json({ error: message }, 503);
    }
  }),
};
