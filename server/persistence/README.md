# Character persistence

Self-contained module the world server imports. It does not open sockets, tick
the world, or talk to the browser. Guests are never written here — only
Supabase Auth user ids (`auth.users`).

## Install

From this folder (world server / MG Servers):

```bash
npm install
```

`@supabase/supabase-js` is the only runtime dependency. Unit tests use the
in-memory adapter and do not need a database:

```bash
node --test server/persistence/tests/*.test.js
```

## Env

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | for live saves | Project URL (`https://….supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | for live saves | Service role. Bypasses RLS. **Never** ship this to the client. |
| `MG_PERSISTENCE_ADAPTER` | no | `memory` (local/dev tests), `noop` (discard writes), or omit to use Supabase when the two keys above are set. |

Copy `.env.example`. Do not commit secrets.

## Migration to apply

`supabase/migrations/20261113150000_characters.sql`

```bash
supabase db push
# or, against a remote DB:
psql "$DATABASE_URL" -f supabase/migrations/20261113150000_characters.sql
```

Table `public.characters`: one row per `auth.users` id, unique hunter name,
jsonb `state` plus typed `zone/x/y/z/gold/last_seen/version`. RLS lets an
authenticated player **select their own row**. Inserts, updates, and deletes
are granted only to `service_role`.

## How the world server should call it

```js
import { openPersistence } from './persistence/index.js';

const persist = await openPersistence();
persist.installShutdownHandlers(); // flushes on SIGTERM / SIGINT

// On auth (after the world server verifies a Supabase JWT):
let character = await persist.loadCharacter(userId);
if (!character) {
  character = await persist.createCharacter(userId, name);
}
// Optional, once: fold a browser hunt into this row (clamped).
// await persist.importLocalSave(userId, localSaveJson);

// During play, after the authoritative state changes:
await persist.saveCharacter(userId, state); // debounced / batched

// On disconnect:
await persist.saveCharacter(userId, state, { immediate: true });
// or: await persist.flush(userId);

// On process stop, installShutdownHandlers already calls flushAll().
```

Periodic saves: the queue also flushes every 30s (`intervalMs`). Override with
`createPersistence({ debounceMs, intervalMs, adapter })`.

Optimistic versions: `loadCharacter` / `createCharacter` remember `version`.
Each save increments it. A stale write (`expectedVersion` mismatch) throws
`PersistenceError` with `code: 'conflict'` and the current row. Retry after
reloading; do not blindly overwrite.

Transient database errors retry with backoff (200ms, 400ms, 800ms, 1600ms).
Validation, unique-name, and version-conflict errors are not retried.

## API

| Method | Result |
| --- | --- |
| `loadCharacter(userId)` | Character view or `null` |
| `createCharacter(userId, name, { look, state })` | New row, version `1` |
| `saveCharacter(userId, state, { immediate, expectedVersion })` | Queued `{ ok, queued }` or the saved row when `immediate` |
| `importLocalSave(userId, localSaveJson)` | Clamped import; rejects if `imported_at` is already set |
| `flush(userId)` / `flushAll()` | Drain the save queue |
| `installShutdownHandlers()` | SIGTERM + SIGINT → `flushAll()` |
| `close()` | Flush, drop handlers, stop the interval |

Adapters: `createMemoryAdapter()`, `createNoopAdapter()`, and (lazy)
`openPersistence()` → Supabase when env is set.

Thrown errors are `PersistenceError`. Import `PersistErrorCodes` from this
module and switch on `err.code` — do not string-match messages except
`name_taken`, whose text is always `That hunter name is already taken.`

```js
import { PersistErrorCodes, PersistenceError } from './persistence/index.js';

try {
  await persist.createCharacter(userId, name);
} catch (err) {
  if (err instanceof PersistenceError && err.code === PersistErrorCodes.NAME_TAKEN) {
    // ask the player for another name
  }
}
```

| `PersistErrorCodes` | `code` | When |
| --- | --- | --- |
| `INVALID` | `invalid` | bad UUID, name, or payload |
| `NOT_FOUND` | `not_found` | save before create |
| `CONFLICT` | `conflict` | stale `version` |
| `NAME_TAKEN` | `name_taken` | unique hunter name (`createCharacter` or rename). Postgres `23505` on `characters_name_lower_idx` maps here, not to `unavailable`. |
| `ALREADY_IMPORTED` | `already_imported` | local save already folded in |
| `UNAVAILABLE` | `unavailable` | database / network after retries |

## State shape

Field names match `src/systems/progress.js` so a guest or account hunt can be
imported as-is. Typed columns are derived from the same blob.

```js
{
  name, look,
  gold,
  xp: { strength, agility, stamina, mining, fishing, cooking, woodcutting, firemaking },
  goods, materials, stock,   // inventory / bag
  storage,                   // bank crate (30 slots)
  armor, weapon, ammo, quiverLoad,  // equipment
  skills, seen, kills, crafted, portals,
  journal: { quests, activity, challengeNew },
  hunter: { x, y, z, yaw, hp, mana, stamina, rank, quest, realm },
  last_seen, importedAt, savedAt
}
```

Writes also accept aliases used by an MMO tick:

- `position: { zone, x, y, z, yaw }` → `hunter.realm` / `hunter.x|y|z`
- `inventory: { goods, materials, stock }`
- `equipment: { armor, weapon, ammo, quiverLoad }`
- `bank` → `storage`
- `quests` → `journal.quests`

`importLocalSave` also unwraps a roster-shaped guild record (`{ roster: { last, chars: [{ name, look, hunt }] } }`) and takes the last-played character.

Import clamping (anti-cheat): unknown ids dropped; XP capped at the level-99 curve; gold ≤ 1_000_000; stacks ≤ 99_999; kills ≤ 10_000 per type; position boxed to the world; skill points spent cannot exceed points earned from kills (same 2 + floor(slayer/8) rule as the client). A second import for that user is rejected.

## Local adapters

```js
import { createPersistence, createMemoryAdapter, createNoopAdapter } from './persistence/index.js';

const tests = createPersistence({ adapter: createMemoryAdapter(), intervalMs: 0 });
const dryRun = createPersistence({ adapter: createNoopAdapter(), intervalMs: 0 });
```
