# BarterChain MVP

[![Vercel](https://vercelbadge.vercel.app/api/omerbakalovic/barterchain-mvp)](https://barterchain-mvp.vercel.app)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
[![GitHub Stars](https://img.shields.io/github/stars/omerbakalovic/barterchain-mvp?style=social)](https://github.com/omerbakalovic/barterchain-mvp)

> Give what you do not use. Get what you actually want.

BarterChain is an experimental platform for building multi-hop barter loops.
Instead of waiting for one perfect direct swap, the product aims to connect several
people into a single trade chain where each person receives something useful.

The current repository contains a Next.js MVP with:

- a product landing page
- a real listing creation flow
- a scored barter-chain search using `have / want`
- a chain proposal and acceptance flow for real trade coordination
- a beta waitlist form
- Supabase-backed persistence when env vars are present
- local JSON fallback storage for development
- basic PWA metadata through `manifest.ts`
- an internal signals dashboard at `/admin/signals`

## Quick Start

```bash
git clone https://github.com/omerbakalovic/barterchain-mvp.git
cd barterchain-mvp
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
If that port is already in use, Next.js will pick the next available one.

## Environment

Create `.env.local` from `.env.example` if you want Supabase persistence:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
MATCH_API_ENGINE=legacy
ADMIN_SIGNALS_ACCESS_KEY=...
```

Expected tables:

```sql
create table waitlist_entries (
  id bigint generated always as identity primary key,
  email text not null,
  use_case text not null default '',
  created_at timestamptz not null
);

create table listings (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  value_estimate numeric not null,
  city text not null,
  trust_score numeric not null,
  gives text not null,
  wants text[] not null,
  created_at timestamptz not null
);
```

Without Supabase env vars, waitlist entries are stored in `data/waitlist.json` and listings are stored in `data/listings.json`.
`MATCH_API_ENGINE` is optional and keeps `/api/match` on the legacy matcher unless you set it to `graph`.
The internal dashboard reads waitlist data plus logged match requests from `data/match-requests.json`.
In local development, `/admin/signals` is open. In production, access it with `/admin/signals?key=...`
after setting `ADMIN_SIGNALS_ACCESS_KEY`.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run test
```

## Current MVP Notes

- `app/page.tsx` contains the landing experience, listing form, and chain lab.
- `app/api/listings/route.ts` validates and stores barter listings.
- `app/api/listings/[id]/deposit/route.ts` and `.../release/route.ts` drive the trade-buffer lifecycle for stored listings.
- `app/api/match/route.ts` exposes ranked barter chains and includes stored listings when available; pass `?inventoryOnly=true` to match only against listings currently held in the buffer.
- `app/api/chain-proposals/route.ts` stores chain proposals and blocks overlapping active listings.
- `app/api/waitlist/route.ts` validates and stores waitlist submissions.
- `app/admin/signals` and `app/admin/buffer` provide read-only operator dashboards (gated by `ADMIN_SIGNALS_ACCESS_KEY` in production).
- `lib/listing-store.ts` handles Supabase or local listing persistence.
- `lib/buffer.ts` defines the buffer state machine, size-class pricing, and fee calculation (see [docs/buffer-model.md](docs/buffer-model.md)).
- `lib/chain-proposal-store.ts` persists proposal lifecycle state separately from matching.
- `lib/match-request-store.ts` logs match exploration requests locally for signal analysis.

## License

MIT


