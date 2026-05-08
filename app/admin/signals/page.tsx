import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_SIGNALS_ACCESS_KEY_ENV, canAccessAdminSignals } from "@/lib/admin-access";
import { resolveMatchEngineMode } from "@/lib/match-api";
import {
  getMarketplaceSignals,
  type BarterCluster,
  type MarketplaceSignals,
  type SignalCount,
  type SupplyDemandGap,
} from "@/lib/marketplace-signals";

export const metadata: Metadata = {
  title: "Admin Signals | BarterChain MVP",
  robots: {
    index: false,
    follow: false,
  },
};

function parseSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getBarWidth(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return "0%";
  }

  return `${Math.max(10, Math.round((value / maxValue) * 100))}%`;
}

function SignalBarList({
  items,
  emptyMessage,
}: {
  items: SignalCount[];
  emptyMessage: string;
}) {
  const maxValue = items[0]?.count ?? 0;

  if (items.length === 0) {
    return <p className="text-sm leading-6 text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-800">{item.label}</span>
            <span className="text-slate-500">{item.count}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a,#f59e0b)]"
              style={{ width: getBarWidth(item.count, maxValue) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GapTable({ gaps }: { gaps: SupplyDemandGap[] }) {
  if (gaps.length === 0) {
    return <p className="text-sm leading-6 text-slate-500">No supply or demand gap data yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Item</th>
            <th className="px-4 py-3 font-medium">Supply</th>
            <th className="px-4 py-3 font-medium">Demand</th>
            <th className="px-4 py-3 font-medium">Gap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {gaps.map((gap) => (
            <tr key={gap.item}>
              <td className="px-4 py-3 font-medium text-slate-900">{gap.item}</td>
              <td className="px-4 py-3 text-slate-600">{gap.supply}</td>
              <td className="px-4 py-3 text-slate-600">{gap.demand}</td>
              <td
                className={`px-4 py-3 font-semibold ${
                  gap.gap > 0 ? "text-rose-600" : gap.gap < 0 ? "text-emerald-600" : "text-slate-600"
                }`}
              >
                {gap.gap > 0 ? `+${gap.gap}` : gap.gap}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClusterList({ clusters }: { clusters: BarterCluster[] }) {
  if (clusters.length === 0) {
    return <p className="text-sm leading-6 text-slate-500">No barter clusters detected yet.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {clusters.map((cluster) => (
        <div key={cluster.label} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-slate-950">{cluster.label}</p>
              <p className="mt-1 text-sm text-slate-500">{cluster.requestCount} connected requests</p>
            </div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
              {cluster.averageTrust ? `${cluster.averageTrust.toFixed(1)} trust` : "no trust data"}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Items: <span className="font-medium text-slate-900">{cluster.items.join(", ")}</span>
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Cities:{" "}
            <span className="font-medium text-slate-900">
              {cluster.cities.length > 0 ? cluster.cities.join(", ") : "Unknown"}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Supply</p>
              <p className="mt-1 font-semibold text-slate-900">{cluster.supply}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Demand</p>
              <p className="mt-1 font-semibold text-slate-900">{cluster.demand}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-slate-500">Gap</p>
              <p className="mt-1 font-semibold text-slate-900">{cluster.demand - cluster.supply}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function buildMismatchHref(have: string, want: string, accessKey: string) {
  const params = new URLSearchParams();
  params.set("have", have);
  params.set("want", want);
  if (accessKey) {
    params.set("key", accessKey);
  }
  return `/admin/signals/mismatch?${params.toString()}`;
}

function MismatchTable({
  signals,
  accessKey,
}: {
  signals: MarketplaceSignals["mismatches"];
  accessKey: string;
}) {
  if (signals.length === 0) {
    return <p className="text-sm leading-6 text-slate-500">No mismatch pairs yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Have</th>
            <th className="px-4 py-3 font-medium">Want</th>
            <th className="px-4 py-3 font-medium">Count</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {signals.map((signal) => (
            <tr key={signal.label} className="hover:bg-amber-50/50">
              <td className="px-4 py-3 font-medium text-slate-900">{signal.have}</td>
              <td className="px-4 py-3 text-slate-600">{signal.want}</td>
              <td className="px-4 py-3 text-slate-600">{signal.count}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={buildMismatchHref(signal.have, signal.want, accessKey)}
                  className="text-sm font-semibold text-amber-800 hover:text-amber-900"
                >
                  View requests →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminSignalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const accessKey = parseSearchParam(params.key);

  if (!canAccessAdminSignals({ key: accessKey })) {
    notFound();
  }

  const item = parseSearchParam(params.item);
  const city = parseSearchParam(params.city);
  const trust = parseSearchParam(params.trust);
  const sourceParam = parseSearchParam(params.source);
  const source = sourceParam === "match" || sourceParam === "waitlist" ? sourceParam : "all";
  const signals = await getMarketplaceSignals({
    item,
    city,
    trust,
    source,
  });

  const activeEngine = resolveMatchEngineMode(new URLSearchParams());

  const exportParams = new URLSearchParams();
  if (accessKey) exportParams.set("key", accessKey);
  if (item) exportParams.set("item", item);
  if (city) exportParams.set("city", city);
  if (trust) exportParams.set("trust", trust);
  if (source !== "all") exportParams.set("source", source);
  const exportHref = exportParams.toString()
    ? `/api/admin/signals/export?${exportParams.toString()}`
    : "/api/admin/signals/export";

  const summaryCards = [
    {
      label: "Match requests",
      value: signals.totals.filteredMatchRequests,
      hint: `${signals.totals.matchRequests} total logged`,
    },
    {
      label: "Waitlist entries",
      value: signals.totals.filteredWaitlistEntries,
      hint: `${signals.totals.waitlistEntries} total captured`,
    },
    {
      label: "Active demand items",
      value: signals.topRequestedItems.length,
      hint: "Distinct items after filters",
    },
    {
      label: "Potential clusters",
      value: signals.barterClusters.length,
      hint: "Connected trade themes",
    },
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#f1eadc_100%)] px-6 py-10 text-slate-900 md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Internal dashboard
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
              Marketplace supply and demand signals
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              This page stays internal. In production it requires the `{ADMIN_SIGNALS_ACCESS_KEY_ENV}` query key.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
            <span>
              Active match engine:{" "}
              <span className="font-semibold uppercase tracking-wide text-slate-900">
                {activeEngine}
              </span>
            </span>
            <span className="text-xs text-slate-500">
              Filters update server-side from current waitlist entries and logged match requests.
            </span>
            <Link
              href={accessKey ? `/admin/buffer?key=${encodeURIComponent(accessKey)}` : "/admin/buffer"}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900"
            >
              View buffer inventory →
            </Link>
          </div>
        </div>

        <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0 shadow-[0_20px_60px_rgba(91,70,37,0.09)]">
          <CardHeader className="p-6 pb-3">
            <CardTitle className="text-2xl font-black text-slate-950">Filters</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Narrow signals by item keyword, linked city, trust bucket, or source stream.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <input type="hidden" name="key" value={accessKey} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Item keyword</span>
                <input
                  type="text"
                  name="item"
                  defaultValue={item}
                  placeholder="espresso, keyboard, bike..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">City</span>
                <select
                  name="city"
                  defaultValue={city}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                >
                  <option value="">All cities</option>
                  {signals.filterOptions.cities.map((option) => (
                    <option key={option} value={option.toLowerCase()}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Trust</span>
                <select
                  name="trust"
                  defaultValue={trust}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                >
                  <option value="">All trust buckets</option>
                  {signals.filterOptions.trust.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Source</span>
                <select
                  name="source"
                  defaultValue={source}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                >
                  <option value="all">All sources</option>
                  <option value="match">Match requests only</option>
                  <option value="waitlist">Waitlist only</option>
                </select>
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <button
                  type="submit"
                  className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Apply filters
                </button>
                <a
                  href={accessKey ? `/admin/signals?key=${encodeURIComponent(accessKey)}` : "/admin/signals"}
                  className="h-11 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Reset
                </a>
                <a
                  href={exportHref}
                  className="h-11 rounded-full border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Download JSON
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="rounded-[1.5rem] border-white/80 bg-white/85 py-0">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-black text-slate-950">Top requested items</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Demand combines match wants with recognizable item mentions from waitlist notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <SignalBarList items={signals.topRequestedItems} emptyMessage="No demand signals yet." />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-black text-slate-950">Top offered items</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Supply signals come from logged have-items in match exploration requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <SignalBarList items={signals.topOfferedItems} emptyMessage="No offered-item signals yet." />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-black text-slate-950">City distribution</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Cities are inferred from linked listing supply and explicit city mentions in waitlist notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <SignalBarList items={signals.cityDistribution} emptyMessage="No city signals yet." />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-black text-slate-950">Trust distribution</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Trust buckets are derived from current listings behind the offered-item requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <SignalBarList items={signals.trustDistribution} emptyMessage="No trust signals yet." />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-black text-slate-950">Common have/want mismatches</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Frequent pairings that indicate direct swaps are unlikely and chains may matter most.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <MismatchTable signals={signals.mismatches} accessKey={accessKey} />
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-black text-slate-950">Supply vs demand gaps</CardTitle>
              <CardDescription className="text-sm leading-6 text-slate-600">
                Positive gaps mark items with more demand than supply in current signals.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <GapTable gaps={signals.supplyDemandGaps} />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl font-black text-slate-950">Potential barter clusters</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Connected item groups built from logged have-to-want relationships, enriched with current listing geography and trust.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <ClusterList clusters={signals.barterClusters} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
