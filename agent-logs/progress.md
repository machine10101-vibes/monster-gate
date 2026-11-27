# Development loop progress

## 2026-11-26 — Player-data protection

- Director audit: recent Enforcer reset exposed a high-priority data-integrity bug. The cloud roster still held the account save, but an older World 1 snapshot could overwrite equipment/progression.
- Designer task: make account saves recoverable and reject silent progression rollback. Add bounded revision/checkpoint history and a restore function at the database boundary.
- Implementer: migration `20261126133000_account_save_history_guard.sql` has been applied to the Monster Gate Supabase project and committed to GitHub as `6c1e65464018d8461788d28419e0baf0818718a9`.
- Verification so far: database regression predicate returns `true` for XP rollback and bulk crafted-gear loss, `false` for an unchanged save. An account checkpoint exists for the current revision.
- Client hardening: protected save responses now restore the authoritative roster and suppress stale retry loops; regression test added in `tests/mg-save-protection.test.js`. Added `npm run test:smoke` (`build` + shader check).
- Verification: full `npm test` passed 493/493; targeted protection test passed; `npm run test:smoke` passed (shader check skipped only because Chrome is unavailable); `npm run test:persistence` passed 33/33 after installing its declared dependency.
- Release gate: no production application deployment/merge claim yet. Authentication/progress/database changes require human approval before production release.
- Harness limitation: this checkout contains no `AGENTS.md`, `agents/config.yaml`, `agents/orchestrator.py`, `tasks/`, or `skills/` files, and has no `.git` metadata, so the requested branch/commit workflow cannot be executed locally.

## 2026-11-26 — World 1 authoritative gathering

- Director: audit found the remaining P1 gap in `server/world.js`: online gathering depleted shared nodes but never credited the character, despite persistence already supporting goods and XP.
- Designer: define a server-owned yield contract for mining, woodcutting, and fishing. Derive item/skill/XP from the node type; persist the reward before depletion; reject duplicate same-frame requests; emit client `reward_update` frames only after the durable write succeeds.
- Implementer: added `gatherYield()` in `server/content.js`, awaited gather handling in `server/world.js`, an in-flight node lock, immediate persistence of goods + skill XP, and reward updates. Updated `server/PROTOCOL.md` and added an integration regression test.
- Tester: focused World 1 suite passed 18/18; full `npm test` passed 494/494; `npm run test:smoke` built successfully and shader check skipped only because Chrome is unavailable; `npm run test:persistence` passed 33/33.
- Release gate: local verification is complete, but this checkout has no `.git` branch/commit support. The change affects authenticated player progression/database writes, so production merge/publish requires explicit human approval and a deployment-capable checkout. No production-live claim made.

## 2026-11-26 — World 1 reconnect and position integrity audit

- Director: player reports repeated reconnects followed by location rewind. Render events show successful deployments and no recorded `server_failed` events in the recent window; app logs show process starts but lack per-socket close reasons. The verified source has a stale resume-pose cache and a background persistence rejection path capable of terminating Node.
- Designer: resume from the last server-accepted pose, load fresh saved state on same-account replacement, commit active movement every 15 seconds, retain transient save failures, and prevent discarded sockets from joining after asynchronous authentication.
- Implementer: refresh resume pose on disconnect; await replacement socket's final save and flush before loading; make periodic saves commit; track only in-flight disconnect saves; guard asynchronous hello after socket closure; catch background queue failures and retry transient writes.
- Tester: focused World 1 suite passed 21/21; persistence suite passed 34/34, including expiry, replacement socket, periodic save and transient database failure regressions. Full `npm test` passed 497/497; `npm run test:smoke` built successfully (shader compilation skipped because Chrome is unavailable). Remote PR CI must verify the current main branch, which has changes beyond this local checkout.
- Critic proposal for approval: add bounded, non-identifying close-code and save-failure counters to World 1 health/observability so future transport failures can be distinguished from service restarts without logging player data.
- Release: PR #316 passed both GitHub verification workflows and was squash-merged as `59d10011b6100cb536bd430348f92d5f4bb1d9cf`. Render's automatic trigger did not create a deployment after the merge; a manual deploy `dep-dc4e3qnf3r2c73b3l5o0` built that exact commit and reached `live`. Production `/healthz` returned `ok: true`. Status: https://dashboard.render.com/web/srv-dbt3p35g1s2s738mel8g/deploys/dep-dc4e3qnf3r2c73b3l5o0
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
