# World 1 authoritative server protocol

The server-side World 1 protocol is maintained in [server/PROTOCOL.md](server/PROTOCOL.md).

# Monster Gate world protocol

JSON WebSocket messages for the shared-world server (`server/`) and client (`src/net/mmo.js`).

| | |
| --- | --- |
| **Version** | `1` |
| **Field** | every envelope has `"v": 1` and `"type"` |
| **Transport** | UTF-8 JSON text frames, max 8 KiB |
| **Tick** | server sends zone-scoped `delta` at 10 Hz |
| **Auth** | optional Supabase JWT on `hello`; otherwise a guest name |

Mismatching `v` is an `error` with code `protocol`. Unknown `type` is ignored or `error`.

The live GitHub Pages client only opens a socket when the page is loaded with `?mmo=1` (and not `?mock=1`). Waygate / trystero is a separate path.

## Player

Used on `snapshot`, `delta.upsert`, and as the body of `move`:

```json
{
  "id": "u_… or g_…",
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
  "hp": 20, "max_hp": 20
}
```

`anim`: `0` idle, `1` attack, `2` roll, `3` dead, `4` stagger, `5` use (names also accepted). `name` is at most 16 characters. `zone` is at most 32. The server never includes the local hunter in `players` / `upsert`.

## Client → server

### hello (auth)

First message. The server closes the socket if it does not arrive within 5 seconds.

```json
{ "v": 1, "type": "hello", "token": "<supabase access_token, optional>", "name": "Hunter", "look": {}, "armor": {} }
```

When `SUPABASE_URL` is set with `SUPABASE_ANON_KEY` (or JWKS at `/auth/v1/.well-known/jwks.json`), a valid `token` becomes that user's hunter. Anything else, including a missing token, is a **guest**.

### move

About 10 Hz while hunting. Faster bursts are dropped (`error` `rate`). Speed above 16 u/s is clamped. A jump further than 40 units in one update is rejected (`error` `teleport`) and the last pose is kept.

```json
{ "v": 1, "type": "move", "x": 74.1, "y": 3.2, "z": 70.4, "yaw": 1.2, "anim": 0, "move": 0.8, "held": "blade", "sheath": "blade", "look": {}, "armor": {}, "hp": 18, "max_hp": 20, "zone": "Oakhollow" }
```

### chat

`channel` is `world` (everyone), `zone` (same `zone` string), or `party` (current party only). Text is trimmed to 120 characters. `hp` and `max_hp` are self-reported presentation fields for party frames only; they are not authoritative combat state.

```json
{ "v": 1, "type": "chat", "channel": "world", "text": "Forge is hot." }
{ "v": 1, "type": "chat", "channel": "zone", "text": "At the well." }\n{ "v": 1, "type": "chat", "channel": "party", "text": "Ready to enter?" }
```

Rate: 2/s, 6 per 10 s. Excess is dropped with `error` `rate`.

### leave

Client is leaving. The server also treats a socket close the same way.

```json
{ "v": 1, "type": "leave" }
```

### ping

```json
{ "v": 1, "type": "ping", "t": 1731500000000 }
```

A hunter with no frames for 30 s is disconnected.

## Server → client

### welcome

```json
{ "v": 1, "type": "welcome", "protocol": 1, "tickHz": 10, "you": { "id": "u_…", "name": "Hunter", "guest": false, "user_id": "uuid" }, "features": ["friends", "party", "whisper", "block"] }\n\nGuests receive `party` only. `friends` and `block` are advertised only when account-keyed social persistence is configured; signed-in hunters also receive `whisper`.
```

### snapshot

Full nearby set for the hunter's current zone (everyone else in that zone). Ids omitted are gone.

```json
{ "v": 1, "type": "snapshot", "players": [ { "id": "u_…", "name": "Bram", "x": 70, "y": 3, "z": 74 } ], "online": 12, "zone": "Oakhollow" }
```

### delta

Zone-scoped patch, ~10 Hz, only for hunters in the same `zone`. `remove` is ids that left the zone or disconnected.

```json
{ "v": 1, "type": "delta", "upsert": [ { "id": "u_…", "x": 71.2, "z": 74.1 } ], "remove": [], "online": 12 }
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
| `auth` | token explicitly rejected (still falls back to guest unless `hello` is malformed) |
| `rate` | move or chat too fast |
| `teleport` | move jumped further than the speed clamp allows |
| `chat` | empty / invalid channel |

## Limits

| | |
| --- | --- |
| Move | 12 messages / s; 16 u/s clamp; 40 u teleport reject |
| Chat | 2 / s, 6 / 10 s, 120 characters |
| Heartbeat | ping/pong; idle 30 s |
| World | `x,z` clamped to about `-50…1490` (10×10 tiles of 144) |

## Social messages (World 1)

All social actions are handled by the World 1 server. Social actions are rate-limited to 4/s with a 20-action burst. Guests may join parties, but friend management and block/ignore require a signed-in account.

### Friends and presence

Client messages: `friend_request {name}`, `friend_accept {user_id}`, `friend_decline {user_id}`, `friend_cancel {user_id}`, `friend_remove {user_id}`, `friend_list`, `block {user_id}`, `unblock {user_id}`, `ignore {user_id}`, and `unignore {user_id}`.

Server messages: `friend_list {friends,pending_in,pending_out,blocked,ignored}`, `friend_request {from}`, and `friend_presence {user_id,id,name,presence,zone}`. Accepted friendships are stored as two directional rows keyed by Supabase auth user UUID. Blocks suppress chat and social contact in both directions; ignores suppress invitations and whispers but do not hide ordinary world chat.

The migration is `supabase/migrations/20261118000000_friendships.sql`. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key to the browser.

### Parties

Client messages: `party_invite {id|name}`, `party_accept {invite_id}`, `party_decline {invite_id}`, `party_leave`, `party_kick {id}`, `party_promote {id}`, and `party_loot {loot}`.

Server messages: `party_invite {invite_id,from,expires_at}` and `party_state {party}`. Parties contain at most four members; invitations expire after 60 seconds and require acceptance. The oldest remaining member becomes leader if the leader leaves. Loot mode is `round_robin` or `need_greed`. The current server stores and broadcasts the selected mode; actual drop assignment and need/greed roll resolution remain pending a server-authoritative loot-drop pipeline.

### Private messages

Client sends `whisper {to,text}`; the server echoes a `chat` frame with `channel: "whisper"` only to sender and recipient. Whisper text is limited to 120 characters and uses the chat rate limit. A `/w Hunter message` command never falls back to public chat when whispers are unavailable.

