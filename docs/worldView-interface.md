# worldView interface

Presentation layer for nearby hunters, name tags, snapshot interpolation, the chat panel, the online count, and connection / reconnect UI.

This module **does not open sockets**. `src/net/mmo.js` (gated by `?mmo=1`) calls into it. Protocol: `PROTOCOL.md`.

Live site: [https://monstergate.online/](https://monstergate.online/). World view stays off unless `?mmo=1` is set.

Mock / wake links:

```
https://monstergate.online/?mmo=1
https://monstergate.online/?mmo=1&mock=1
https://monstergate.online/?mmo=1&mockwake=1
https://monstergate.online/?mmo=1&mockwake=90
https://monstergate.online/?mmo=1&mock=1&mockerr=name_taken
```

The old GitHub Pages URL `https://machine10101-vibes.github.io/monster-gate/` redirects here after the custom domain is set.

| Flag | What happens |
| --- | --- |
| _(none)_ | Nothing. Waygate P2P (`src/net/session.js` / trystero) is untouched. |
| `?mmo=1` | Mounts worldView and leaves it idle for `mmo.js` (`offline` until `setStatus`). |
| `?mmo=1&mock=1` | Same, plus a local mock crowd and chat feed for layout / screenshots. |
| `?mmo=1&mockwake=1` | Mock path with a 30s `waking` queue overlay, then `online`. Does not open a socket. |
| `?mmo=1&mockwake=90` | Same mock wake, 90 seconds. Use this to sit through `Almost there…`, Retry, and Play offline. |
| `?mmo=1&mock=1&mockerr=name_taken` | Mock join that stays on a final `error` / name-taken prompt. No auto-reconnect. |

## Mount

```js
import * as worldView from './net/worldView.js';

const view = await worldView.init(game.scene, { game, mock: false });
```

`init(scene, opts)` is idempotent. `scene` may be the Three.js scene or the `Game` instance. Pass `{ game }` when `scene` is only the Three.js scene.

`opts.mock === true` attaches the in-process mock feed (`src/net/worldMock.js`). No WebSocket.

The instance is also `game.worldView` and `window.__worldView`.

## Inbound (`mmo.js` → view)

```js
worldView.applySnapshot(players, meta?)
worldView.applyDelta(players)                 // array of upserts
worldView.applyDelta({ upsert, remove })      // patch + despawn
worldView.removePlayer(id)
worldView.pushChat(msg)
worldView.setStatus(state, detail?)           // or { status, detail?, online? }
```

### Player

```js
{
  id, name,
  x, y, z, yaw,
  move,                 // 0..1 walk amount
  anim,                 // 0 idle, 1 attack, 2 roll, 3 dead, 4 stagger, 5 use
                        // (or those names)
  held, sheath,         // held-item kinds: 'blade', 'bow', …
  look,                 // { skin, hair, style, tunic, beard } roster indices
                        // or resolved colours { skin, hair, tunic, hairStyle, resolved: true }
  armor,                // { helm, chest, arms, legs, boots, shield, book } set ids
  zone, hp
}
```

`applySnapshot` replaces the nearby set: ids not listed despawn. `applyDelta` with an array only upserts. `removePlayer(id)` despawns one hunter.

### Chat

```js
{ id?, channel: 'world' | 'zone', from: { id, name }, text, at?, zone? }
```

### Status

`'offline' | 'connecting' | 'waking' | 'online' | 'reconnecting' | 'error'`

`setStatus('error', { code: 'name_taken', message })` (or `{ status: 'error', code: 'name_taken', message }`) is **final**. It does not auto-reconnect. The view shows a themed prompt that the hunter name is taken, asks for another, and focuses the name field. Submitting a valid new name emits `{ type: 'rename', name }`.

`setStatus('waking', { secondsLeft, elapsedMs })` (or `{ status: 'waking', detail: { secondsLeft, elapsedMs } }`) shows the login-queue overlay:

- Copy: “Server starting, you're in the login queue”
- Countdown from `secondsLeft` (default **30**). If no further updates arrive, the view counts down locally from the last detail.
- Progress bar for those 30 seconds.
- Past 30s elapsed: “Almost there…”
- Past 60s elapsed: **Retry** and **Play offline**.
- `online` closes the overlay (including if `mmo.js` connects before wake finishes).

The overlay is inert unless `?mmo=1` is set. It does not block guest or offline play: Play offline dismisses it; title buttons stay clickable around the card.

`meta.online` on a snapshot, or `setStatus({ status, online })`, sets the world-wide count (may exceed nearby).

## Outbound (view → `mmo.js`)

```js
worldView.onLocalMove((pose) => { /* send movement intent */ });
worldView.onChatSend((msg) => { /* send chat */ });
worldView.onRetry(() => { /* wake Retry — mmo.js should poll /healthz again */ });
```

Move payload (about 10 Hz while hunting):

```js
{ x, y, z, yaw, anim, move, held, sheath, look, armor, zone }
```

Chat payload:

```js
{ channel: 'world' | 'zone', text }
```

The reconnect button on the status chip calls `setStatus('reconnecting')` and, if a mock transport is bound, `transport.reconnect()`. `mmo.js` should watch status or pass a transport with `reconnect()`.

The wake overlay **Retry** button fires `onRetry` and the same reconnect path. **Play offline** only dismisses the overlay.

## Class

`new WorldView(game, { spawnRemote })` is the same object `init` returns. Methods match the names above. Waygate remotes (`Session` / trystero) stay on `game.remotes` with unprefixed ids; worldView hunters use the `wv:` prefix so `clearRemotes()` from a waygate leave does not wipe them.
