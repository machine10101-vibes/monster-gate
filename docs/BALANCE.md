# Metal tier balance

Seven smithable metals, in rank order. Every mining node, smelt, forged piece, tint and save alias is generated from `src/data/metals.js`.

Defense uses `DEF_PER_POINT = 0.04`, capped at 50% (12.5 points). Piece defense is a slow climb so mithril does not hit the cap and dump steel. Weapon damage, set bonuses, XP and bar costs keep growing after the cap.

Iron's sword (14) and iron bar costs stay where they were so the starter hammer (10) < iron < budge blade (16) ladder still holds.

## Rank table

| Rank | Metal | Mine | Smith | Equip (Str) | Zone | Ore | Coal / bar | Sword | Set def | Set HP | Set stam |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Copper | 1 | 1 | 1 | Greyrock Pit | copper_ore | 0 | 11 | 6 | +2 | — |
| 1 | Iron | 15 | 15 | 4 | Greyrock and Deepwell | iron_ore | 0 | 14 | 8 | +2 | — |
| 2 | Steel | — | 30 | 8 | Smelted (iron ore + 1 coal) | none | 1 | 17 | 9 | +4 | — |
| 3 | Mithril | 45 | 50 | 12 | Deepwell | mithril_ore | 2 | 21 | 10 | +4 | — |
| 4 | Adamite | 60 | 65 | 16 | Deepwell, deep seams | adamite_ore | 3 | 26 | 11 | +6 | — |
| 5 | Titanium | 75 | 80 | 20 | Cinderfall | titanium_ore | 4 | 32 | 12 | +6 | +10 |
| 6 | Platinum | 90 | 90 | 24 | Glimmerfrost | platinum_ore | 6 | 38 | 13 | +8 | +12 |

Steel has no ore node. Coal is Mining 30 in Deepwell.

## Equip vs monster zones

Strength gates line up with the zone you mine in, then sit a little high so the next plate is a goal, not a free upgrade.

| Metal | Worn around | Nearby monsters |
| --- | --- | --- |
| Copper | Oakhollow, Greyrock | Gate slimes 1, boars / wraiths 3 |
| Iron | Fields, Greyrock, Deepwell mouth | Budge 4, orc scouts 4 |
| Steel | Jungle and pirate coast | Pirates 5, tiger / raptor 6 |
| Mithril | Deepwell and Southford | Darksycle 7, sand worm 8 |
| Adamite | Deep desert and the arctic approach | Yeti 9 |
| Titanium | Cinderfall / the keeps | Knights 11, Keep Warden 12 |
| Platinum | Glimmerfrost endgame | Past the keeps. Dusk hammer (42 dmg, Str 20) still out-hits a platinum sword (38) |

## Piece defense

Helm / chest / arms / legs / boots / shield. Full-set reduction in parentheses.

| Metal | Pieces | Total | Reduction |
| --- | --- | --- | --- |
| Copper | 1 / 1 / 1 / 1 / 1 / 1 | 6 | 24% |
| Iron | 1 / 2 / 1 / 1 / 1 / 2 | 8 | 32% |
| Steel | 1 / 2 / 1 / 2 / 1 / 2 | 9 | 36% |
| Mithril | 1 / 3 / 1 / 2 / 1 / 2 | 10 | 40% |
| Adamite | 2 / 3 / 1 / 2 / 1 / 2 | 11 | 44% |
| Titanium | 2 / 3 / 2 / 2 / 1 / 2 | 12 | 48% |
| Platinum | 2 / 3 / 2 / 2 / 2 / 2 | 13 | 50% (cap) |

## Mining nodes

Gather chance uses `mineChance(base, miningLevel)`. Lower `base` and longer `respawn` make higher rocks slower even at the same level.

