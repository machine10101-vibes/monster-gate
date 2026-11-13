# Monster Gate World 1 protocol

JSON WebSocket messages for the authoritative World 1 server (`server/`) and the client (`src/net/mmo.js`, `src/net/worldProtocol.js`).

| | |
| --- | --- |
| **Version** | `1` |
| **Field** | every envelope has `"v": 1` and `"type"` |
| **Transport** | UTF-8 JSON text frames, max 8 KiB |
| **Tick** | area-of-interest `delta`: **15 Hz** near (≤ 32 units), **~4 Hz** in the outer ring (32–96 units) |
| **AOI** | same realm (over / cave) and within **96** world units. Pose broadcasts never go past this radius. |
| **Deltas** | only changed, quantized fields (`x,z` to 0.1). Clients must merge patches onto the last known player. |
| **Zone cap** | `ZONE_CAP` (default **150**) hunters per place name. Further joins get `error` `zone_full`. `0` means no cap. |
| **Auth** | required. A verified Supabase access token on `hello`. Guests are rejected and stay offline / solo. |
| **Appearance** | `armor`, `held` (from saved `weapon`), and `look` are taken from the character row. Client values are ignored. `debug` / `unlock` flags are rejected (`error` `debug`). |

Mismatching `v` is an `error` with code `protocol`. Unknown `type` is ignored.

The live GitHub Pages client only opens a socket when the page is loaded with `?mmo=1` (and not `?mock=1`). The world URL comes from `?world=wss://…` or the `VITE_WORLD_URL` build env (`?server=` / `VITE_MMO_URL` still work as aliases). Waygate / trystero is a separate path.

## Client status (mmo.js)

`src/net/mmo.js` talks to the view through `setStatus(status, info)`. Reconnects use the same path. If the view does not handle a status yet (including `waking`), the client must not throw.

Because the Render free plan sleeps when nobody is connected (about 30 seconds to wake), the client checks `/healthz` on the **https** (or http) form of the world URL before opening the WebSocket:

1. Probe `GET {https-world}/healthz` every **2–3 seconds** (3 second abort per try).
2. While the probe fails or times out, call:

```js
worldView.setStatus('waking', { secondsLeft, elapsedMs })
```

- `secondsLeft` is an integer, counting down from **30**, updated about once a second. If it reaches 0 and the server is still asleep, keep probing and keep `secondsLeft` at **0**.
- `elapsedMs` is milliseconds since this wake attempt started (0 at the first failed probe, then increasing). The view counts down locally if updates pause, switches to “Almost there” after 30s elapsed, and shows **Retry** after 60s.

3. Do not switch to an error status at 60s — stay on `waking` with `secondsLeft: 0` and a growing `elapsedMs`, and keep probing so a late wake still connects.
4. If the view has `onRetry(cb)`, the client registers it (once) and starts a fresh wake check when it fires (`secondsLeft` back to 30, `elapsedMs` back to 0).
5. As soon as `/healthz` returns ok, call `setStatus('connecting')` (or `reconnecting` on a later attempt) and then open the socket. After `welcome`, call `setStatus('online', { online })`. `'online'` is what closes the wake screen.

A `name_taken` error (duplicate hunter name) is fatal. The client calls `setStatus('error', { code: 'name_taken', message })` and does not reconnect.

`GET /healthz` sends CORS headers so the live client origins can read the response: `https://monstergate.online`, `http://monstergate.online` (until HTTPS is enforced), `https://www.monstergate.online`, and `https://machine10101-vibes.github.io` (the old Pages URL, which 301s to the custom domain). The WebSocket origin check uses the same list (`ALLOWED_ORIGINS`).

## Auth

The first client message must be `hello` within 5 seconds, with `token` set to the hunter's Supabase access token.

The server verifies it with, in order: `SUPABASE_JWT_SECRET` (HS256), JWKS at `SUPABASE_URL/auth/v1/.well-known/jwks.json`, or `GET /auth/v1/user` with `SUPABASE_ANON_KEY`. A missing or invalid token is `error` `auth` and the socket is closed.

Guests never get a welcome. The client should call `setStatus('offline')` and toast *"Sign in to hunt online. Guests stay solo."*

Local smoke tests may set `ALLOW_DEV_TOKENS=1` and use `dev:<user-uuid>` or `dev:<user-uuid>:Name`. Do not enable this in production.

