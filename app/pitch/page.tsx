import type { Metadata } from "next";
import Link from "next/link";

import { CycleVisualization } from "@/components/pitch/cycle-visualization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "BarterChain · the pitch",
  description:
    "Multi-hop cycle matching as an open-source primitive. The architecture, where it applies, and what is left to prove.",
};

const verticals = [
  {
    name: "Kidney exchange",
    why: "The textbook fit. Patients have willing-but-incompatible donors; cycles let everyone get a compatible match. UNOS, NHS, and other registries already use this exact algorithm. Heavily regulated medical domain.",
    moat: "Regulation + clinical integration",
    realism: "Proven, but high barrier to entry as an outsider.",
  },
  {
    name: "Real estate property chains",
    why: "UK property chains routinely break at 4–5 nodes. Matching engine plus a deposit-style buffer for contingent contracts could compress chain assembly time and reduce drop-out cascade.",
    moat: "Per-transaction value is high (€100K–€1M+). Even 10% efficiency gain is sellable.",
    realism: "Sales cycle is brutal; partnership with conveyancing networks needed.",
  },
  {
    name: "Vacation / timeshare swap",
    why: "HomeExchange uses credits to abstract the matching problem. Direct cycle matching could expand inventory utilization without changing the credit economy. Coordination cost is low (just dates + keys).",
    moat: "None inherent. Existing players have decades of inventory headstart.",
    realism: "Crowded, weak differentiation alone.",
  },
  {
    name: "Collector verticals (cameras, keyboards, vinyl, board games)",
    why: "Owners want specific items, cash sale doesn't fully satisfy 'I want THAT lens for THIS body'. Communities exist on Reddit, Discord, Discogs. Multi-hop unlocks trades pair-wise can't reach. Buffer model fits high-value items justifying warehousing.",
    moat: "Vertical depth + community partnership.",
    realism: "Most realistic startup path: pick one vertical, partner with existing community.",
  },
  {
    name: "Shift swap (deskless workforce)",
    why: "Multi-hop matters where shift-trade requests have high specificity (date + role + skill) and pair-wise matches are rare. Algorithm is identical, no physical buffer needed.",
    moat: "Domain depth — labor law constraints, certifications, payroll cost-neutrality.",
    realism: "B2B SaaS path. Strong if entrenched scheduler doesn't already solve it (often it does).",
  },
] as const;

const honestyPoints = [
  {
    label: "What is genuinely strong",
    body: "The matching engine is feature-complete and tested. Two engines (legacy DFS, graph-based) coexist with a comparison harness. Seven evaluation fixtures gate engine swaps. 80+ tests pass. The buffer module demonstrates how matching plugs into an inventory-first trade lifecycle.",
  },
  {
    label: "What is unproven",
    body: "Liquidity. Multi-hop barter requires dense supply that cold-start solo founders cannot manufacture. The pivot question is which vertical has both an existing community (so liquidity is achievable) and a real coordination pain that the algorithm solves. That choice is bigger than the technology.",
  },
  {
    label: "What is missing",
    body: "Payments integration, real warehouse partnership, regulatory work for any medical or financial vertical, and a vertical-specific go-to-market motion. The codebase is a foundation, not a product.",
  },
] as const;

