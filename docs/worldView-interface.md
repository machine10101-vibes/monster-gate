# worldView interface

Presentation layer for nearby hunters, name tags, snapshot interpolation, the chat panel, the online count, and connection / reconnect UI.

This module **does not open sockets**. `src/net/mmo.js` (owned by the world-server teammate, gated by `?mmo=1`) should call into it.

Live GitHub Pages is unchanged unless the page is opened with `?mmo=1`.

| Flag | What happens |
| --- | --- |
| _(none)_ | Nothing. Waygate P2P (`src/net/session.js` / trystero) is untouched. |
| `?mmo=1` | Mounts worldView and leaves it idle for `mmo.js` (`offline` until `setStatus`). |
| `?mmo=1&mock=1` | Same, plus a local mock crowd and chat feed for layout / screenshots. |

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
worldView.setStatus(state)                    // or { status, detail?, online? }
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

`'offline' | 'connecting' | 'online' | 'reconnecting'`

`meta.online` on a snapshot, or `setStatus({ status, online })`, sets the world-wide count (may exceed nearby).

## Outbound (view → `mmo.js`)

```js
worldView.onLocalMove((pose) => { /* send movement intent */ });
worldView.onChatSend((msg) => { /* send chat */ });
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

## Class

`new WorldView(game, { spawnRemote })` is the same object `init` returns. Methods match the names above. Waygate remotes (`Session` / trystero) stay on `game.remotes` with unprefixed ids; worldView hunters use the `wv:` prefix so `clearRemotes()` from a waygate leave does not wipe them.