`userId` is an `auth.users` UUID. One hunter per account for now (the `characters` row is keyed on `user_id`; a slot can be added later without changing this handshake).

## Reconnect / session resume

`welcome` includes `resumeToken`. On a dropped socket the client reconnects with backoff and sends the same token on `hello` as `resume` (or `resumeToken`). If the token is still valid (60 s after disconnect, same account) the server restores the hunter id and last pose and sets `resumed: true`. A second connection for the same account kicks the older socket.

## Player

Used on `snapshot`, `delta.upsert`, and as the body of `move`:

```json
{
  "id": "u_<uuid>",
  "name": "Hunter",
  "x": 72.0, "y": 3.2, "z": 72.5,
  "yaw": 0.0,
  "move": 0.0,
  "anim": 0,
  "held": "blade",
  "sheath": null,
  "look": { "skin": 1, "hair": 1, "style": 0, "tunic": 0, "beard": false },
  "armor": { "helm": "iron", "chest": "iron" },
  "zone": "Oakhollow",
  "hp": 20
}
```

`anim`: `0` idle, `1` attack, `2` roll, `3` dead, `4` stagger, `5` use (names also accepted). `name` is at most 16 characters. `zone` is a map place name (Oakhollow, Hellspire, cave, …) at most 32 characters. The server never includes the local hunter in `players` / `upsert`.

## Entities (server-owned)

`snapshot.entities` and `delta.entities` carry nearby monsters and gathering nodes. The presentation layer in `worldView.js` does not render them yet.

### Monster

```json
{
  "id": "demonknight_0",
  "type": "demonknight",
  "name": "Demon Knight",
  "x": -80.5, "y": 3.6, "z": -499.5, "yaw": 0,
  "hp": 320, "maxHp": 320, "level": 11, "dmg": 5,
  "zone": "Hellspire", "alive": true
}
```

Balance (from `src/entities/monsters.js`): Darksycle Dragon level 7, 155 HP, 5 dmg (cave nest at 820, 810); Demon Knights level 11, 320 HP, 5 dmg (Hellspire posts); Holy Knights level 11, 300 HP, 5 dmg (Dawnspire posts); Keep Warden level 12, 420 HP, 7 dmg at the Endless Field.

**TODO:** combat resolution (hits, death, loot, aggro AI). This version syncs spawn positions and HP only. A monster at 0 HP respawns at its home point after its timer.

### Gathering node

```json
{
  "id": "ore_copper_0",
  "kind": "mine",
  "type": "copper",
  "x": 96.3, "y": 1, "z": 62.7,
  "zone": "Oakhollow",
  "ready": true,
  "respawnAt": 0
}
```

`kind` is `mine`, `chop`, `net`, or `rod`. Shared ready / respawn is authoritative. **TODO:** credit the yield on the character (`saveCharacter` already stores `goods`).

## Client → server

### hello (auth)

First message. The server closes the socket if it does not arrive within 5 seconds.

```json
{ "v": 1, "type": "hello", "token": "<supabase access_token>", "resume": "<resumeToken, optional>", "name": "Hunter", "look": {}, "armor": {}, "zone": "Oakhollow" }
```

`look` is applied only when the server **creates** a new character. On a later join, `look`, `armor`, and `held` (from the saved `weapon` field) come from the loaded row. Client-sent `armor` / `held` / `look` are ignored. A `debug` or `unlock` flag on any frame is rejected (`error` `debug`) and the socket is closed if the hunter has not yet been welcomed.

### move

About 10 Hz from the client (the view fires `onLocalMove` at ~10 Hz). Faster bursts are dropped (`error` `rate`). Speed above 16 u/s is clamped. A jump further than 40 units in one update is rejected (`error` `teleport`) and the last pose is kept.

```json
{ "v": 1, "type": "move", "x": 74.1, "y": 3.2, "z": 70.4, "yaw": 1.2, "anim": 0, "move": 0.8, "held": "blade", "sheath": "blade", "look": {}, "armor": {}, "zone": "Oakhollow" }
```

Client-sent `armor`, `held`, and `look` on `move` are ignored or clamped to the saved character. Only the server's values are broadcast to other hunters.

### chat

`channel` is `world` (everyone) or `zone` (same `zone` string). Text is trimmed to 120 characters.

