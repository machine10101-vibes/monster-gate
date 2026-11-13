# Tester debug flags

Session-only tools for layout and combat checks. **Inert unless the URL has `?debug=1`.** A yellow **DEBUG** badge shows while they are on. The hunter save in localStorage is not written or overwritten for that session.

## Flags

| Query | Effect |
| --- | --- |
| `?debug=1` | Enable debug. Required for the rest. |
| `&tp=<zone>` | Teleport after Enter World to a named spot. |
| `&unlock=1` | Grant levels (skills 40), catalog discoveries, dusk-scale gear, Ashen Brand, gold, portals, and open the keep-assault quest so those fights are reachable. |

Examples:

```
/?debug=1&tp=oakhollow
/?debug=1&unlock=1&tp=hellspire
/?debug=1&tp=greyrock
```

Without `debug=1`, `tp` and `unlock` do nothing.

## `tp` zone keys

| Key | Also accepted | Where |
| --- | --- | --- |
| `oakhollow` | `oak`, `town` | Village square |
| `goldenmeadow` | `goldmead`, `goldmeadow` | Goldmead clearing |
| `greyrock` | `greyrock pit`, `pit` | Greyrock Pit ramp |
| `forge` | `bram`, `bramsforge` | Bram's forge by Greyrock |
| `oasis` | `greenbowl` | Desert oasis pool |
| `deepwell` | | Deepwell sand pit |
| `hellspire` | `hellspire keep` | Demon Knight keep courtyard |
| `dawnspire` | `dawnspire keep` | Holy Knight keep courtyard |
| `endlessfield` | `endless`, `warfield` | Endless Field between the keeps |

Keys are case-insensitive. Spaces, `_`, and `-` are ignored.
