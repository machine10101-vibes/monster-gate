# World server deploy

Authoritative WebSocket server for `?mmo=1`. Full setup, env vars, and Render/Fly notes: [server/README.md](../server/README.md). Protocol: [server/PROTOCOL.md](../server/PROTOCOL.md).

## Client URL

The live game is at `https://monstergate.online`. Pages stays offline unless the flag is set:

```
https://monstergate.online/?mmo=1&world=wss://YOUR_HOST
```

The old GitHub Pages URL `https://machine10101-vibes.github.io/monster-gate/` redirects (301) to the custom domain.

`ALLOWED_ORIGINS` on the world server should include `https://monstergate.online`, `http://monstergate.online` (until HTTPS is enforced), `https://www.monstergate.online`, and `https://machine10101-vibes.github.io`. Those origins are accepted for the WebSocket handshake and `/healthz` CORS.

Local:

```
http://localhost:5173/?mmo=1&world=ws://localhost:8080
```

Optional build-time default: `VITE_WORLD_URL=wss://YOUR_HOST` (alias `VITE_MMO_URL`). Leave unset for the public build. `?mmo=1&mock=1` is the local crowd only (no socket).
