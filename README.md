# Monster Gate

A 3D pixel (voxel) monster hunting game for desktop and mobile browsers, built with Three.js and Vite.

Start in the village of Oakhollow, step out into the fairy-tale Whispering Wood, and hunt the creatures spilling out of the Monster Gate. Mountains ring the map and open fields and farmland surround the town.

## Run

```bash
npm install
npm run dev      # development server
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrows | Floating joystick (left side) |
| Attack | Click / J / Enter | Sword button |
| Shield | Shift | Shield button |
| Evade roll | Space / right-click | Dash button |
| Skill slots | Z, X, V | Bolt, Skill, and Fury buttons |
| Skill tree | K | Menu → Skill Tree |
| Select item | 1-9 / click hotbar | Tap hotbar |
| Talk / Waygate | F | Talk button |
| Rotate / zoom camera | R, [ ], wheel, middle-drag | Drag right side |
| Panels | M map, E hunter, B satchel, C catalog, Q hunt log, T settings, K skills | Menu buttons |

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
- New parts: Budge Wing Membrane (cloth) and Dusk Hide (leather) now drop from the dragons.
- Set bonuses need the five core pieces. Leather sets add stamina plus ranged damage (Budge) or crit chance (Darksycle). Cloth sets add mana plus spell damage. The shield adds defense and shows while you block. The spell book adds mana and spell damage, and while a book is worn Spell Book mastery also applies to staffs and wands.

## Rendering

- Voxel models are meshed with per-vertex ambient occlusion and baked vertex colors.
- `MeshToonMaterial` with a stepped ramp gives the cartoon look; geometry between the camera and the hero dithers away.
- Quality tiers (Low / Medium / High) pick shadow size, particle counts, pixel ratio and foliage density, with dynamic resolution scaling to hold frame rate.
- Portrait phones see a "rotate your device" prompt; the HUD and touch controls are laid out for landscape.