| Rock | Level | XP | Base | Respawn s | Where |
| --- | --- | --- | --- | --- | --- |
| Copper | 1 | 17.5 | 0.52 | 10 | Greyrock (5) |
| Iron | 15 | 35 | 0.45 | 16 | Greyrock (1), Deepwell (2) |
| Coal | 30 | 50 | 0.40 | 22 | Deepwell (2) |
| Mithril | 45 | 80 | 0.34 | 32 | Deepwell (2) |
| Adamite | 60 | 110 | 0.30 | 42 | Deepwell (2) |
| Titanium | 75 | 150 | 0.26 | 54 | Cinderfall (3) |
| Platinum | 90 | 210 | 0.22 | 70 | Glimmerfrost (3) |

XP per rock is roughly ×1.7–2 each tier, not +a flat step.

## Smithing

Smelt XP is `barXp`. Forge XP is `round(bars × barXp × 0.8, 1)`. Piece smith levels are the metal's smithing level plus a slot offset: helm/sword 0, gauntlets 1, boots 2, legs/spear 2–3, shield 4, chest/greatsword 4–5, hammer 5.

| Metal | Bar XP | Helm | Chest | Arms | Legs | Boots | Shield | Sword | Great | Spear | Hammer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Copper | 12.5 | 1 | 3 | 1 | 2 | 1 | 2 | 2 | 3 | 2 | 3 |
| Iron | 25 | 2 | 5 | 2 | 3 | 2 | 3 | 2 | 4 | 3 | 4 |
| Steel | 37.5 | 2 | 5 | 2 | 3 | 2 | 3 | 2 | 4 | 3 | 4 |
| Mithril | 50 | 3 | 6 | 2 | 4 | 2 | 4 | 3 | 5 | 4 | 5 |
| Adamite | 75 | 3 | 7 | 3 | 4 | 3 | 4 | 3 | 6 | 4 | 6 |
| Titanium | 112.5 | 4 | 8 | 3 | 5 | 3 | 5 | 4 | 7 | 5 | 7 |
| Platinum | 150 | 5 | 10 | 4 | 6 | 4 | 6 | 5 | 8 | 6 | 8 |

A full copper set is 10 bars. A full platinum set is 35 bars plus 6 coal each, and Smithing 95 for the platebody.

## Weapons

| Metal | Sword | Greatsword | Spear | Hammer |
| --- | --- | --- | --- | --- |
| Copper | 11 | 13 | 10 | 14 |
| Iron | 14 | 16 | 13 | 18 |
| Steel | 17 | 20 | 16 | 22 |
| Mithril | 21 | 24 | 19 | 27 |
| Adamite | 26 | 30 | 24 | 33 |
| Titanium | 32 | 37 | 29 | 41 |
| Platinum | 38 | 44 | 35 | 48 |

Quiver stays iron (1 iron bar + 2 birch logs, Smithing 15). Arrowheads still come from iron bars.

## Tints

| Metal | Plate | Look |
| --- | --- | --- |
| Copper | `#c56a28` | Orange |
| Iron | `#b7c0c8` | Grey |
| Steel | `#8a9aac` | Blue-grey |
| Mithril | `#9ec8ee` | Pale blue |
| Adamite | `#4aaa5a` | Green |
| Titanium | `#e8eef4` | Silver-white |
| Platinum | `#f4e6b0` | Bright white-gold |

## Save aliases

Goods and gear ids that no longer exist fold on load. The save format is unchanged (totals per item id).

| Old id | Becomes |
| --- | --- |
| `tin_ore`, `bronze_ore` | `copper_ore` |
| `bronze_bar` | `copper_bar` |
| `adamant_ore` | `adamite_ore` |
| `adamant_bar` | `adamite_bar` |
| `bronze{slot}` / `bronzeblade` | `copper{slot}` / `coppersword` |
| `adamant{slot}` | `adamite{slot}` |

Iron ids (`iron_ore`, `iron_bar`, `ironhelm`, `ironsword`, …) stay. Steel, mithril and the old adamant *bar* goods that already existed keep those ids; only the adamant name became adamite.
