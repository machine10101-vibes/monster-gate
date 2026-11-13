import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { verifyKleverSignature } from "../hunter/verify.ts";
import {
  ADDRESS_RE,
  BAD_PROOF_MESSAGE,
  EXPIRED_MESSAGE,
  LINKED_ALREADY_MESSAGE,
  NONCE_MS,
  REPLAY_MESSAGE,
  TAKEN_MESSAGE,
  UNLINKED_CODE,
  UNLINKED_MESSAGE,
  UUID_RE,
  hexNonce,
  proofMessageOk,
} from "../_shared/linkAuth.js";

const MAX_BODY = 8_192;
const STUB_PROGRESS = { savedAt: 0 };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

type Admin = {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

async function accountUser(accessToken: unknown): Promise<{ id: string; email: string } | Response> {
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 8192) {
    return json({ error: "Sign in with email first.", code: "rejected" }, 401);
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return json({ error: "The account service could not be reached." }, 503);
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { authorization: `Bearer ${accessToken}`, apikey: key },
  });
  if (!res.ok) return json({ error: "Sign in with email first.", code: "rejected" }, 401);
  const user = await res.json().catch(() => null) as { id?: string; email?: string } | null;
  const id = typeof user?.id === "string" ? user.id : "";
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!UUID_RE.test(id) || email.length < 3) {
    return json({ error: "Sign in with email first.", code: "rejected" }, 401);
  }
  return { id, email };
}

function consumeCode(data: unknown): string {
  const row = data && typeof data === "object" ? data as { ok?: boolean; code?: string } : null;
  if (row?.ok) return "";
  return row?.code === "replay" ? "replay" : "nonce";
}

async function consumeNonce(
  admin: Admin,
  nonce: string,
  purpose: string,
  address: string,
  userId: string | null,
): Promise<Response | null> {
  const { data, error } = await admin.rpc("take_klever_nonce", {
    p_nonce: nonce,
    p_purpose: purpose,
    p_address: address,
    p_user_id: userId,
  });
  if (error) return json({ error: "The account service could not be reached." }, 503);
  const code = consumeCode(data);
  if (!code) return null;
  if (code === "replay") return json({ error: REPLAY_MESSAGE, code: "replay" }, 401);
  return json({ error: EXPIRED_MESSAGE, code: "nonce" }, 401);
}

function checkProof(
  purpose: "login" | "link",
  address: string,
  message: string,
  signature: string,
): { nonce: string } | Response {
  if (!ADDRESS_RE.test(address) || !proofMessageOk(message, { purpose, address }) || !verifyKleverSignature(message, signature, address)) {
    return json({ error: BAD_PROOF_MESSAGE, code: "bad-signature" }, 401);
  }
  const lines = message.split("\n");
  const nonce = lines[3].slice("Nonce: ".length);
  return { nonce };
}

async function issueNonce(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const purpose = body.purpose === "link" ? "link" : body.purpose === "login" ? "login" : "";
  const address = typeof body.address === "string" ? body.address : "";
  if (!purpose) return json({ error: "The request was not understood." }, 400);
  if (!ADDRESS_RE.test(address)) return json({ error: "Choose a Klever account, then try again." }, 400);
  let userId: string | null = null;
  if (purpose === "link") {
    const user = await accountUser(body.accessToken);
    if (user instanceof Response) return user;
    userId = user.id;
  }
  await admin.from("klever_nonces").delete().lt("expires_at", new Date().toISOString());
  const nonce = hexNonce(crypto.getRandomValues(new Uint8Array(16)));
  const expiresAt = new Date(Date.now() + NONCE_MS).toISOString();
  const { error } = await admin.from("klever_nonces").insert({
    nonce,
    purpose,
    address,
    user_id: userId,
    expires_at: expiresAt,
  });
  if (error) return json({ error: "The account service could not be reached." }, 503);
  return json({ nonce, expiresAt, created: false });
}

async function linkedRow(admin: Admin, address: string): Promise<{ user_id: string; email: string } | null | Response> {
  const { data, error } = await admin
    .from("hunter_accounts")
    .select("user_id, email")
    .eq("klever_address", address)
    .maybeSingle();
  if (error) return json({ error: "The account service could not be reached." }, 503);
  const row = data as { user_id?: string; email?: string } | null;
  if (!row?.user_id) return null;
  return { user_id: row.user_id, email: row.email || "" };
}

