# Matching Engine Architecture

## Purpose
This document describes the additive graph-based barter matching engine for BarterChain.

The engine lives in `lib/matching-engine/` alongside the current `lib/barter-match.ts` implementation.
The legacy matcher remains available and is still the safe fallback path while rollout validation continues.

## Problem
Direct barter is limited by the double coincidence of wants problem:

- User A wants something from User B
- User B does not want what User A offers

BarterChain solves this by finding closed directed trade loops involving multiple participants.

## Engine Structure
The engine is split into deterministic modules:

- `types.ts` -> engine input/output contracts
- `normalize.ts` -> normalized string comparison helpers
- `graph.ts` -> graph construction from listings
- `cycles.ts` -> simple directed cycle detection up to length 8
- `scoring.ts` -> deterministic cycle scoring
- `selection.ts` -> best non-overlapping cycle set selection
- `engine.ts` -> orchestration entry point
- `adapter.ts` -> `BarterListing` to engine-listing mapping
- `compat.ts` -> graph results projected back to the legacy chain response shape

## Listing Model
The graph engine uses a UI-independent listing model:

```ts
type MatchingEngineListing = {
  id: string
  ownerId: string
  offer: string
  wants: string[]
  city?: string
  trustScore?: number
  estimatedValue?: number
}
```

## Graph Construction
Each listing becomes a node.
There is a directed edge `A -> B` when:

- `A.ownerId !== B.ownerId`
- `A.id !== B.id`
- one of `A.wants` exactly matches `B.offer` after normalization

Adjacency is sorted by listing id so traversal order is deterministic.

## Cycle Detection
Cycle detection currently uses deterministic DFS with canonicalization rules:

- simple cycles only
- maximum cycle length is configurable, defaulting to 8
- duplicate cycles are removed by canonical rotation
- traversal only expands nodes whose ids are lexicographically `>=` the start id, which prevents repeated discovery of the same cycle in different rotations

This is practical for current MVP-scale graphs and keeps implementation simple.
For significantly larger networks, this can evolve toward Johnson's algorithm or a Python/NetworkX service.

## Scoring
Each graph cycle is scored deterministically using:

- shorter cycle preference
- same-city overlap relative to the starter
- average trust score
- value spread penalty / balance bonus

Output includes score reasons so ranking is inspectable.

The compat layer then re-scores projected cycles with the legacy `BarterChain` scoring contract so current API consumers can still compare equivalent response shapes.

## Non-overlapping Selection
After scoring, candidate cycles are passed to a deterministic set-packing style selector.
The selector chooses the best non-overlapping set by maximizing:

1. total score
2. total number of covered listings
3. deterministic lexical tie-break order

Current selection uses exact backtracking with pruning over scored candidate cycles.
That is acceptable for current candidate volumes and benchmark targets.

## BarterListing Adapter
The adapter lives in `lib/matching-engine/adapter.ts`.

Current field mapping:

- `BarterListing.id` -> `MatchingEngineListing.id`
- `BarterListing.trader` -> `MatchingEngineListing.ownerId`
- `BarterListing.gives` -> `MatchingEngineListing.offer`
- `BarterListing.wants` -> `MatchingEngineListing.wants`
- `BarterListing.city` -> `MatchingEngineListing.city`
- `BarterListing.trustScore` -> `MatchingEngineListing.trustScore`
- `BarterListing.estimatedValue` -> `MatchingEngineListing.estimatedValue`

Fallback behavior:

- blank `trader` falls back to `id` for `ownerId`
- blank `city` becomes `undefined`
- `wants` values are trimmed and empty entries are dropped
- non-finite `trustScore` or `estimatedValue` values become `undefined`

Fields such as `category`, `condition`, and `shipping` remain on the original `BarterListing`
objects and are reattached when API responses are projected back into the legacy chain shape.

## API Modes
`/api/match` supports controlled engine routing:

- `engine=legacy` keeps the current matcher
- `engine=graph` uses the graph engine through the adapter and compat layer
- `engine=compare` returns an explicit comparison payload for side-by-side evaluation
- `MATCH_API_ENGINE=graph` can opt the route into graph mode by default

Normal `legacy` and `graph` responses keep the existing frontend-oriented chain payload shape.
Compare mode is intentionally additive and returns:

- per-engine candidate-chain counts
- per-engine selected non-overlapping chain counts
- average candidate and selected scores
- execution time
- summary metrics for coverage, disjoint chain count, chain quality, trust average, and value fairness
- limited candidate and selected chain samples
- key diff summaries, including chain membership, score drift, and metric winners

## Evaluation Fixtures And Script
Representative datasets live in `data/matching-evaluation/`.
The suite now mixes request-level parity checks with marketplace-wide selection stress cases.
Current fixture themes include:

