# World server deploy

Authoritative WebSocket server for `?mmo=1`. Protocol: `PROTOCOL.md`.

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
| `SUPABASE_SERVICE_ROLE_KEY` | no | Persistence only, when PR #60's `server/persistence` is present. **Never commit.** |

Without the Supabase vars the server accepts **guest names**.

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

New service from this repo. Start command: `npm run start:server`. Port: use Railway's `PORT`. Add the env vars above as secrets.

## Render

Web service, Docker or native Node. Start: `npm run start:server`. Health check: `/health`. Set `PORT` to Render's port. Add env vars as secrets.

## Client URL

The title screen **Play Online — World 1** button reloads with `?mmo=1`. Pages stays offline until a world URL is configured (`MG_WORLD_URL` / `VITE_MMO_URL` at build time, or `?server=`). With no URL the button reads **World 1 coming soon** and stays disabled.

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
