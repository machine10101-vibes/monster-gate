# Progression and mining-site tuning

## Shared skill curve

All nine trainable skills use the shared XP threshold table in `src/data/gathering.js`. The cumulative level thresholds are now 15% higher than the previous curve. XP awards remain unchanged, so every activity takes a little longer to advance a level without changing the relative value of individual training actions. Existing saved XP is retained and levels are recalculated against the shared thresholds.

## Ore seams

Mineable nodes are placed in irregular groups rather than evenly spaced rings. Greyrock uses a copper seam cluster plus a separate iron node; Deepwell groups each ore type into close pairs; Cinderfall and Glimmerfrost each use compact three-node seams. This keeps nodes close enough to read as natural deposits while retaining room to approach and mine them.
