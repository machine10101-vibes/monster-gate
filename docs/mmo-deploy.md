# World server deploy

Authoritative WebSocket server for `?mmo=1`. Protocol: `PROTOCOL.md`. Friends and block/ignore data use the account-keyed `public.friendships` table; party membership and chat delivery are handled by the live server.

## Start

```bash
npm install
npm run start:server
```

Listens on `PORT` (default **8080**). `GET /health` returns `{ ok, protocol, players }`.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | no (8080) | Listen port |
| `SUPABASE_URL` | no | JWT verification (`/auth/v1/user` or JWKS) |
| `SUPABASE_ANON_KEY` | no | With URL, verify access tokens |
| `SUPABASE_SECRET_KEY` | no | Server-only Supabase Data API access for friends, blocks, ignores and character persistence. **Never commit.** |
| `SUPABASE_SERVICE_ROLE_KEY` | legacy fallback | Same server-only permissions while migrating existing deployments. **Never commit.** |

Without `SUPABASE_URL` + `SUPABASE_ANON_KEY`, the server accepts **guest names**. Without a server-only `SUPABASE_SECRET_KEY` (or legacy service-role key), signed-in players can still use parties and chat, but persistent friends, blocks and ignores are not advertised.

## Docker

```bash
docker build -t monster-gate-world .
docker run --rm -p 8080:8080 -e PORT=8080 monster-gate-world
```

## Fly.io

```bash
fly launch --no-deploy
# set PORT=8080 in fly.toml [[services]]
fly secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=...
# optional, after persistence lands:
# fly secrets set SUPABASE_SERVICE_ROLE_KEY=...
fly deploy
```

Start command: `node server/index.js` (the image `CMD`).

## Railway

New service from this repo. Start command: `npm run start:server`. Port: use Railway's `PORT`. Add the env vars above as secrets, including `SUPABASE_SECRET_KEY` for persistent social features.

## Render

Web service, Docker or native Node. Start: `npm run start:server`. Health check: `/health`. Set `PORT` to Render's port. Add env vars as secrets.

## Client URL

After sign-in, **Choose a world** → **World 1 — Online** reloads with `?mmo=1`. Pages stays offline until a world URL is configured (`MG_WORLD_URL` / `VITE_MMO_URL` at build time, or `?server=`). With no URL World 1 reads **World 1 coming soon** and stays disabled. Guests never open the socket.

Manual flags still work:

```
https://monstergate.online/?mmo=1&server=wss://YOUR_HOST
```

The old GitHub Pages URL `https://machine10101-vibes.github.io/monster-gate/` redirects to the custom domain after DNS is attached.

Local:

```
http://localhost:5173/?mmo=1&server=ws://localhost:8080
```

Rebuild `gh-pages` from `main` with Vite base `/`, `public/CNAME` = `monstergate.online`, `VITE_BUILD_ID` = the `main` HEAD, and `MG_WORLD_URL` as the world URL (empty for now):

```bash
MAIN_SHA=$(git rev-parse --short main)
MG_WORLD_URL= VITE_BUILD_ID=$MAIN_SHA npx vite build --base /
```

When World 1 is live, set `MG_WORLD_URL=wss://YOUR_HOST` on that build. `?mmo=1&mock=1` is the local crowd only (no socket).
