import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
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
  }, async (req) => {
    if (req.method !== "POST") return json({ error: "Send a POST." }, 405);
    let body: { email?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "The request was not understood." }, 400);
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return json({ error: "Enter the email address for this account." }, 400);
    }
    if (password.length < 8 || password.length > 72) {
      return json({ error: "Use a password of at least 8 characters." }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "The account service could not be reached." }, 503);
    const res = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: key,
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (res.ok) return json({ ok: true });
    const err = await res.json().catch(() => ({})) as { msg?: string; message?: string; error_code?: string };
    const msg = `${err.msg || ""} ${err.message || ""} ${err.error_code || ""}`.toLowerCase();
    if (res.status === 422 || msg.includes("already") || msg.includes("exists")) {
      return json({ error: "That email already has an account. Sign in instead." }, 409);
    }
    return json({ error: "The account could not be created." }, 503);
  }),
};