- balanced local-market loops
- dense overlapping cycles around premium listings
- competing chains sharing the same high-value inventory
- trust-score conflicts
- city mismatch and proximity tradeoffs
- value imbalance scenarios
- sparse graphs with dead ends
- larger synthetic networks with mixed-quality matches

Each fixture now documents what it is testing and usually contains both:

- request-scoped scenarios, which keep `legacy` and `graph` comparable through the compat layer
- a marketplace-wide scenario, which compares whole-market selection using legacy scoring versus graph-native scoring

Run the comparison script with:

```bash
npm run evaluate:matching-engines
```

The script reports, per fixture:

- request-scoped parity results
- marketplace-wide selected-set differences
- coverage
- number of disjoint chains selected
- average chain quality
- trust average
- value fairness
- where graph clearly outperforms legacy, where it ties, and where it does not

The request-scoped comparison still applies the same non-overlap selector to each engine's scoped chain set.
That keeps compare-mode diagnostics apples-to-apples even though the legacy matcher does not expose a native selection phase.
The marketplace comparison is separate on purpose because that is where graph-native selection meaningfully diverges.

### Metric Definitions
The comparison layer uses neutral summary metrics for selected chains:

- `coverage`: percent of fixture listings used by the selected disjoint chain set
- `disjointChainCount`: number of selected non-overlapping chains
- `trustAverage`: average trust score across selected listings
- `valueFairness`: average `min(value) / max(value)` per selected chain, scaled to 0-100
- `averageChainQuality`: composite score combining trust, value fairness, city coherence, and shorter-chain efficiency

These metrics are designed to compare selected outcomes, not to duplicate either engine's internal scoring formula.

## Graph Vs Legacy Tradeoffs
Legacy matcher strengths:

- simple and easy to reason about
- already aligned with the existing API response shape
- low migration risk because it is the current baseline
- can still be preferable on narrow local-market cases where users mostly care about compact same-city loops

Legacy matcher weaknesses:

- tightly coupled to demo-listing globals unless wrapped
- candidate discovery is request-centric rather than graph-centric
- harder to extend toward richer graph analysis and scaling work
- whole-market optimization is indirect because it depends on per-request chain enumeration plus post-selection

Graph engine strengths:

- clear separation between graph construction, cycle discovery, scoring, and selection
- deterministic candidate enumeration with explicit engine-level scoring reasons
- easier path toward stronger filtering, graph partitioning, Johnson-style enumeration, or service extraction
- whole-market selection can prefer higher-trust and fairer disjoint chain sets even when the obvious request-scoped answer looks the same

Graph engine weaknesses:

- request-scoped compare mode can understate its benefits because compat projection intentionally normalizes behavior
- different internal scoring means ranking drift is expected unless explicitly normalized
- candidate volume can grow faster on dense datasets and needs fixture-based monitoring
- compatibility currently depends on an adapter plus projection layer, which adds rollout surface area

## Safe Rollout Criteria
Do not remove legacy mode during rollout.
Switch the default API behavior from legacy to graph only after all of the following are true:

1. `npm run evaluate:matching-engines` shows graph beating or tying legacy on coverage across all control fixtures and winning coverage on most hard marketplace fixtures.
2. Graph does not lose `averageChainQuality` on any high-priority control fixture, especially the regional tradeoff and sparse dead-end scenarios.
3. On the hard overlapping and synthetic fixtures, graph beats legacy on at least one of `trustAverage` or `valueFairness`, and any regressions are documented.
4. Request-scoped compare scenarios remain parity or every divergence has a clear explanation and an accepted rollout note.
5. Graph execution time remains within an agreed budget versus legacy for current MVP-scale datasets.
6. `npm run lint`, `npm run test`, and `npm run build` remain green with compare mode enabled.

Recommended rollout sequence:

1. Keep `MATCH_API_ENGINE` unset so legacy stays default.
2. Use `engine=compare` in internal testing to collect request-level parity data without affecting callers.
3. Track `npm run evaluate:matching-engines` after every fixture change so marketplace-wide wins and losses stay visible.
4. Enable `MATCH_API_ENGINE=graph` only in non-production environments first.
5. Flip the default only after graph wins are repeatable on the hard fixtures and legacy still remains available as a fast rollback path.

## Validation
Current validation expectations:

- simple cycle detection tests
- overlapping-cycle selection tests
- compatibility projection tests
- compare-mode API tests
- fixture-based evaluation script with marketplace diagnostics
- synthetic benchmark script in `scripts/benchmark-matching-engine.ts`

## Scaling Path
If the candidate cycle count grows too much, the likely next steps are:

- stronger candidate filtering before DFS
- Johnson-style cycle enumeration
- graph partitioning by city or category
- Python service extraction with NetworkX or OR-tools for larger optimization problems
