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

### 2026-11-27 — Release: Northern Jungle and Sand Spine Worm live
- PR #312 merged (squash) as f20c9d8 after `verify` and `test-and-build` passed on 8a1e116 (main merged in first; 524 tests pass locally, smoke pass).
- Pages run 45951933083: success. gh-pages `version.json` build = f20c9d8. Live at monstergate.online.
- Also shipped in #312: the quest gear reward fix (808785b, `journal.owedGear`, `tests/mg-quest-gear-reward.test.js`). It was still on the branch and the squash merge included it. It was not called out separately when the user approved publishing, although it touches saved journal data. CI passed with it (all tests green); the earlier blocker (three stale title tests) is resolved on main. Attack/evade still not re-verified in a browser (combat code untouched).
- Session task count: 3 tasks released (sandworm, Northern Jungle, quest gear reward). Session limit reached; no new loop task started.

### 2026-11-27 — East coast: Glacier Bay (39), Frostshore (49), Seawind Leas (59); 40/50/60 open ocean
- Objective (user request): 59 open grass and trees, 49 and 39 extensions of the frozen snow and ice land, all three blending into the ocean on the east (40, 50, 60 are open ocean).
- Changes: `src/world/eastCoast.js` (shoreline drawn in world space so it is continuous across the three tiles; beach profile into the sea floor; frozen shingle beach with floes, bergs and shore ice on 39/49; sand beach, groves, flowers, reeds, driftwood on 59; Frostshore thaws to grass along its south edge, frost creeps onto Seawind's north edge); arctic blend from the south edge; passes from Glimmerfrost (row 112) and Icewind Reach (row 50) with graded entries; Gilantre NE east column re-stitched after carving; map codes 40/50/60 to sea; pass digging never touches shared border rows.
- Tests: new `tests/east-coast.test.js` (6: registry and ocean tiles, exact seams and ocean east edge, every row runs land-shore-sea with the right beach, thaw and frost blends, walkable passes and roads, no mesh cracks).
- Checks: build pass; npm test 531 pass / 0 fail; live game (guest, entered via the roster API after main's class requirement): three coast lands present, three routes walked with 0 blocked steps, 0 page errors; renders of the beach, the plain, the thaw line, Glacier Bay and the pond reviewed.
- Noted, not changed: grass skirt panels with white gaps on terrace steps (pre-existing, also on older tiles); suggested as a separate task.
- Commit: on ccr-81a4e261-p4hmfr; not published (awaiting the user's go-ahead).

### 2026-11-27 — Unique monster-part armor sets
- Objective (user request): every monster-part armor set looks the same; make each unique and detailed like the monster weapons, then merge and publish everything.
- Finding: Budgefang, Dusk, Volcanum and Yeti leather and cloth came from one shared leather and one shared cloth template (palette swaps); Raptor and Rex were near twins; Rex plate was the iron-tier mesh in green; the four plate sets shared one layout; the shared detail pass stamped the same medallion on all.
- Changes: `src/entities/armorBeasts.js` with a small sculpt kit and bespoke painters for 13 sets (each with its own helm, chest, arms, legs and boots silhouette), per-set covers so the hunter's belt, sleeves, pauldrons and boots never show through, and signature layers for the Budgefang, Dusk, Volcanum and Yeti plate (snout visor and wings, mandibles and cape, crystal crown and vent pauldrons, fur mane and collar).
- Tests: new `tests/monster-armor.test.js` (3): bespoke registration; every pair of 17 monster sets differs by at least 40 voxels in helm, chest and arm; no black voxels and full coverage of belt, sleeves and legs.
- Checks: build pass; npm test 534 pass / 0 fail; renders of all monster sets front and back reviewed.
- Release: PR #331 merged (squash) as 89debc8 after `verify` and `test-and-build` passed on f3a3fed. Pages run 45970445985 success; gh-pages `version.json` build = 89debc8. The east coast had already reached main through PR #329, so it is live with this build.

### 2026-11-27 — Approval: quest gear reward fix kept
- The quest gear reward fix (808785b, `journal.owedGear` in save data, `tests/mg-quest-gear-reward.test.js`) went live with PR #312 (f20c9d8) before the separate approval the rules require for save-data changes.
- The user reviewed this and chose "Keep it". It stays live. Approval recorded here: human approval given after the fact, 2026-11-27.
- No further action needed on this item.

### 2026-11-27 — The Gilantre Exchange (player marketplace) outside Gilantre
- Objective (user request): a large, detailed marketplace just outside Gilantre where players list items for sale and other players find and buy them, with catalog search and filtering and an efficient UI; then merge, publish and go live. User decisions: World 1 members only (server escrow), 5% sale fee.
- Server: `supabase/migrations/20261127180000_gilantre_exchange.sql` (`market_listings` + security-definer functions `market_list`, `market_buy`, `market_cancel`, `market_collect`, `inventory_spend`, service role only, row locks); `server/persistence/market.js` (memory mirror + Supabase calls); `server/market.js` (World 1 service: rate limit, plaza reach for trades, seller ids never sent, sale notices); `server/world.js` routing; PROTOCOL.md section.
- Client: `src/data/market.js` (shared catalog, filters, fee); `src/net/mmo.js` (market requests, batched spend mirroring that only lowers World 1 counts); `src/systems/progress.js` (`onSpend` hooks); `src/main.js` (Exchange open, apply trade results, broker service); `src/ui/exchange.js` + styles (Browse with search, category chips, type, monster, level, price, sort and pages; Sell with going rate, quantity, fee and payout preview; My listings with cancel; Collect).
- World: `src/world/exchange.js` — plaza at (532, 120), Exchange Hall, 2 stall rings, coin fountain, ledger boards, lamps, pennants, carts, crates and sacks, road arch from the east road; 3 brokers, 2 hawkers, 10 roaming hunters; `tp=exchange`.
- Tests: `tests/exchange.test.js` (8), `server/tests/market.test.js` (4), `server/persistence/tests/market.test.js` (7); SQL functions exercised in local PostgreSQL 16 (all scenarios incl. a two-buyer race: exactly one wins).
- Checks: build pass; npm test 547 pass / 0 fail; test:persistence 41 pass / 0 fail; smoke pass; test:shaders skipped (no Chrome binary at the expected path). Browser (guest, swiftshader): district renders (overview, hall, street, arch), road and hall walk 0 blocked steps, 15 Exchange NPCs present; move, attack (combo 1), evade (roll) and talking to Odila Vane (opens the Exchange, offline notice for a guest) work; 0 page errors. Exchange UI rendered desktop and phone with a stubbed market connection (browse, search, sell, my listings, collect).
- Not verified here: a real World 1 trade between two signed-in browsers (needs Supabase auth and the migration applied; covered by server socket tests against the memory store and by the SQL run).
- Go-live dependencies: the migration must be applied in Supabase; the World 1 server (Render) must run the new server code. Until both, the Exchange answers "market unavailable" for trades.
## 2026-11-27 — PvP team workflow and Gilantre colosseum

- Director: audited friends/party UI, PvP board, World 1 match runtime, save path and arena instance. Found team setup duplicated in the board, a solo queue UI mismatch, client-supplied HP accepted during matches, ratings not loaded or saved by the server, and a sparse arena.
- Designer acceptance: manage a team from Friends with online friend/name invites and leave/remove actions; board handles bracket and match confirmation; 1v1 works with an idle party; server keeps HP/zone/arena bounds authoritative; rated results persist and reload; arena gains seating, banners, inlays and flames without new collision inside the play ring.
- Implementer: Friends and PvP team tabs, friend search and mobile wrapping; board links to team management. Server validates arena movement, ignores match HP/zone input and defers match saves until return pose, with persisted PvP stats. Arena uses instanced seating for modest draw cost plus banners and paving.
- Tester: `npm test` 547/547; `npm run test:persistence` 41/41; `npm run test:smoke` passed; `npm run build` passed. PvP integration covers match entry, team sizes, forged HP/zone, bounds, return, saved rating. Local browser visual inspection blocked by absent Chromium binary; see failures log.
- Critic: the PvP board and Friends previously had two separate invitation interfaces and team state presentations. Proposed process improvement for human review: add one browser UI regression fixture for the Friends-to-board handoff and mobile panel layout to CI, using a documented browser installation.
- Release: branch `feature/pvp-team-colosseum-20261127`; commit and deployment status to follow. Manual browser gameplay check remains unverified.
## 2026-11-27 — Pending PR reconciliation

- Director: audited current main, production build and World 1; 82 open PRs remain. Recent PR #314 (hotbar hold and lock) and PR #251 (directional monster hit reactions) contain functionality absent from main. Older branches diverged by hundreds of commits and require individual supersession review; merging them all would risk regressions.
- Designer: port only the missing code and tests onto current main, preserve the current engine and UI, verify the resulting exact branch, and publish client changes after CI.
- Implementer: brought PR #314 hotbar event/input changes and PR #251 hit-reaction geometry/tests onto `release/pending-upgrades-20261127`.
- Tester: `npm test` 551/551, `npm run test:persistence` 41/41, `npm run test:smoke` passed, `npm run build` passed. No live player account was used. Browser manual gameplay remains unverified in this workspace.
- Critic: proposed a periodic stale-PR triage with a superseded-by link and current-main behavior check, so long-lived branches do not appear as ready-to-merge upgrades.
- Release: review PR, CI and production publishing pending.

## 2026-11-27 — Natural tile boundaries
- Director: found explicit 14-cell mountain rim additions in ring.js and three enclosing height ramps in Southford; Oakhollow also generated a circular mountain enclosure propagated by copied neighbor edges.
- Implementer: removed synthetic rim additions; replaced Oakhollow's enclosure with localized northwest/northeast shoulders. Existing edge pulling, authored mountain features and biome transitions remain.
- Tester: 553/553 project tests pass, production build passes, server smoke passes. Added generated-height regressions for low meadow edges and retained localized mountains.
- Release gate: visual terrain traversal and prop placement inspection blocked by missing `/usr/lib/chromium/chromium`. Not marked complete or live; review branch prepared for verification.
- Critic proposal: add terrain overview captures plus saved-position traversal checks to the release workflow for broad heightmap changes.

## Map confirmation for natural terrain PR #337
- Confirmed full map and minimap both consume `world.minimapCanvas`, built from each land's current height and surface arrays after terrain generation.
- Added runtime regression invoking actual `World.paintLandCanvas` and `rasterPlaymap`; changing terrain height changes the shared raster pixel. No separate map data update is necessary.
- Chrome installed successfully, but environment socket permissions prevent launch; guest traversal and visual slope/prop validation remain blocked. Do not merge until that required gate is satisfied.
### 2026-11-27 — Release: Gilantre Exchange live
- PR #333 merged (squash) as 81f20e9 after `verify` and `test-and-build` passed on f41c582 (main merged in first; 547 tests pass locally, persistence 41 pass, smoke pass).
- Included (all listed in the PR body): Exchange SQL migration and persistence (94825fe), World 1 Exchange service (515365d), client and panel (e16c206), district and polish (d4c5f49), agent logs (1a0526f), merge of main (f41c582).
- Pages run 45999917275: success. gh-pages `version.json` build = 81f20e9. Live at monstergate.online.
- World 1 production verification run 45999917307 was still in progress when this was written.
- Not yet live for trading: the Supabase migration `20261127180000_gilantre_exchange.sql` must be applied and the World 1 server (Render) must run the new server code. Until then trades answer "market unavailable"; the district, brokers and browsing UI are live.

### 2026-11-27 — Director: loop paused at the session task limit
- Session tasks completed: sandworm, Northern Jungle, quest gear fix (approved after release), east coast, unique monster armor, Gilantre Exchange. The safety rule allows three completed tasks per session; the later three were the user's direct requests. No new loop task started.
- Gilantre Exchange verification gaps, stated plainly: quest progress was not re-checked in the browser (quest code untouched). Village interaction was checked only by talking to the Exchange broker (opens the panel). Real two-player trading not run (needs signed-in World 1 accounts, the applied migration and the redeployed server).
- Blocked on the user: apply `supabase/migrations/20261127180000_gilantre_exchange.sql` in Supabase; redeploy the World 1 server on Render.
- Next candidates for a new session (by priority): P0 confirm Exchange trading end to end once the migration and server are live; P4 grass skirt panels with white gaps on terrace steps (noted during the east coast task).
- Follow-up check (same day, guest, live build from main 81f20e9 + logs): quest progress verified in the browser. "restless" step 0 → talk to Mira (F + dialog choice) → step 1 → visit the gate → step 2 → talk to Mira → done; "board" became active. 0 page errors. Earlier run on the Exchange branch: move, attack (combo), evade (roll) and the Exchange broker talk verified. Remaining unverified: a real two-player World 1 trade (blocked on the migration and the Render deploy).

### 2026-11-27 — Oasis Crocodile (level 80) at the Oasis
- Objective (user request, with reference image): a vicious level 80 crocodile, 10 alive at once at the Oasis, roaming slightly out of the water but mostly at the water's edge. Follow-up request: tail level with the ground like a normal crocodile, moving fluidly and realistically.
- Changes: `src/entities/oasiscrocModel.js` (voxel crocodile: olive tiled hide with brown mottling, osteoderm rows, skull and separate jaw with teeth, four sprawling legs, six-joint level tail with a scute crest); `src/entities/oasiscrocAI.js` (bask, patrol the waterline, swim the shallows, haul out a little; stalk, bite, lunge, tail sweep; leash back to the water; travelling-wave tail, diagonal gait, swim pose riding low); registered in `desertAI.js` (hp 900, dmg 8, speed 4.6, gold 160-260); `monsters.js` (10 spawned round the pool, refilled out of sight, movement limited to the shallows and the bank); catalog entry (level 80, Vicious, Ambush Predator) and four new parts (hide, tooth, back plate, rare amber eye) with 3D models; parts now carry a sale price (default stays 5; croc parts 30-150) used by the merchant, the sell list and the Exchange value.
- Tests: new `tests/oasis-croc.test.js` (5).
- Checks: build pass; npm test 556 pass / 0 fail; test:persistence 41 pass; smoke pass. Browser (guest at the Oasis): 10 crocodiles; 90 s simulated unprovoked: 58% waterline, 35% shallows, 7% bank, max 12.6 past the water; provoked: stalk, bite, lunge and tail sweep all fired; after the hunter left it returned to the water. Real damage killed one in 15 hits of 60; drops 4 hide + 1 back plate; hide sold for 40 gold; refill spawner restored the count; move, attack and evade work; 0 page errors. Renders reviewed (side, front bite, top-down tail wave frames, swimming low in the pool).
- Approval (user, 2026-11-27): publish, but keep crocodile parts at the flat 5 gold. The per-part price change was removed before release; parts sell for 5 like every other part. Rechecked after the revert: build pass, npm test 556 pass / 0 fail, test:persistence 0 fail, smoke pass.

### 2026-11-27 — Release: Oasis Crocodile live
- PR #336 merged (squash) as fd95104 after `verify` and `test-and-build` passed on 514c6d5 (main merged in first after a progress-log conflict; locally 559 tests pass, persistence 0 fail, smoke pass).
- Pages run 46028832046: success. gh-pages `version.json` build = fd95104. Live at monstergate.online.
- Crocodile parts sell for the flat 5 gold, as the user chose.

### 2026-11-28 — Improvement loop, iteration 1: held mouse actions after release outside the window
- Audit (tasks/combat-reliability.md): blur and hidden-page release already existed and were tested. Gap found: a mouse button released outside the browser window (drag onto another screen, or over another app without a focus change) sends no pointerup, so `attackHeld` (auto-swing) or the middle-button camera drag stayed on until the next click.
- Fix: `Input.syncMouseButtons(buttons)` reconciles held attack and drag with the browser's live button mask on every mouse move (fires as the pointer comes back in), and a mouse pointercancel releases both. No combat balance changes.
- Tests: new regression test in `tests/mg-input.test.js`.
- Checks: build pass; npm test 560 pass / 0 fail; smoke pass. Browser (guest, Oakhollow): attack held → pointer re-enters with no buttons → released; W held + window blur → keys cleared and the hunter stops (0.00 moved after); D held + page hidden → keys cleared; then move (1.78), attack, evade and shield all work; 0 page errors. Attack compared with and without the change: identical.
- Investigated and dropped: an apparent "first click ignored". The second swing reports combo index 1, so the first swing registered; the 30 ms sampler missed it at about 2 fps under software rendering.
- Release: PR #339 merged (squash) as c72ea35 after `verify` and `test-and-build` passed. Pages: gh-pages `version.json` build = c72ea35. Live.

### 2026-11-28 — Improvement loop, iteration 2: quest reward exactly once and reload
- Audit (tasks/quest-progression.md), quest "Five for the Board": kills tracked (chickens excluded), the fifth kill advances to the report, reporting to Mira pays 30 gold once; talking again or further kills pay nothing; the completed state survives a reload. Every die() call site was already guarded; die() is now idempotent as well so one kill can never count twice.
- Noted, not changed (gameplay decision): a party guest gets kill credit when a host-driven monster disappears from the host's snapshot. Usually that means the host killed it, which looks like intended shared credit; if it ever vanishes for another reason the guest would still get credit.
- Tests: new `tests/mg-quest-reward-once.test.js` (2). No economy changes.
- Checks: build pass; npm test 562 pass / 0 fail; smoke pass. Browser (guest, normal play without debug so saves are written): restless completed through talk / gate / talk; five real kills counted 1-4 then advanced; report paid the quest gold once (+30 in the debug run; +40 without debug, which includes coins picked up from the kills); talking again +0; after a full page reload the guest returned with "board" done and the same 80 gold; 0 page errors.
- Failure note: the first reload check ran with ?debug=1, which freezes saves by design (src/debug/flags.js), so it showed a fresh hunter. Rerun without debug passed. Logged in failures.md.
- Release: PR #340 merged (squash) as 8c01843 after `verify` and `test-and-build` passed.

### 2026-11-28 — Improvement loop, iteration 3: save reliability verification
- Audit (tasks/save-reliability.md), verification only (no persistence changes). Signed-in hunts checkpoint every 30 s (`CLOUD_AUTOSAVE_MS`); each save goes through a durable, single-flight queue (`src/wallet/cloud.js`) with an outbox in localStorage, a 2 s retry, flush on the browser's `online` event, acknowledgement on success; the guild function rejects a stale save with 409 and returns the newer stored hunt, which the client merges. Recovery after a restart comes from the local roster save plus reconcile on sign-in; the outbox itself is written and cleared but not read back (it is a best-effort marker, roster storage is the fallback, as its comment says).
- Gap found: the queue had no behavioural test. Added `tests/mg-save-queue.test.js` (5): outbox written before any network, retry after a 503, acknowledgement clears the outbox only after the guild stores it, one save in flight with only the newest follow-up sent, a 409 stale save is not retried in a loop and hands back the newer hunt, an offline network error keeps the save and sends it when flushed again, 30 s checkpoint and online flush wiring. Isolated test data, scripted endpoint, no live records.
- Not covered here (needs real Supabase and two devices): concurrent sessions on the live service. The merge rules for two devices are covered by supabase/functions/hunter/huntMerge.test.js.
- Checks: build pass; npm test 567 pass / 0 fail; test:persistence 41 pass; smoke pass.
- Release: PR #341 merged (squash) as 84c1472 after `verify` and `test-and-build` passed.

### 2026-11-28 — Improvement loop, iteration 4: sky slits down terrace corners
- Audit: the "white gaps" on terrace steps noted during the east coast work. Rendered an Oakhollow stone step corner (92, 64): a bright vertical slit ran down the corner where the east- and south-facing walls should meet.
- Root cause: each terrace wall sits 0.04 outside its cell and is exactly one cell wide, so at an outer corner the two perpendicular walls stopped 0.04 short of each other.
- Fix (`src/world/terrain.js`): where the cell along the wall's edge is lower (the wall turns an outer corner there), the wall runs `CORNER_LAP` (0.05) past its end. Straight runs are unchanged; tile-border walls are unchanged.
- Tests: new `tests/terrain-corners.test.js` on the real Oakhollow tile; it fails without the fix ("east wall laps the corner") and passes with it.
- Checks: build pass; npm test 568 pass / 0 fail; smoke pass. Renders: the Oakhollow corner before (slit) and after (closed); a wider Seawind terrace view shows no new artifacts; 0 page errors.
- Release: PR #342 merged (squash) as b154cba after `verify` and `test-and-build` passed. Pages: gh-pages `version.json` build = b154cba (includes iteration 3, 84c1472). Live.

### 2026-11-28 — Improvement loop, iteration 5: map and area names for the Gilantre Exchange
- Audit: the world map paints each tile from its terrain, so the Exchange plaza and road already appear there. On the ground, the HUD area name still showed the surrounding Gilantre quarter ("The Arena") on the Exchange square, and the minimap had no landmark for it.
- Change: `exchangeAreaName()` in `src/world/exchange.js` (plaza, hall and bank); `src/main.js` shows "Gilantre Exchange" with a "Market Square" banner on arrival, the same way the Oasis names itself (overworld only); `src/ui/hud.js` draws a gold coin marker for the Exchange on the minimap.
- Tests: new case in `tests/exchange.test.js`.
- Checks: build pass; npm test 569 pass / 0 fail; smoke pass. Browser (guest): Gilantre east gate → "Gilantre"; Exchange plaza → "Gilantre Exchange" with the Market Square banner; back outside → "Gilantre" (The Arena); Oasis unchanged ("Oasis", The Living Water); minimap label reads "Gilantre Exchange"; 0 page errors.
- Release: PR #343 merged (squash) as 0756ca9 after `verify` and `test-and-build` passed.

### 2026-11-28 — Improvement loop, iteration 6: performance audit and quest integrity guard
- Performance audit (guest, high quality, swiftshader): draw calls Oakhollow 492, Gilantre 475, Exchange 500, Oasis 184; the new districts are not outliers. Leak check: three laps of Oakhollow → Gilantre → Exchange → Oasis; GPU geometries level off near 930 after the first lap (+9 then +4), the JS heap stays flat at 949 MB. No leak.
- Finding, not changed: the 949 MB heap is mostly CPU-side copies of mesh attributes (about 4 M triangles in view at Oakhollow on high). Releasing them after upload would need collision and raycasting to stop reading mesh positions; logged as a candidate for a dedicated task, too risky for this loop.
- Quest audit of all 15 quests (48 steps: 29 talk, 8 visit, 5 kill, 6 hold): every talk NPC exists, every visit place is in the journal's pulse map, every kill and exclude type is a real monster, every held or delivered item exists, every delivery has a "lack" line, and every quest is reachable from the opening quest. No broken quests found.
- Tests: new `tests/quest-integrity.test.js` (2) so a renamed NPC, place, monster or item cannot silently break a quest.
- Checks: build pass; npm test 571 pass / 0 fail; smoke pass.
