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
| Spirit Bolt | Z | Bolt button |
| Fury burst | V | Fury button |
| Select item | 1-9 / click hotbar | Tap hotbar |
| Talk / Waygate | F | Talk button |
| Rotate / zoom camera | R, [ ], wheel, middle-drag | Drag right side |
| Panels | M map, E hunter, B satchel, C catalog, Q hunt log, T settings | Menu buttons |

## Waygate

South of Oakhollow, just off the road, is a stone-and-brass waygate. Press F there to host a world or join one with a 4-character code. The host's browser runs the hunt. A world holds 6 hunters.

## Green Budge Dragon and the Hunter Catalog

The first full monster is the Green Budge Dragon (Lv 4, found in the open fields). It bites at close range, spits ember volleys when you back off and enrages below 40% health. Every kill rolls parts: scales, hide, claws, fangs and a rare horn.

Press C (or Menu > Hunter Catalog on touch) for the catalog. It lists monsters you have discovered, the parts they drop and the gear those parts craft into. Every picture in it is a live render of the same 3D model used in the game, and the detail view has a drag-to-rotate turntable.

- Weapons: Budgefang Blade, Horn Maul (also hotbar slot 8) and Wyrmhorn Bow.
- Armor: Budgescale helm, cuirass, gauntlets, greaves and boots. They show on the hero, add defense, and the full set gives +4 max health.
- Progress (discoveries, parts, crafted gear, what is worn) is saved in localStorage.
- The dragon's palette and proportions live in `src/data/budge.js` and `buildBudgeDragon()` in `src/entities/creatures.js`. Catalog data (drops, recipes, stats) is in `src/data/catalog.js`.

## Rendering

- Voxel models are meshed with per-vertex ambient occlusion and baked vertex colors.
- `MeshToonMaterial` with a stepped ramp gives the cartoon look; geometry between the camera and the hero dithers away.
- Quality tiers (Low / Medium / High) pick shadow size, particle counts, pixel ratio and foliage density, with dynamic resolution scaling to hold frame rate.
- Portrait phones see a "rotate your device" prompt; the HUD and touch controls are laid out for landscape.
