# Social protocol (proposal)

Client-owned spec for friends, presence, parties, shared XP, and loot. **MG Servers** should copy the message types into `PROTOCOL.md` and the send/receive methods into `src/net/mmo.js`. **MG Developer #2** owns the Supabase friends table (do not apply that migration from this PR).

The live GitHub Pages client never opens a world socket unless `?mmo=1` is set. Social UI:

| Flag | Backend |
| --- | --- |
| _(none)_ | Offline. Friends and party panels say **Online only**. |
| `?mmo=1` | Live adapter. Feature-detects methods and inbound frames on the existing `MmoClient`. Missing methods are a no-op; the UI does not throw. |
| `?mmo=1&mocksocial=1` | In-process mock: fake friends, presence, incoming invites. No extra socket. Combine with `?mock=1` for a crowd. |

This document does **not** replace `PROTOCOL.md`. Envelope, auth, move, and world/zone chat stay as they are (`v: 1`). New `type` values below are ignored by today's server (or returned as `error`) until MG Servers lands them.

Live site: [https://monstergate.online/](https://monstergate.online/).

```
https://monstergate.online/?mmo=1&mocksocial=1
https://monstergate.online/?mmo=1&mock=1&mocksocial=1
```

## Identity

Every social row is keyed by the **account** `user_id` (Supabase `auth.users.id`), never by a Klever wallet address and never by a guest socket id.

| Field | Who | Notes |
| --- | --- | --- |
| `user_id` | account | UUID. Friends list, blocks, ignore. |
| `id` | world session | `u_…` when authed, `g_…` when guest. Used in `party_state` and nameplates. |
| `name` | hunter | At most 16 characters, unique among online hunters. |

Guests may join a party in the current world session. Guests **cannot** send or accept friend requests (`error` `auth`). Party state is in-memory on the world server; it is not a save file.

## Limits

| | |
| --- | --- |
| Party size | **4** including the leader |
| Party invite TTL | **60 seconds** |
| Friends cap | **100** accepted friends per `user_id` |
| Block / ignore cap | **100** each (cheap; same table, different `status`) |
| Name lookup | case-insensitive, trimmed, 16 chars |
| Social actions | 4 / s, 20 per 10 s (`error` `rate`) |

Waygate rifts already scale 1–4 hunters (`src/data/rift.js`). A formed party should be the size the rift uses when both are present. Waygate P2P (`src/net/session.js` / trystero) stays a separate path.

## Welcome feature flags

Extend `welcome` so the client can feature-detect without calling missing methods:

```json
{
  "v": 1,
  "type": "welcome",
  "protocol": 1,
  "tickHz": 10,
  "you": { "id": "u_ab12", "name": "Hunter", "guest": false, "user_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" },
  "features": ["friends", "party", "whisper", "block"]
}
```

Omit `features` (today's server) → client keeps friends/party chrome but does not send social types. First inbound `friend_list` / `party_state` / `friend_presence` also enables the matching cap.

Suggested `MmoClient` methods (same names the client adapter already probes):

```
friendRequest, friendAccept, friendDecline, friendRemove, friendList
blockPlayer, unblockPlayer, ignorePlayer, unignorePlayer
partyInvite, partyAccept, partyDecline, partyLeave, partyKick, partyPromote
sendWhisper
```

Each may be `send(type, extra)` plus an `onFrame` branch. The Pages client wraps the live `MmoClient` instance; it does not edit `src/net/mmo.js`.

---

## Friends

Presence is `online` | `offline` plus a `zone` string (empty when offline). Zone is the same 32-character world zone used on `move`.

### Client → server

#### friend_request

Lookup is by hunter **name**, resolved server-side to `user_id`.

```json
{ "v": 1, "type": "friend_request", "name": "Bram" }
{ "v": 1, "type": "friend_request", "user_id": "uuid" }
```

#### friend_accept / friend_decline / friend_remove

```json
{ "v": 1, "type": "friend_accept", "user_id": "uuid" }
{ "v": 1, "type": "friend_decline", "user_id": "uuid" }
{ "v": 1, "type": "friend_remove", "user_id": "uuid" }
```

#### friend_list

Ask for a snapshot. Server also pushes on welcome and on change.

```json
{ "v": 1, "type": "friend_list" }
```

#### block / ignore

Block: they cannot friend, invite, or whisper you; you do not see their chat. Ignore: drop whispers and invites, still see them in the world.

```json
{ "v": 1, "type": "block", "user_id": "uuid" }
{ "v": 1, "type": "unblock", "user_id": "uuid" }
{ "v": 1, "type": "ignore", "user_id": "uuid" }
{ "v": 1, "type": "unignore", "user_id": "uuid" }
```

### Server → client

#### friend_list

```json
{
  "v": 1,
  "type": "friend_list",
  "friends": [
    { "user_id": "uuid", "id": "u_…", "name": "Bram", "presence": "online", "zone": "Oakhollow" }
  ],
  "pending_in": [
    { "user_id": "uuid", "name": "Rowan" }
  ],
  "pending_out": [
    { "user_id": "uuid", "name": "Mira" }
  ],
  "blocked": [{ "user_id": "uuid", "name": "Pik" }],
  "ignored": []
}
```

Online friends first is a client sort. Server may send any order.

#### friend_presence

```json
{ "v": 1, "type": "friend_presence", "user_id": "uuid", "id": "u_…", "name": "Bram", "presence": "online", "zone": "Greyrock Pit" }
```

```json
{ "v": 1, "type": "friend_presence", "user_id": "uuid", "presence": "offline", "zone": "" }
```

#### friend_request (incoming)

```json
{ "v": 1, "type": "friend_request", "from": { "user_id": "uuid", "name": "Rowan" } }
```

---

## Party

Leader invites. Target must be **online**. Invites expire after 60 s (`error` `expired` if answered late). A hunter may have one pending incoming party invite; a new one from the same leader replaces the old one.

The inviter is leader. Party disbands when fewer than two members remain. If the leader leaves or disconnects, the oldest remaining member is promoted.

### Client → server

```json
{ "v": 1, "type": "party_invite", "id": "u_…" }
{ "v": 1, "type": "party_invite", "name": "Nessa" }
{ "v": 1, "type": "party_accept", "invite_id": "pinv_…" }
{ "v": 1, "type": "party_decline", "invite_id": "pinv_…" }
{ "v": 1, "type": "party_leave" }
{ "v": 1, "type": "party_kick", "id": "u_…" }
{ "v": 1, "type": "party_promote", "id": "u_…" }
```

Kick and promote: leader only (`error` `not_leader`). Cannot kick self; leave instead.

### Server → client

#### party_invite (incoming)

```json
{
  "v": 1,
  "type": "party_invite",
  "invite_id": "pinv_1",
  "from": { "id": "u_…", "name": "Nessa" },
  "expires_at": 1731500060000
}
```

#### party_state

Pushed on every membership / HP / zone change. `hp` is current, `max_hp` is the member's max. Empty `party: null` means you are not in a party.

```json
{
  "v": 1,
  "type": "party_state",
  "party": {
    "id": "pty_…",
    "leader": "u_nessa",
    "loot": "round_robin",
    "loot_turn": 0,
    "members": [
      { "id": "u_nessa", "user_id": "uuid", "name": "Nessa", "hp": 18, "max_hp": 20, "zone": "Whispering Wood", "online": true },
      { "id": "u_you", "user_id": "uuid", "name": "Hunter", "hp": 20, "max_hp": 20, "zone": "Oakhollow", "online": true }
    ]
  }
}
```

`loot` is `round_robin` (default) or `need_greed`.

---

## Whisper

If chat grows a whisper channel, send:

```json
{ "v": 1, "type": "whisper", "to": "u_…", "text": "Meet at the well." }
```

or reuse chat:

```json
{ "v": 1, "type": "chat", "channel": "whisper", "to": "u_…", "text": "Meet at the well." }
```

Text is trimmed to 120 characters, same rate as chat. Server echoes to both sides:

```json
{ "v": 1, "type": "chat", "id": "c_9", "channel": "whisper", "from": { "id": "u_…", "name": "Bram" }, "to": { "id": "u_you", "name": "Hunter" }, "text": "Meet at the well.", "at": 1731500000000 }
```

The Pages client only offers Whisper in the context menu when `features` includes `whisper` or the mock backend is on. `/w Name text` in the chat box is the same call.

---

## Shared XP

Combat XP (and any future hunt XP that is not a personal gather action) is **split** with a small group bonus so a four-hunter clear stays busy, not a farm.

```
n              = clamp(party size in the same zone, 1, 4)
bonus          = 0.08 × (n − 1)
total          = floor(soloXp × (1 + bonus))
share          = floor(total / n)
remainder      = total − share × n   → added to the killer
```

| Party | Bonus | Total from 100 solo | Each (no remainder) |
| --- | --- | --- | --- |
| 1 | 0% | 100 | 100 |
| 2 | 8% | 108 | 54 |
| 3 | 16% | 116 | 38 (+ remainder 2 to killer) |
| 4 | 24% | 124 | 31 |

Per hunter, XP **falls** as the party grows. The 8% step only softens the split so grouping is not a pure loss. Members more than one zone away, offline, or dead do not count in `n` for that kill.

Gold from the same kill is split as integers with **no group bonus** (the party does not mint gold). Remainder goes to the killer. Gathering, smithing, cooking, and firemaking XP stay personal.

Client helper: `splitXp(soloXp, n)` / `splitGold(amount, n)` in `src/social/rewards.js`. The world server must apply the same integers; the client uses them for mock combat and for the HUD.

---

## Shared loot

Default: **round-robin** over party members who were in the zone for the kill, in join order. `loot_turn` on `party_state` is the next index.

- One item drop → member `members[loot_turn]`, then `loot_turn = (loot_turn + 1) % n`.
- Gold is split (above), not round-robin.
- Need/greed (`loot: "need_greed"`): each member sends `{ "v": 1, "type": "loot_roll", "drop_id": "d_…", "choice": "need" | "greed" | "pass" }`. Highest **need** roll (1–100) wins; else highest greed; all pass → fall back to round-robin. Ties: lower join index.

Rare/unique drops never duplicate to the whole party. Rift chest goods already scale with party size in `src/data/rift.js`; once a real party exists, apply round-robin (or need/greed) **per item** in that chest instead of giving every hunter every stack.

```json
{ "v": 1, "type": "loot_roll", "drop_id": "d_1", "choice": "need" }
{ "v": 1, "type": "loot_result", "drop_id": "d_1", "item": "budge_scale", "winner": "u_…", "pool": "need" }
```

---

## Error codes

Existing world codes (`protocol`, `auth`, `rate`, `teleport`, `chat`) stay. Social uses:

| code | when |
| --- | --- |
| `auth` | Guest tried friends, block, or ignore. Token missing/expired. |
| `rate` | Social action too fast |
| `not_found` | Name or id is not a hunter |
| `self` | Friend or invite targeting yourself |
| `already` | Already friends, already in this party, already blocked |
| `pending` | A request or invite is already waiting |
| `full` | Friends cap 100, or party already has 4 |
| `blocked` | You blocked them, or they blocked you |
| `ignored` | They ignore you (invites/whispers dropped) |
| `expired` | Party invite older than 60 s |
| `offline` | Party invite to someone who is not online |
| `not_leader` | Kick / promote / loot-mode from a member |
| `not_in_party` | Leave / kick / promote with no party |
| `in_party` | Target is already in another party |
| `name` | Empty or invalid hunter name (UI: No hunter by that name) |
| `persist` | Friends or party write failed (UI: Couldn't save, try again) |
| `whisper` | Whisper failed (offline, blocked, or feature off) |
| `busy` | Target has a pending invite from another leader |

```json
{ "v": 1, "type": "error", "code": "full", "message": "Party is full (4)." }
```

The client maps `code` to a journal toast. Unknown codes show `message` or `code`.

---

## Suggested Supabase table (MG Developer #2)

Keyed by account `user_id`. Never store a wallet address. Party is **not** persisted here.

Do not land this migration from the client PR. PR #60 already owns `public.characters` (`user_id` PK). Friends should sit beside it.

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_friendships.sql  (Dev #2)

create table if not exists public.friendships (
  requester_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked', 'ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (requester_id, target_id),
  check (requester_id <> target_id)
);

create index if not exists friendships_target_status_idx
  on public.friendships (target_id, status);

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

create policy friendships_select_own on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or target_id = auth.uid());

-- writes: service role only (world server / hunter function), same pattern as characters
```

Accepted friends are **two** `accepted` rows, one each direction, so each account's list is `where requester_id = $user and status = 'accepted'`. A request is a single `pending` row (`requester_id` → `target_id`). Block and ignore are one-way rows from the actor.

Cap: before insert of `accepted` / `pending`, `count(*)` for that `requester_id` where `status in ('pending','accepted')` must be `< 100`. Block/ignore share a separate count of 100.

Presence (`online`, `zone`) is **not** a column. The world server holds the socket map (`user_id` → session) and fills `friend_list` / `friend_presence` from that. Last-seen on `public.characters` (PR #60) may be used when they are offline.

Optional helper view for the client-owned UI is not required; the socket snapshot is enough.

---

## Client adapter

`src/social/` is the only module the HUD talks to.

| File | Role |
| --- | --- |
| `src/social/index.js` | `attachSocial(game)` — picks offline / mock / mmo |
| `src/social/session.js` | UI-facing store + subscribe |
| `src/social/mock.js` | `?mmo=1&mocksocial=1` |
| `src/social/mmo.js` | Wraps `game.mmo` with feature detection |
| `src/social/offline.js` | Solo / Pages default |
| `src/social/rewards.js` | `splitXp`, `splitGold`, round-robin, need/greed |
| `src/social/ui.js` | Friends panel, party frame, context menu, invite modal |

`src/net/mmo.js`, `PROTOCOL.md`, and `server/` stay with MG Servers. Save files and `server/persistence` stay with MG Developer #2.

## What each owner implements next

### MG Servers

1. Document the types above in `PROTOCOL.md` (keep `v: 1`).
2. On `welcome`, send `features` and `you.user_id` when authed.
3. In `mmo.js`, add the probe-able methods listed under Welcome, and dispatch inbound `friend_list`, `friend_presence`, `friend_request`, `party_invite`, `party_state`, `loot_result`, and whisper `chat`.
4. World server: friends actions (against Dev #2's table), in-memory parties (max 4, 60 s invites), presence from the socket map, XP/loot integers from this spec, error codes.
5. Guest sockets: party yes, friends/block/ignore no.

### MG Developer #2

1. Land the `friendships` migration (or an equivalent keyed **only** by `user_id`).
2. Service-role CRUD for the world server: request / accept / decline / remove / block / ignore, with the 100 caps.
3. Do not key anything by wallet. Do not put party membership in `public.characters` state.
4. Optional: expose a read of accepted `user_id`s so the world server can build `friend_list` after `hello`.