export default function PitchPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#f1eadc_100%)] px-6 py-10 text-slate-900 md:px-10">
      <div className="mx-auto max-w-6xl space-y-16">
        {/* Hero */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            <Link href="/" className="hover:text-amber-900">
              ← Back to demo
            </Link>
            <span className="text-slate-300">·</span>
            <span>Open-source · MIT</span>
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
            Multi-hop cycle matching as an open-source primitive.
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            Direct barter rarely closes. A graph-based matching engine finds cycles where pair-wise
            swaps fail, and an inventory-first buffer makes those cycles atomic. The same primitive
            applies wherever &quot;A wants B, B wants C, C wants A&quot; is the real shape of demand.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Try the live demo
            </Link>
            <a
              href="https://github.com/omerbakalovic/barterchain-mvp"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Read the code on GitHub
            </a>
            <a
              href="/cycle-infographic.svg"
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Download infographic (SVG)
            </a>
          </div>
        </section>

        {/* Animation */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            How it works
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            From three dead-ends to one closed loop
          </h2>
          <CycleVisualization />
        </section>

        {/* Problem */}
        <section className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-black text-slate-950">The problem</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Why pair-wise matching leaves most demand unsatisfied.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0 text-sm leading-7 text-slate-700">
              <p>
                Most matching marketplaces require a direct overlap between two parties: A has X,
                wants Y; B has Y, wants X. Empirically, that exact symmetry is rare. The result is
                large amounts of supply and demand that never meet.
              </p>
              <p>
                Allowing a third party turns this from set-intersection into graph-cycle search:
                A → B → C → A. In kidney-exchange data, going from 2-cycles to 3-cycles roughly
                doubles successful matches. Going further yields diminishing returns and explosive
                drop-out cascade risk.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-black text-slate-950">The insight</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Cycles plus a buffer turn distributed coordination into a database query.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-6 pt-0 text-sm leading-7 text-slate-700">
              <p>
                The matching engine searches up to a configurable hop limit, scores cycles by city
                overlap, trust, value fairness, and shape, then selects non-overlapping cycle sets.
                The whole pipeline is deterministic.
              </p>
              <p>
                When items pre-deposit into a buffer, the matcher operates on inventory rather than
                intent. Atomicity is no longer a multi-party coordination problem — items are
                already on hand when the cycle closes. Drop-out risk approaches zero. Storage fees
                accrue daily, which itself drives users to be more flexible with match criteria
                (longer chains, less ideal counterparties).
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Architecture */}
        <section className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Architecture
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Two engines, one buffer, deterministic scoring
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Matching engine",
                body: "Modular pipeline: graph construction → cycle detection (DFS, max length 8) → scoring → non-overlapping selection. Legacy DFS matcher coexists with the graph engine; comparison mode runs both side-by-side.",
                ref: "lib/matching-engine/",
              },
              {
                title: "Trade buffer",
                body: "State machine (listed → deposited → shipped/withdrawn) with size-class daily storage fees. Inventory-only mode restricts the matcher to deposited listings. Atomic chain closure becomes label-print, not coordination.",
                ref: "lib/buffer.ts · docs/buffer-model.md",
              },
              {
                title: "Operator dashboard",
                body: "Read-only signals view (supply/demand gaps, mismatches, clusters), a JSON export endpoint with the same filter surface, mismatch drill-down into raw match-request logs, and a buffer inventory view with accrued-fee accounting.",
                ref: "app/admin/signals · app/admin/buffer",
              },
            ].map((card) => (
              <Card key={card.title} className="rounded-[1.5rem] border-white/80 bg-white/85 py-0">
                <CardContent className="space-y-3 p-5 text-sm leading-6 text-slate-700">
                  <p className="text-base font-bold text-slate-950">{card.title}</p>
                  <p>{card.body}</p>
                  <p className="font-mono text-xs text-amber-800">{card.ref}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Verticals */}
        <section className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Where this primitive applies
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Five candidate verticals
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            The matching engine is a primitive. It is most valuable wherever cycles are the natural
            shape of demand and pair-wise matching leaves measurable value on the table. Below is an
            opinionated list, with what each vertical actually requires beyond the algorithm.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {verticals.map((vertical) => (
              <Card key={vertical.name} className="rounded-[1.5rem] border-white/80 bg-white/90 py-0">
                <CardContent className="space-y-3 p-5">
                  <p className="text-lg font-black text-slate-950">{vertical.name}</p>
                  <p className="text-sm leading-6 text-slate-700">{vertical.why}</p>
                  <div className="grid gap-1 text-xs text-slate-500">
                    <p>
                      <span className="font-semibold uppercase tracking-wider text-amber-800">
                        Moat
                      </span>{" "}
                      · {vertical.moat}
                    </p>
                    <p>
                      <span className="font-semibold uppercase tracking-wider text-amber-800">
                        Realism
                      </span>{" "}
                      · {vertical.realism}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Honest framing */}
        <section className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Honest framing
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Strong, unproven, and missing
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {honestyPoints.map((point) => (
              <Card key={point.label} className="rounded-[1.5rem] border-white/80 bg-white/90 py-0">
                <CardContent className="space-y-2 p-5">
                  <p className="text-sm font-bold uppercase tracking-wider text-amber-800">
                    {point.label}
                  </p>
                  <p className="text-sm leading-6 text-slate-700">{point.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Tech */}
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Stack
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Built to be picked up
          </h2>
          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardContent className="space-y-3 p-6 text-sm leading-7 text-slate-700">
              <ul className="grid gap-2 md:grid-cols-2">
                <li>
                  <span className="font-semibold text-slate-900">Frontend:</span> Next.js 15, React
                  19, TypeScript, Tailwind 4, shadcn/ui, Framer Motion
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Persistence:</span> Supabase
                  (Postgres) with local JSON fallback for development
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Matching engine:</span> deterministic
                  graph algorithm in pure TypeScript, no external services
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Tests:</span> 80+ unit and route
                  tests via node:test
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Eval harness:</span> seven JSON
                  fixtures + a switch-readiness gate for engine rollouts
                </li>
                <li>
                  <span className="font-semibold text-slate-900">Deploy:</span> Vercel for the
                  Next.js app, Supabase for production data
                </li>
              </ul>
              <p className="pt-3">
                License is MIT. The codebase is structured so the engine can be extracted as a
                standalone library or imported into another product domain. See{" "}
                <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs">
                  docs/matching-engine.md
                </code>{" "}
                and{" "}
                <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs">
                  docs/buffer-model.md
                </code>
                .
              </p>
            </CardContent>
          </Card>
        </section>

        {/* The ask */}
        <section className="rounded-[1.75rem] bg-slate-950 p-8 text-slate-100 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">The ask</p>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
            If this primitive fits a problem you are working on — take it.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            BarterChain is open-source under MIT. The engine, buffer, and operator dashboard are
            ready to be forked, extended, or extracted. If you are building in any of the verticals
            above and need cycle matching as a building block, the code is yours. If you have an
            adjacent problem that fits this shape, the architecture is documented and the tests
            describe the contracts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://github.com/omerbakalovic/barterchain-mvp"
              className="rounded-full bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-300"
            >
              Fork on GitHub
            </a>
            <a
              href="https://github.com/omerbakalovic/barterchain-mvp/issues/new"
              className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              Open an issue
            </a>
            <Link
              href="/"
              className="rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              Try the demo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
