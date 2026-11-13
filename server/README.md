# World 1 server

Authoritative WebSocket server for Monster Gate's shared world. Protocol: [PROTOCOL.md](./PROTOCOL.md).

Accounts are required to go online. Guests stay offline and solo. Character rows come from `server/persistence/` ([PR #60](https://github.com/machine10101-vibes/monster-gate/pull/60)); this package does not modify that folder.

## Start

From the repo root (so `ws` resolves from the root `node_modules`):

```bash
npm install
npm run start:server
# or: node server/index.js
```

Listens on `PORT` (default **8080**). `GET /healthz` returns `{ ok, protocol, players, tickHz }`.

Local client:

```
http://localhost:5173/?mmo=1&world=ws://localhost:8080
```

Without Supabase env vars, persistence is in-memory so tests can run without secrets. Auth still requires a token. For a local smoke test:

```bash
ALLOW_DEV_TOKENS=1 npm run start:server
# token form: dev:<auth-user-uuid> or dev:<auth-user-uuid>:Name
```

Or run `npm run smoke` from this folder (uses mocked auth, two scripted clients).

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | no (8080) | Listen port |
| `SUPABASE_URL` | for live auth / saves | Project URL |
| `SUPABASE_JWT_SECRET` | one of the verifiers | HS256 access-token check |
| `SUPABASE_ANON_KEY` | one of the verifiers | `GET /auth/v1/user` (JWKS is tried when the URL is set) |
| `SUPABASE_SERVICE_ROLE_KEY` | for live saves | Persistence only. **Never commit.** |
| `ALLOWED_ORIGINS` | no | Comma-separated browser origins. Empty allows all (local dev). |
| `ALLOW_DEV_TOKENS` | no | `1` accepts `dev:<uuid>` tokens. Do not set in production. |
| `ZONE_CAP` | no (150) | Max hunters in one place name (Oakhollow, Hellspire, …). Further joins get `error` `zone_full`. `0` disables the cap. |

Apply the characters migration once Brandon merges PR #60:

```bash
supabase db push
# or: psql "$DATABASE_URL" -f supabase/migrations/20261113150000_characters.sql
```

The world server should use the service role key only on the host. Never put it in the browser build.

## Tests

```bash
# from repo root
npm test
npm run test:server
npm run test:persistence
npm run build

# from this folder (after a root npm install)
npm test
npm run smoke
```

## Docker

The image is built from the **repo root** (needs root `package-lock.json` for `ws`, plus `server/persistence` for saves):

```bash
docker build -t monster-gate-world -f server/Dockerfile .
docker run --rm -p 8080:8080 -e PORT=8080 monster-gate-world
```

A copy of this Dockerfile also lives at the repo root.

## Fly.io

`fly.toml` at the repo root is a starting point. Change `app` to the name Brandon picks.

```bash
fly launch --no-deploy
fly secrets set SUPABASE_URL=... SUPABASE_JWT_SECRET=... SUPABASE_SERVICE_ROLE_KEY=...
fly secrets set ALLOWED_ORIGINS=https://machine10101-vibes.github.io
fly deploy
```

Health check: `/healthz`. Start: `node server/index.js` (image `CMD`). After deploy, post the `wss://` URL so the client can use `?mmo=1&world=wss://…`.

## Railway

New service from this repo. Start command: `npm run start:server`. Use Railway's `PORT`. Add the env vars above as secrets. Health check `/healthz`.

## Render

`render.yaml` at the repo root is a **free** native Node web service: `npm ci`, start `npm run start:server`, health check `/healthz`. Set `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as dashboard secrets (`sync: false`). `ALLOWED_ORIGINS` is `https://machine10101-vibes.github.io` so the GitHub Pages client can read `/healthz` (CORS). Do not set `ALLOW_DEV_TOKENS`.

The free plan sleeps when nobody is connected and takes about 30 seconds to wake. `src/net/mmo.js` probes `/healthz` first and calls `worldView.setStatus('waking', { secondsLeft, elapsedMs })` (countdown from 30) until the process answers, then `connecting` and `online`.

## Client URL

Pages stays offline unless the flag is set:

```
https://machine10101-vibes.github.io/monster-gate/?mmo=1&world=wss://YOUR_HOST
```

Optional build-time default: `VITE_WORLD_URL=wss://YOUR_HOST`. Leave unset for the public GitHub Pages build. `?mmo=1&mock=1` is the local crowd only (no socket).
