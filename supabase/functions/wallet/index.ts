import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { verifyKleverSignature } from "../hunter/verify.ts";
import {
  ADDRESS_RE,
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
  // Keep the rejection reason specific enough to diagnose the wallet integration,
  // without ever logging or returning the signature, nonce, or full address.
  if (!ADDRESS_RE.test(address)) {
    console.warn("[wallet] proof rejected", { stage: "address", purpose });
    return json({ error: "The selected Klever address was not accepted. Reconnect the wallet and try again.", code: "proof-address" }, 401);
  }
  if (!proofMessageOk(message, { purpose, address })) {
    console.warn("[wallet] proof rejected", { stage: "message", purpose });
    return json({ error: "The sign-in request did not match the selected wallet or has expired. Please try again.", code: "proof-message" }, 401);
  }
  if (!verifyKleverSignature(message, signature, address)) {
    console.warn("[wallet] proof rejected", {
      stage: "signature",
      purpose,
      signatureLength: signature.length,
      signatureEncoding: /^[0-9a-fA-F]+$/.test(signature.replace(/^0x/i, "")) ? "hex" : "non-hex",
    });
    return json({ error: "The signature did not verify for the selected Klever address. Reconnect the intended account and try again.", code: "proof-signature" }, 401);
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


const HANDOFF_MS = 5 * 60 * 1000;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function handoffStart(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const id = typeof body.id === "string" ? body.id : "";
  const pollToken = typeof body.pollToken === "string" ? body.pollToken : "";
  if (!UUID_RE.test(id) || !/^[0-9a-f]{64}$/.test(pollToken)) {
    return json({ error: "The sign-in handoff could not be started." }, 400);
  }
  const expiresAt = new Date(Date.now() + HANDOFF_MS).toISOString();
  await admin.from("klever_handoffs").delete().lt("expires_at", new Date().toISOString());
  const { error } = await admin.from("klever_handoffs").insert({
    id,
    poll_token_hash: await sha256Hex(pollToken),
    expires_at: expiresAt,
  });
  if (error) return json({ error: "The account service could not be reached." }, 503);
  return json({ id, expiresAt });
}

async function handoffNonce(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const id = typeof body.id === "string" ? body.id : "";
  const address = typeof body.address === "string" ? body.address : "";
  if (!UUID_RE.test(id) || !ADDRESS_RE.test(address)) return json({ error: "Choose a Klever account, then try again." }, 400);
  const { data: handoff, error: readError } = await admin.from("klever_handoffs")
    .select("id, nonce, address, status, expires_at")
    .eq("id", id).eq("status", "pending").gt("expires_at", new Date().toISOString()).maybeSingle();
  if (readError) return json({ error: "The account service could not be reached." }, 503);
  if (!handoff) return json({ error: "This sign-in request expired. Return to your original browser and try again.", code: "handoff-expired" }, 410);
  if (handoff.nonce) {
    if (handoff.address !== address) return json({ error: "The selected wallet does not match this sign-in request.", code: "handoff-wallet" }, 409);
    return json({ nonce: handoff.nonce, expiresAt: handoff.expires_at });
  }
  const nonce = hexNonce(crypto.getRandomValues(new Uint8Array(16)));
  const expiresAt = new Date(Date.now() + NONCE_MS).toISOString();
  const { error: nonceError } = await admin.from("klever_nonces").insert({
    nonce, purpose: "login", address, user_id: null, expires_at: expiresAt,
  });
  if (nonceError) return json({ error: "The account service could not be reached." }, 503);
  const { data: updated, error } = await admin.from("klever_handoffs")
    .update({ nonce, address }).eq("id", id).eq("status", "pending").is("nonce", null)
    .select("id").maybeSingle();
  if (error) return json({ error: "The account service could not be reached." }, 503);
  if (!updated) return json({ error: "This sign-in request is already being used. Return to your original browser and try again.", code: "handoff-used" }, 409);
  return json({ nonce, expiresAt });
}

async function handoffComplete(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const id = typeof body.id === "string" ? body.id : "";
  const address = typeof body.address === "string" ? body.address : "";
  const message = typeof body.message === "string" ? body.message : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  if (!UUID_RE.test(id)) return json({ error: "The sign-in request was not understood." }, 400);
  const proof = checkProof("login", address, message, signature);
  if (proof instanceof Response) return proof;
  const { data: handoff, error: readError } = await admin.from("klever_handoffs")
    .select("id, nonce, address, status, expires_at")
    .eq("id", id).eq("status", "pending").eq("nonce", proof.nonce)
    .eq("address", address).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (readError) return json({ error: "The account service could not be reached." }, 503);
  if (!handoff) return json({ error: "This sign-in request expired or was already used.", code: "handoff-expired" }, 410);
  const consumed = await consumeNonce(admin, proof.nonce, "login", address, null);
  if (consumed) return consumed;
  const linked = await linkedRow(admin, address);
  if (linked instanceof Response) return linked;
  if (!linked) return json({ error: UNLINKED_MESSAGE, code: UNLINKED_CODE, created: false }, 401);
  const session = await mintSession(linked.email);
  if (session instanceof Response) return session;
  const { data: saved, error } = await admin.from("klever_handoffs")
    .update({ status: "complete", session, completed_at: new Date().toISOString() })
    .eq("id", id).eq("status", "pending").select("id").maybeSingle();
  if (error) return json({ error: "The account service could not be reached." }, 503);
  if (!saved) return json({ error: "This sign-in request was already completed.", code: "handoff-used" }, 409);
  return json({ completed: true, message: "Sign-in complete. Return to your original browser." });
}

async function handoffPoll(admin: Admin, body: Record<string, unknown>): Promise<Response> {
  const id = typeof body.id === "string" ? body.id : "";
  const pollToken = typeof body.pollToken === "string" ? body.pollToken : "";
  if (!UUID_RE.test(id) || !/^[0-9a-f]{64}$/.test(pollToken)) return json({ error: "The sign-in request was not understood." }, 400);
  const hash = await sha256Hex(pollToken);
  const now = new Date().toISOString();
  const { data: complete, error } = await admin.from("klever_handoffs")
    .update({ status: "consumed", session: null })
    .eq("id", id).eq("poll_token_hash", hash).eq("status", "complete")
    .gt("expires_at", now).select("id, session").maybeSingle();
  if (error) return json({ error: "The account service could not be reached." }, 503);
  if (complete?.session) return json({ complete: true, session: complete.session });
  const { data: row, error: pollError } = await admin.from("klever_handoffs")
    .select("status, expires_at").eq("id", id).eq("poll_token_hash", hash).maybeSingle();
  if (pollError) return json({ error: "The account service could not be reached." }, 503);
  if (!row || row.status === "consumed" || new Date(row.expires_at).getTime() <= Date.now()) {
    return json({ error: "This sign-in request expired. Return to the game and try again.", code: "handoff-expired" }, 410);
  }
  return json({ complete: false });
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
    if (body.op === "handoff_start") return handoffStart(admin, body);
    if (body.op === "handoff_nonce") return handoffNonce(admin, body);
    if (body.op === "handoff_complete") return handoffComplete(admin, body);
    if (body.op === "handoff_poll") return handoffPoll(admin, body);
    if (body.op === "login") return login(admin, body);
    if (body.op === "link") return link(admin, body);
    if (body.op === "unlink") return unlink(admin, body);
    if (body.op === "status") return status(admin, body);
    return json({ error: "The request was not understood." }, 400);
  }),
};
