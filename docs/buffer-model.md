# Buffer model

This document describes the inventory-first trade-buffer extension to the
BarterChain matching engine.

## Why a buffer

The pure peer-to-peer multi-hop barter model has a structural weakness:
**atomicity**. A four-person chain only completes if all four parties
deliver their items at roughly the same time. One drop-out collapses the
chain. Coordinating that across strangers, calendars, and shipping
providers is the dominant source of failure in real barter platforms.

Introducing a physical buffer (a warehouse) inverts the model:

1. Participants deposit items into the buffer **before** any chain is
   matched.
2. While items sit in the buffer, the matching engine continuously
   evaluates the inventory for new viable cycles.
3. When the engine finds a closing cycle, the platform ships every item
   directly from the buffer. No party waits on another.

This trades distributed peer-to-peer logistics for a centralised
single-warehouse handoff. Atomicity becomes trivial because every chain
participant is "pre-committed": their item is already on hand when the
chain is formed.

A second-order effect is that storage fees create a real incentive for
participants to be flexible with match criteria. A user paying daily
storage on a deposited item will accept a longer chain, a less ideal
match, or a more distant counterparty rather than keep paying. That
flexibility is itself liquidity, without changing the matching algorithm.

## State machine

Every deposited listing is tracked through a small lifecycle:

```
   listed --(deposit)--> deposited --(ship)----> shipped
       \                       \--(withdraw)--> withdrawn
        \--(withdraw)----------------------------> withdrawn
```

Allowed transitions are encoded in `lib/buffer.ts`:

- `listed → deposited` — item arrives at the warehouse
- `listed → withdrawn` — listing pulled before any deposit
- `deposited → shipped` — chain closed, item shipped to its new owner
- `deposited → withdrawn` — owner pulls the item back out

Terminal states (`shipped`, `withdrawn`) accept no further transitions.

## Fee model

Storage is priced by size class, currently a flat daily rate per class:

| Class | Daily rate (EUR) | Example |
|-------|------------------|---------|
| S     | 0.50             | watch, lens, single book |
| M     | 1.00             | espresso machine, jacket, board game |
| L     | 2.50             | bicycle, monitor, speaker pair |
| XL    | 5.00             | guitar, large appliance |

The accrued fee is computed as `dailyRate × elapsedDays` between
`depositedAt` and either the current time or `releasedAt` if the listing
has already left the buffer. `calculateAccruedFeeEur` in `lib/buffer.ts`
is the canonical implementation.

The pricing table is intentionally simple. Production would likely
introduce minimum stay periods, late fees that ramp with time in storage,
and per-region rate variations.

## API surface

Two additive endpoints drive the lifecycle:

- `POST /api/listings/:id/deposit` — body `{ sizeClass, note? }`. Marks
  an existing listing as deposited and stamps `depositedAt`. Returns the
  updated listing. Rejects when the listing is missing (`404`), the size
  class is invalid (`400`), or the listing is already deposited (`409`).

- `POST /api/listings/:id/release` — body `{ reason, note? }` where
  `reason` is `"shipped"` or `"withdrawn"`. Marks the listing as released
  and stamps `releasedAt`. Returns the listing plus the final
  `accruedFeeEur`. Rejects when the listing is missing (`404`), has no
  buffer state (`409`), or the reason is invalid (`400`).

The matching engine has an opt-in inventory mode:

- `GET /api/match?inventoryOnly=true` — restricts the matching pool to
  listings whose current buffer status is `deposited`. Demo listings are
  excluded in this mode because they exist only as conceptual inventory.
  Useful for closing real chains against actually-on-hand items rather
  than open intent listings.

## Operator dashboard

`/admin/buffer` (gated by the same `ADMIN_SIGNALS_ACCESS_KEY` as
`/admin/signals` in production) shows current inventory, days each item
has been in storage, accrued fees per item, total accrued fees, and the
size-class mix. The page is read-only; deposits and releases happen
through the API.

## Trade-offs and known limits

- **Single warehouse model.** Cross-warehouse routing is out of scope.
  Multi-region deployments would need a network of buffers and
  inter-warehouse routing logic.
- **No automatic settlement integration.** The accrued fee is computed
  on release but there is no payments integration here. Production would
  bill via Stripe / SEPA at release time.
- **Withdrawal abuse not constrained.** Anyone can withdraw at any time
  while deposited. A real product would impose a minimum-stay period and
  charge a withdrawal fee.
- **No insurance or condition tracking.** The buffer concept assumes
  someone (warehouse staff) verifies condition on receipt and can match
  it against the listing description. That workflow is not modelled in
  code.
- **No commerce around inventory.** The buffer can hold items that are
  not currently matchable (no possible chain). That long-tail dead
  inventory is a real cost; production would need a "release back to the
  owner after N days unmatched" workflow.

These limits are deliberate. The goal of this module is to demonstrate
how the matching engine slots into an inventory-backed trade lifecycle,
not to ship a full warehouse-management system.
