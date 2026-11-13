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

Pages stays offline unless the flag is set:

```
https://machine10101-vibes.github.io/monster-gate/?mmo=1&server=wss://YOUR_HOST
```

Local:

```
http://localhost:5173/?mmo=1&server=ws://localhost:8080
```

Optional build-time default: `VITE_MMO_URL=wss://YOUR_HOST`. Leave unset for the public GitHub Pages build. `?mmo=1&mock=1` is the local crowd only (no socket).
