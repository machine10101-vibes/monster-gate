# Tester debug flags

Session-only tools for layout and combat checks. **Inert unless the URL has `?debug=1`.** A yellow **DEBUG** badge shows while they are on. The hunter save in localStorage is not written or overwritten for that session.

## Flags

| Query | Effect |
| --- | --- |
| `?debug=1` | Enable debug. Required for the rest. |
| `&tp=<zone>` | Teleport after Enter World to a named spot. |
| `&unlock=1` | Grant levels (skills 40), catalog discoveries, dusk-scale gear, Ashen Brand, gold, portals, and open the keep-assault quest so those fights are reachable. |
| Spawn monster | Offline only, with `?debug=1`: Settings → **Spawn monster**, or **F9** on desktop. Spawns a **hostile** zone monster adjacent to you (never a chicken). Hidden and inert when `?mmo=1` is set. World 1 rejects debug messages with error code `debug`. |
| Spawn tanky monster (debug) | Offline only, with `?debug=1`: Settings → **Spawn tanky monster (debug)**, or **Shift+F9**. Same hostile spawn with ~20× HP and a modest hit rate so testers can see damage numbers, the enemy HP bar, and player damage taken. Inert with `?mmo=1`. Not written to the hunter save. |
| Auto-attack (debug) | Offline only, with `?debug=1`: Settings toggle. Auto-attacks the nearest hostile in range on the normal attack cooldown. Inert with `?mmo=1`. |
| Debug starter weapon | If the weapon slot is empty, debug equips the Hunter Blade for this session only. It is stripped from guest localStorage and cloud save payloads. |
| `?mockwallet=<address>` | Session-only Klever stand-in. A green **MOCK WALLET** badge shows. Does not create an account. |

Examples:

```
https://monstergate.online/?debug=1
https://monstergate.online/?debug=1&tp=oakhollow
https://monstergate.online/?debug=1&unlock=1&tp=hellspire
https://monstergate.online/?debug=1&tp=greyrock
https://monstergate.online/?mockwallet=1
https://monstergate.online/?mockwallet=klv1fpwjz234gy8aaae3gx0e8q9f52vymzzn3z5q0s5h60pvktzx0n0qwvtux5
```

The old GitHub Pages URL `https://machine10101-vibes.github.io/monster-gate/` redirects here after the custom domain is set.

Without `debug=1`, `tp` and `unlock` do nothing.

**World view:** if the URL also has `?mmo=1`, debug is fully inert — no unlocks, teleports, gear grants, Spawn monster, F9, or DEBUG badge. The console warns that debug is disabled for world-view sessions. World 1 rejects debug messages with error code `debug`. Use debug on a visit without `mmo=1`.

Wake overlay (no `debug=1` needed): `?mmo=1&mockwake=1` is a 30s queue. `?mmo=1&mockwake=90` waits 90 seconds so testers can sit through **Almost there…**, Retry, and Play offline.

## `tp` zone keys

| Key | Also accepted | Where |
| --- | --- | --- |
| `oakhollow` | `oak`, `town` | Village square |
| `goldenmeadow` | `goldmead`, `goldmeadow` | Goldmead clearing |
| `greyrock` | `greyrock pit`, `pit` | Greyrock Pit ramp |
| `forge` | `bram`, `bramsforge` | Bram's forge by Greyrock |
| `oasis` | `greenbowl` | Dry south-east shore of the oasis pool on the Oasis tile (HUD label: Oasis). Camera frames the pool above the hotbar (`--hud-clear-bottom`). |
| `deepwell` | | Deepwell sand pit |
| `cinderfall` | | Cinderfall volcano (titanium) |
| `glimmerfrost` | | Glimmerfrost glacier (platinum) |
| `hellspire` | `hellspire keep` | Demon Knight keep courtyard |
| `dawnspire` | `dawnspire keep` | Holy Knight keep courtyard |
| `endlessfield` | `endless`, `warfield` | Endless Field between the keeps |

Keys are case-insensitive. Spaces, `_`, and `-` are ignored.
