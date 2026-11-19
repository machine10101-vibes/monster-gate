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

Web service, native Node. Start: `npm run start:server`. Health check: `/healthz`. Set `PORT` to Render's port and add the Supabase auth/persistence variables as secrets. The current production service is `monster-gate-world-1`.

## Client URL

The title screen **Play Online — World 1** button reloads with `?mmo=1`. The production Pages build injects `wss://monster-gate-world-1.onrender.com` through `MG_WORLD_URL` and `VITE_WORLD_URL`; local builds can use `?world=` or `?server=`.

Manual flags still work:

```
https://monstergate.online/?mmo=1&server=wss://YOUR_HOST
```

The old GitHub Pages URL `https://machine10101-vibes.github.io/monster-gate/` redirects to the custom domain after DNS is attached.

Local:

```
http://localhost:5173/?mmo=1&server=ws://localhost:8080
```

GitHub Pages publishing is automated by `.github/workflows/publish-pages.yml` on pushes to `main`. It builds with the production Render URL, preserves the `CNAME` and `.nojekyll` files, and publishes `dist` to `gh-pages`. Do not publish a build with an empty `MG_WORLD_URL`.

The Render Free plan sleeps when idle. The client first makes a 3-second health check; if the server is asleep, it shows a 60-second waking queue and keeps a follow-up `/healthz` request open for up to 65 seconds. It continues retrying, with a Retry control after 75 seconds, rather than giving up when the countdown reaches zero. See [the protocol wake sequence](../server/PROTOCOL.md).

`?mmo=1&mock=1` is the local crowd only (no socket).
