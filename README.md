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
| Talk | F | Talk button |
| Rotate / zoom camera | R, [ ], wheel, middle-drag | Drag right side |
| Panels | M map, E hunter, B satchel, Q hunt log, T settings | Menu buttons |

## Rendering

- Voxel models are meshed with per-vertex ambient occlusion and baked vertex colors.
- `MeshToonMaterial` with a stepped ramp gives the cartoon look; geometry between the camera and the hero dithers away.
- Quality tiers (Low / Medium / High) pick shadow size, particle counts, pixel ratio and foliage density, with dynamic resolution scaling to hold frame rate.
- Portrait phones see a "rotate your device" prompt; the HUD and touch controls are laid out for landscape.