async function mintSession(email: string): Promise<Record<string, unknown> | Response> {
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || service;
  if (!url || !service) return json({ error: "The account service could not be reached." }, 503);
  const linkRes = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: service,
      authorization: `Bearer ${service}`,
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const linkJson = await linkRes.json().catch(() => ({})) as {
    hashed_token?: string;
    properties?: { hashed_token?: string };
  };
  const hashed = linkJson.hashed_token || linkJson.properties?.hashed_token || "";
  if (!linkRes.ok || !hashed) return json({ error: "The account service could not be reached." }, 503);
  const verifyRes = await fetch(`${url}/auth/v1/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: anon || "",
    },
    body: JSON.stringify({ type: "magiclink", token_hash: hashed }),
  });
  const session = await verifyRes.json().catch(() => ({}));
  if (!verifyRes.ok || !session?.access_token) {
    return json({ error: "The account service could not be reached." }, 503);
  }
  return session;
}

async function login(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const address = typeof body.address === "string" ? body.address : "";
  const message = typeof body.message === "string" ? body.message : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  const proof = checkProof("login", address, message, signature);
  if (proof instanceof Response) return proof;
  const consumed = await consumeNonce(admin, proof.nonce, "login", address, null);
  if (consumed) return consumed;
  const linked = await linkedRow(admin, address);
  if (linked instanceof Response) return linked;
  if (!linked) return json({ error: UNLINKED_MESSAGE, code: UNLINKED_CODE, created: false }, 401);
  const session = await mintSession(linked.email);
  if (session instanceof Response) return session;
  return json({ created: false, userId: linked.user_id, email: linked.email, session });
}

async function status(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const user = await accountUser(body.accessToken);
  if (user instanceof Response) return user;
  const { data, error } = await admin
    .from("hunter_accounts")
    .select("klever_address")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return json({ error: "The account service could not be reached." }, 503);
  const address = (data as { klever_address?: string } | null)?.klever_address || "";
  return json({ address, email: user.email, created: false });
}

async function link(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const user = await accountUser(body.accessToken);
  if (user instanceof Response) return user;
  const address = typeof body.address === "string" ? body.address : "";
  const message = typeof body.message === "string" ? body.message : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  const proof = checkProof("link", address, message, signature);
  if (proof instanceof Response) return proof;
  const consumed = await consumeNonce(admin, proof.nonce, "link", address, user.id);
  if (consumed) return consumed;
  const taken = await linkedRow(admin, address);
  if (taken instanceof Response) return taken;
  if (taken && taken.user_id !== user.id) return json({ error: TAKEN_MESSAGE, code: "taken" }, 409);
  const { data: existing, error: readError } = await admin
    .from("hunter_accounts")
    .select("klever_address, email")
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError) return json({ error: "The account service could not be reached." }, 503);
  const current = (existing as { klever_address?: string; email?: string } | null)?.klever_address || "";
  if (current && current !== address) return json({ error: LINKED_ALREADY_MESSAGE, code: "linked" }, 409);
  if (!existing) {
    const { error } = await admin.from("hunter_accounts").insert({
      user_id: user.id,
      email: user.email,
      progress: STUB_PROGRESS,
      klever_address: address,
    });
    if (error?.code === "23505" || /duplicate|unique/i.test(error?.message || "")) {
      return json({ error: TAKEN_MESSAGE, code: "taken" }, 409);
    }
    if (error) return json({ error: "The account service could not be reached." }, 503);
    return json({ address, created: false });
  }
  if (current === address) return json({ address, created: false });
  const { error } = await admin
    .from("hunter_accounts")
    .update({ klever_address: address, email: user.email })
    .eq("user_id", user.id);
  if (error?.code === "23505" || /duplicate|unique/i.test(error?.message || "")) {
    return json({ error: TAKEN_MESSAGE, code: "taken" }, 409);
  }
  if (error) return json({ error: "The account service could not be reached." }, 503);
  return json({ address, created: false });
}

async function unlink(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const user = await accountUser(body.accessToken);
  if (user instanceof Response) return user;
  const { error } = await admin
    .from("hunter_accounts")
    .update({ klever_address: null })
    .eq("user_id", user.id);
  if (error) return json({ error: "The account service could not be reached." }, 503);
  return json({ address: "", created: false });
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
    if (body.op === "nonce") return issueNonce(admin, body);
    if (body.op === "login") return login(admin, body);
    if (body.op === "link") return link(admin, body);
    if (body.op === "unlink") return unlink(admin, body);
    if (body.op === "status") return status(admin, body);
    return json({ error: "The request was not understood." }, 400);
  }),
};