```json
{ "v": 1, "type": "chat", "channel": "world", "text": "Forge is hot." }
{ "v": 1, "type": "chat", "channel": "zone", "text": "At the well." }
```

Rate: 2/s, 6 per 10 s. Excess is dropped with `error` `rate`.

### gather

Attempt to deplete a shared node. Inventory credit is not applied yet (TODO).

```json
{ "v": 1, "type": "gather", "id": "ore_copper_0" }
```

### leave

```json
{ "v": 1, "type": "leave" }
```

The server also treats a socket close the same way and flushes the character immediately.

### ping

```json
{ "v": 1, "type": "ping", "t": 1731500000000 }
```

A hunter with no frames for 30 s is disconnected.

## Server → client

### welcome

```json
{ "v": 1, "type": "welcome", "protocol": 1, "tickHz": 15, "aoi": 96, "aoiNear": 32, "farHz": 4, "zoneCap": 150, "resumeToken": "…", "resumed": false, "you": { "id": "u_…", "name": "Hunter", "guest": false } }
```

### snapshot

Full nearby set (players, monsters, nodes) in AOI. Ids omitted are gone.

```json
{
  "v": 1, "type": "snapshot",
  "players": [ { "id": "u_…", "name": "Bram", "x": 70, "y": 3, "z": 74 } ],
  "entities": { "monsters": [], "nodes": [] },
  "online": 12, "zone": "Oakhollow"
}
```

### delta

AOI patch. Nearby hunters (≤ 32 units) are considered at 15 Hz; the outer ring (32–96) at about 4 Hz. Unchanged hunters are skipped. After the first full sighting, `upsert` entries are **sparse**: `id` plus only the fields that changed, with `x,y,z` quantized to 0.1 and `yaw`/`move` to 0.05. Empty `upsert` / `remove` / `online` keys are omitted. Clients must merge each patch onto the last known player (the flag-gated `mmo.js` already does this before it calls `worldView`).

```json
{
  "v": 1, "type": "delta",
  "upsert": [ { "id": "u_…", "x": 71.2, "z": 74.1 } ],
  "remove": ["u_gone"],
  "entities": { "monsters": { "upsert": [], "remove": [] }, "nodes": { "upsert": [], "remove": [] } },
  "online": 12
}
```

### chat

```json
{ "v": 1, "type": "chat", "id": "c_1", "channel": "world", "from": { "id": "u_…", "name": "Bram" }, "text": "Forge is hot.", "at": 1731500000000, "zone": "Oakhollow" }
```

### leave

```json
{ "v": 1, "type": "leave", "id": "u_…" }
```

### pong

```json
{ "v": 1, "type": "pong", "t": 1731500000000 }
```

### error

```json
{ "v": 1, "type": "error", "code": "rate", "message": "Slow down." }
```

| code | when |
| --- | --- |
| `protocol` | bad JSON, wrong `v`, missing `hello` |
| `debug` | a `debug` or `unlock` flag was sent. The socket is closed if this arrives before welcome. |
| `auth` | missing / invalid token; guests are rejected |
| `persist` | character load / create failed |
| `name_taken` | the hunter name is already used by another account. Message: "That hunter name is already taken." The socket is closed. |
| `rate` | move or chat too fast |
| `teleport` | move jumped further than 40 units |
| `chat` | empty / invalid channel |
| `gather` | unknown node, not ready, or too far |
| `zone_full` | the place already has `ZONE_CAP` hunters (default 150). The socket is closed on hello; a move into a full zone is rejected and the last pose is kept. |

## Limits

| | |
| --- | --- |
| Tick | 15 Hz near (≤ 32 units); ~4 Hz in the 32–96 ring |
| AOI | 96 world units, same realm; pose broadcasts do not leave this radius |
| Zone cap | `ZONE_CAP` default 150 per place name; `0` disables the cap |
| Move | 12 messages / s; 16 u/s clamp; 40 u teleport reject |
| Chat | 2 / s, 6 / 10 s, 120 characters |
| Heartbeat | ping/pong; idle 30 s |
| Resume | 60 s after disconnect |
| Save | debounced during play; immediate on disconnect; `flushAll` on SIGTERM |
| World | `x,z` clamped to about `-800…1490` |

## Health

`GET /healthz` (also `/health` and `/`) returns `{ ok, protocol, players, tickHz, aoi, aoiNear, farHz, zoneCap }`.
