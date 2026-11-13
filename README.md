# Monster Gate

A 3D pixel (voxel) monster hunting game for desktop and mobile browsers, built with Three.js and Vite.

Play at [https://monstergate.online/](https://monstergate.online/). The previous GitHub Pages URL `https://machine10101-vibes.github.io/monster-gate/` redirects there after the custom domain is attached. Hunters saved in that browser on github.io do not move with the domain; the first visit offers to bring them over, and Settings has **Import old saves**.

Start in the village of Oakhollow, step out into the fairy-tale Whispering Wood, and hunt the creatures spilling out of the Monster Gate. Mountains ring the map and open fields and farmland surround the town.

## Run

```bash
npm install
npm run dev           # development server
npm run build         # production build in dist/ (Vite base `/` for the custom domain)
npm run build:gh-path # same build with base `/monster-gate/` if you need the old project path
npm run preview       # serve the production build
```

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrows | Floating joystick (left side) |
| Attack | Click / J / Enter | Sword button |
| Shield | Shift | Shield button |
| Evade roll | Space / right-click | Dash button |
| Skill slots | Z, X, V, or the 1 2 3 buttons beside the bar | Skill buttons 1, 2, and 3 |
| Skill book | G | Menu → Skill & Spell Book, or the book button |
| Skill tree | K | Menu → Skill Tree |
| Hunter stats | H | Menu → Hunter Stats |
| Select item | 1-9 / click hotbar | Tap hotbar |
| Drink a potion | Click it on the hotbar, or select it and attack | Tap it on the hotbar |
| Character / bag | E character, B bag | Gear and bag buttons |
| Talk / Waygate | F | Talk button |
| Rotate / zoom camera | R, [ ], wheel, middle-drag | Drag right side |
| Panels | M map, E character, B bag, G skill book, H stats, C catalog, Q hunt log, T settings, K skills | Menu buttons |

## Waygate

South of Oakhollow, just off the road, is a stone-and-brass waygate. Press F there to host a world or join one with a 4-character code. The host's browser runs the hunt. A world holds 6 hunters.

## Green Budge Dragon and the Hunter Catalog

The first full monster is the Green Budge Dragon (Lv 4, found in the open fields). It bites at close range, spits ember volleys when you back off and enrages below 40% health. Every kill rolls parts: scales, hide, claws, fangs and a rare horn.

Weapons and armor are forged at the Forge beside Bram the Blacksmith in Oakhollow's south-west corner (press F next to the forge, or talk to Bram and press F through his dialog). Lira the Alchemist keeps a purple-awning stall on the south road, between the market stalls: press F by her cauldron to buy healing potions (6 gold, slot 7) and spirit philters (8 gold, slot 0) that restore mana. Gold and potion counts are saved. Press C (or Menu > Hunter Catalog on touch) for the catalog. It lists monsters you have discovered, the parts they drop and the gear those parts craft into. Every picture in it is a live render of the same 3D model used in the game, and the detail view has a drag-to-rotate turntable.

- Weapons: Budgefang Blade, Horn Maul (also hotbar slot 8) and Wyrmhorn Bow.
- Armor: Budgescale helm, cuirass, gauntlets, greaves and boots. They show on the hero, add defense, and the full set gives +4 max health.
- Progress (discoveries, parts, crafted gear, what is worn, gold, potions, and your skill path) is saved in localStorage.
- The dragon's palette and proportions live in `src/data/budge.js` and `buildBudgeDragon()` in `src/entities/creatures.js`. Catalog data (drops, recipes, stats) is in `src/data/catalog.js`.

## Skill trees

Character (E) is the equipped page: the hunter, every worn slot, and forged gear waiting to be worn. Inventory (B) is the bag. Both are also the first buttons in Settings (T) and the Menu. On a phone those buttons sit in the top-right cluster.

The world is 100 tiles, ten by ten. Oakhollow is tile 55. Southford, tile 65, is the river vale directly south of it: the south road drops through a pass in the mountains and the ground meets across the border. Settings → World Creator opens the whole grid. Pick a tile to see it from above, north up. Oakhollow and Southford are built; the other plots are mapped and shown as relief so the world can be filled in one tile at a time.

Southford's eastern bluff holds a cave mouth. Walking into it leaves the overworld for the Darksycle Den, a separate cavern where the Darksycle Dragon lairs. Walk back down the tunnel to return to the vale, just outside the mouth.

Gathering: east of town, the Greyrock Pit is sunk into the ground with a cobbled ramp leading down to it. It holds three copper rocks and two tin rocks. South-west of town, Mirrormere has a walk-out dock with two net spots (shrimp, Fishing 1) and two pole spots (trout, Fishing 3). West of town, the Whispering Wood holds three groves: pale birch and green oak in the meadow (Woodcutting 1), and red maple further into the trees (Woodcutting 10). Stand next to a rock, on the dock, or by a tree and press F: the hunter walks into place, swaps to the pickaxe, net, pole or woodcutter axe, and works until you move, attack or get hurt. A felled tree leaves a stump and grows back. Ore, fish and logs go into the bag (Gathered). Fish can be eaten from there. Logs can be lit from the bag, or by clicking the tinderbox: the hunter kneels, and a campfire burns for a while, then goes out. Birch and oak logs light at Firemaking 1; maple logs need Firemaking 10. Dalla's market stall (the pumpkin stall in town) buys everything. Strength, Agility, Stamina, Mining, Fishing, Woodcutting and Firemaking each level from 1 to 99 on a RuneScape-style XP curve; press H for the stats page. Strength adds 1% melee damage a level, Agility 0.3% move speed, Stamina 1 maximum stamina.

Press K (or Menu → Skill Tree) to choose Warrior, Ranger, or Mage. Each class has three paths, and each path runs five skills deep: a passive, an active, a special, another passive, and a capstone.

- Warrior spends Fury. Tank, Fury, and Barbarian.
- Ranger spends Stamina. Companion, Poison, and Sniper.
- Mage spends Spirit. Fire, Ice, and Lightning.

The same points raise four attributes, three ranks each. Warrior raises Vitality, Might, Guard, and Wrath. Ranger raises Endurance, Precision, Agility, and Toxin. Mage raises Spirit, Arcana, Focus, and Potency.

Those points also raise weapon masteries, three ranks each. The bonus applies only while that weapon is in your hand. Warrior trains Sword & Shield, Two-Handed, and Dual Wield. Ranger trains Short Bow, Longbow, and Crossbow. Mage trains Staff, Wand, and Spell Book.

Choosing a path grants 2 points, then 1 more for every 2 monsters slain. Passives apply as soon as you learn them. Actives and specials equip to Z, X, and V. An empty Z is still Spirit Bolt, and an empty V is still Fury. Respec costs 15 gold and clears skills and attributes. Changing path costs 25 gold and clears what you learned.

## Darksycle Dragon

The second monster is the Darksycle Dragon (Lv 7, one roams the open fields). It hovers out of melee range and fights mostly at range: a fan of spinning crescents (five when it is below half health), a slow homing gloom orb, and a tail slash with a back-step if you get close. A heavy hit during a wind-up staggers it. Parts: dusk scales, membrane, talons, scythe horns and a rare gloom core.

- Weapons: Darksycle Scythe (long reach), Crescent Wingbow (piercing crescents) and Gloomcore Staff (homing orbs). All go to hotbar slot 8 when equipped.
- Armor: the Duskscale set (helm, cuirass, gauntlets, greaves, boots). The full set gives +2 max health and +20 max mana. Pieces from different sets can be mixed, and each set's bonus needs all five of its pieces.
- The reference image for this dragon was not available when it was built, so the look comes from the name and brief. Its palette is in `src/data/darksycle.js` and its proportions in `buildDarksycleDragon()` in `src/entities/creatures.js`.

## Monster-part weapons and armor

Both dragons can be forged into the full weapon list and three armor sets. Everything is forged at the Forge, worn from the Forge or the catalog, and shown on the hero as a real voxel model.

- Weapons per dragon: one-hand sword, two-hand sword, dual swords, war hammer, spear, war staff, wand, short bow, long bow and crossbow (Darksycle also keeps its Scythe). Each carries the weapon style that its mastery tracks: one-hand sword is Sword & Shield, two-hand sword, hammer and spear are Two-Handed, dual swords are Dual Wield, staff and wand keep their own masteries, and the bows and crossbow match their masteries. Held models live in `src/entities/weaponModels.js`. Dual swords show a matching blade in the off hand.
- Armor per dragon: a metal set for the Warrior (helm, chest, gauntlets, legs, boots and a shield), a leather set for the Ranger (hide cap, jerkin, gloves, leggings, boots) and a cloth set for the Mage (hood, robe, gloves, trousers, slippers and a spell book). Metal sets are Budgescale Plate and Duskscale Plate. Leather sets are Budgehide Leathers and Duskhide Leathers. Cloth sets are Emberweave Robes and Gloomweave Robes. Painters live in `src/entities/armor.js`, `armorDark.js` and `armorSoft.js`, registered by set id in `armorSets.js`.
- Detail pass: every held weapon, shield and spell book is sculpted at half the character voxel size (bevelled blades with fullers and edge highlights, wrapped grips, guards, gems, glowing inlays). Bows are built with the riser in the hand, the belly facing the target and the string toward the archer, and bows and crossbows stay level with the body while the arm raises them to aim. The Darksycle Scythe blade sweeps out and droops back toward the snath. Armor gets a relief pass (lit tops, crisp edges, shadowed undersides) plus extra plates, stitching, knee guards and back emblems from `src/entities/armorDetail.js`.
- New parts: Budge Wing Membrane (cloth) and Dusk Hide (leather) now drop from the dragons.
- Set bonuses need the five core pieces. Leather sets add stamina plus ranged damage (Budge) or crit chance (Darksycle). Cloth sets add mana plus spell damage. The shield adds defense and shows while you block. The spell book adds mana and spell damage, and while a book is worn Spell Book mastery also applies to staffs and wands.

## Rendering

- Voxel models are meshed with per-vertex ambient occlusion and baked vertex colors.
- `MeshToonMaterial` with a stepped ramp gives the cartoon look; geometry between the camera and the hero dithers away.
- Quality tiers (Low / Medium / High) pick shadow size, particle counts, pixel ratio and foliage density, with dynamic resolution scaling to hold frame rate.
- Portrait phones see a "rotate your device" prompt; the HUD and touch controls are laid out for landscape.
