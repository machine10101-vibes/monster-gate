# Agent progress log

For each task record date, objective, iteration (1–6), changes, checks and results, remaining blockers, commit and deployment status.

## Entries

No task entries yet.

### 2026-11-26 — Release stuck hunt controls
- Iteration: 1/6.
- Observation: blur cleared keys and attack/shield only; touch stick, drag and queued actions survived.
- Changes: ad71d7a (release controls on blur/background), 51bd63a (behavioral regression test).
- Verification: production workflow 45832226334 queued; World 1 workflow 45832226365 queued. Browser gameplay and standalone smoke not yet executed. Status: pending, not done.
- Reflection proposal: add browser focus-loss smoke coverage after human approval.
- Workflow deviation: small fix committed directly to main before CI; future tasks should use isolated branches and verify before merge.

### 2026-11-26 — Quest gear reward delivered exactly once (quest-progression)
- Iteration: 6/6 (limit reached); status: BLOCKED, not done.
- Objective: a finished quest's gear reward (`keepassault`, Ashen Brand) is never lost when the bag is full; delivered exactly once.
- Changes (uncommitted on ccr-81a4e261-p4hmfr, merged with origin/main): `Journal.owedGear/settleGear/deliverGear` persisted as `journal.owedGear`; `main.js` delivers owed gear via `deliverQuestGear` on the periodic journal pulse; new regression tests `tests/mg-quest-gear-reward.test.js` (4 pass; they fail on the old code); `tests/mg-slice.test.js` assertion moved to the new wiring; `server/scripts/smoke.mjs` stale check fixed.
- Checks:
  - Build: pass.
  - Tests: 496 pass, 3 fail. The 3 failures also fail on clean origin/main (see failures.md), so the test gate is blocked by main.
  - Smoke (`server/scripts/smoke.mjs`): pass after fixing the stale check.
  - Browser guest flow: Play as guest, then Play solo reaches the world with the HUD and no page errors.
  - Browser core loop: moved 0.48 units while holding W for 1.5 s. Owed gear delivered and crafted. Attack returned `idle`, which is inconclusive; attack was not verified.
- Blockers: (1) three main-branch test failures, outside this task; (2) attack not verified in browser; (3) manual browser checks still required per AGENTS.md.
- Commit/deployment: not committed, not pushed, not published. Human approval required before release.
- Reflection proposal: keep a browser-check hook behind a test flag so gameplay checks can read player state without editing src/main.js.


### 2026-11-26 — Sand Spine Worm rebuilt to the reference photo, level 125
- Iteration: 1/6. Objective (user request): match the photo, travel underground and surface to attack, its own attack set, level 125.
- Changes: new `src/entities/sandwormModel.js` (round maw, ribbed throat, 3 tooth rings, tongue, socketed horn-tusks, banded mottled hide); `sandwormAI.js` rewritten (burrow, Erupting Maw, Maw Slam, Tusk Cyclone, Sand Torrent, Dune Rupture, dive, enrage); hp 1500, scale 2.6, level 125 in the catalog; desert worm quota 4 → 2; wind-up glow kept in `monsters.js`.
- Checks: build pass; smoke pass; npm test 496 pass / 3 fail (same three guest-button failures as clean origin/main); standalone pose renders reviewed; live game (guest, ?debug=1 at the Oasis): spawned worm went burrow → eruptwind → erupt (hunter took 17 damage) → reared → sweepwind → sweep, 0 page errors. Not observed live: slam, spew, rupture, dive (unit poses rendered only). Small 480x300 live screenshots did not frame the worm, so its in-world look was checked in the standalone renders only.
- Commit/deployment: committed to ccr-81a4e261-p4hmfr; not published (needs approval).
- Iteration 2 (live, stepped AI in the running game, real player/world/fx, 1/30 s steps), hunter damage taken: Maw Slam slamwind>slam>reared 14; Sand Torrent spewwind>spew>reared 8; Tusk Cyclone sweepwind>sweep>reared 11; Erupting Maw burrow>eruptwind>erupt>reared 17; dive reared>dive>burrow; Dune Rupture burrow>rupture>burrow 10; enraged slam 1.37 s vs 1.57 s normal. 0 page errors. Status: verified on branch; release awaits human approval (gold reward change counts as economy).
- In-world look: rendered with the game's own camera and renderer at the Oasis (reared facing the hunter, reared from behind, buried, erupting). Round red maw, tooth rings and horn fringe read clearly; it towers over the hunter; buried shows only horn tips. Task verified; awaiting human approval to publish.

### 2026-11-27 — The Northern Jungle (tiles 25, 26, 35, 36) with two tribe villages
- Objective (user request): turn tiles 25/26/35/36 into light jungle with two tribe villages, at tile 55 quality, blending naturally with every neighbour; audit, then merge and publish.
- Changes: `src/world/northJungle.js` (specs, plaza flattening, border blends, village layout, villagers), `src/world/tribeModels.js` (round and stilt huts, longhouse, totems, fire pit, drying rack, palisade, gate, pots, drum, canoe, log bench, woodpile), ring.js passes from Northleas, Goldmead and the Endless Field plus edge stitching, tiles.js jungle biome and names (Fernreach, Mistvale, Vinecrest, Sunfeather), village smoke and butterflies, villagers in ambient. Northern lands kept out of the jungle monster spawner list.
- Audit fixes during the task: floating roof topknots, black gate caps, bare plazas (benches, woodpile, more huts, fence planting), scorched patches painting the stone ridge, pass paths graded into even ramps.
- Tests: new `tests/north-jungle.test.js` (7: tile registry, exact border seams with all 9 neighbours, walkable passes and inter-tile roads, flat dry plazas with gates, border thinning and recolouring, no mesh cracks, wiring). The three stale guest-button assertions now assert the restored Play as Guest button (matches `tests/mg-no-guest-entry.test.js` from fa64a04/2e29c42).
- Checks: build pass; npm test 506 pass / 0 fail; smoke pass; live game (guest, ?debug=1&tp=fernreach): 4 lands present, 2 villages with 6 huts each, 8 villagers, 2 smoke spots, 7 routes walked with 0 blocked steps, 0 page errors; renders of both villages, the Northleas pass, Mistvale, Vinecrest and the Ashen Road border reviewed.
- Not re-verified in browser: attack/evade (combat code untouched by this change).
