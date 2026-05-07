# AGENTS.md

## Project Overview
BarterChain is a Next.js 15 + TypeScript application for multi-hop barter matching.

Current project areas:
- landing page and waitlist
- simple matcher and scoring
- API routes
- future graph-based matching engine

## Tech Stack
- Framework: Next.js 15
- Language: TypeScript
- UI: Tailwind CSS + shadcn/ui
- Testing: Vitest
- Linting: ESLint

## Repository Structure
Important directories:
- `app/` → Next.js app router pages and API routes
- `lib/` → core business logic
- `tests/` → automated tests
- `docs/` → architecture and implementation docs
- `scripts/` → helper and benchmark scripts
- `data/` → local development JSON storage and demo data

## General Coding Rules
- Always use TypeScript.
- Prefer small, composable modules over large files.
- Keep business logic out of React components.
- Keep matching logic independent from UI code.
- Do not introduce large dependencies unless clearly justified.
- Preserve existing functionality unless the task explicitly requests a replacement.
- Prefer deterministic algorithms over vague AI heuristics for core matching behavior.
- Add comments only where they improve clarity.
- Keep naming explicit and readable.

## Matching Engine Rules
For graph-based barter matching:
- Put all new graph matching logic in `lib/matching-engine/`
- Do not replace `lib/barter-match.ts` immediately
- Build the new engine alongside the existing matcher first
- Separate responsibilities into distinct modules:
  - graph construction
  - candidate filtering
  - cycle detection
  - cycle scoring
  - non-overlapping cycle selection
- Support deterministic scoring and ranking
- Return structured outputs with score and ranking reasons
- Prefer exact/normalized matching first
- Treat AI as a later enhancement layer for:
  - synonym resolution
  - item normalization
  - category inference
  - fraud/risk scoring

## Performance and Scale
When implementing matcher logic:
- Prefer algorithms that remain practical for 50+ listings and beyond
- Add benchmark scripts for synthetic large datasets when performance work is requested
- Document scaling path to a future Python/NetworkX service if needed

## Testing Requirements
All matcher or API changes should include tests where practical.

Before completing a task, always run:
- `npm run lint`
- `npm run test`
- `npm run build`

If a new algorithm or performance-sensitive feature is added:
- add or update tests in `tests/`
- add a benchmark script in `scripts/` when relevant

## Documentation Requirements
If architecture or algorithm behavior changes:
- update `README.md` when user-facing setup changes
- add or update docs in `docs/`

## Safe Change Policy
- Avoid unnecessary refactors outside the requested scope
- Avoid breaking public API shapes unless explicitly requested
- Prefer additive changes over destructive rewrites
- If migration is needed, document migration steps before switching callers to the new implementation

## Definition of Done
A task is done when:
- requested code is implemented
- lint passes
- tests pass
- build passes
- documentation is updated when relevant
- benchmark exists when performance/scaling work was requested