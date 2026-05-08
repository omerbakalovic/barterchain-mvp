import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccessAdminSignals } from "@/lib/admin-access";
import {
  BUFFER_DAILY_FEE_EUR,
  BUFFER_STATUS_DEPOSITED,
  calculateAccruedFeeEur,
  type BufferSizeClass,
} from "@/lib/buffer";
import { readStoredListings } from "@/lib/listing-store";

export const metadata: Metadata = {
  title: "Buffer inventory | BarterChain MVP",
  robots: {
    index: false,
    follow: false,
  },
};

function parseSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function buildBackHref(key: string) {
  return key ? `/admin/signals?key=${encodeURIComponent(key)}` : "/admin/signals";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function daysInBuffer(depositedAt: string, asOf: Date) {
  const start = new Date(depositedAt).getTime();
  const elapsedMs = Math.max(0, asOf.getTime() - start);
  return Number((elapsedMs / (1000 * 60 * 60 * 24)).toFixed(2));
}

export default async function BufferInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const accessKey = parseSearchParam(params.key);

  if (!canAccessAdminSignals({ key: accessKey })) {
    notFound();
  }

  const asOf = new Date();
  const allListings = await readStoredListings();
  const deposited = allListings
    .filter((listing) => listing.buffer?.status === BUFFER_STATUS_DEPOSITED)
    .sort((left, right) => {
      const leftAt = left.buffer?.depositedAt ?? left.createdAt;
      const rightAt = right.buffer?.depositedAt ?? right.createdAt;
      return leftAt.localeCompare(rightAt);
    });

  const totalAccruedFeeEur = deposited.reduce((sum, listing) => {
    if (!listing.buffer) return sum;
    return sum + calculateAccruedFeeEur(listing.buffer, asOf);
  }, 0);

  const sizeClassBreakdown = deposited.reduce<Record<BufferSizeClass, number>>(
    (acc, listing) => {
      if (!listing.buffer) return acc;
      acc[listing.buffer.sizeClass] += 1;
      return acc;
    },
    { S: 0, M: 0, L: 0, XL: 0 }
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#f1eadc_100%)] px-6 py-10 text-slate-900 md:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <Link
            href={buildBackHref(accessKey)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 hover:text-amber-900"
          >
            ← Back to signals
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Internal dashboard
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Buffer inventory
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Listings currently held in the trade buffer. Storage fees accrue daily by size class and
            are settled at release. The matching engine can be restricted to only buffer-resident
            inventory via <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs">/api/match?inventoryOnly=true</code>.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="rounded-[1.5rem] border-white/80 bg-white/85 py-0">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Items in buffer</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{deposited.length}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Status = deposited at this moment
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-white/80 bg-white/85 py-0">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Accrued fees</p>
              <p className="mt-3 text-3xl font-black text-slate-950">
                €{totalAccruedFeeEur.toFixed(2)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Across all current items</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-white/80 bg-white/85 py-0">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Size class mix</p>
              <p className="mt-3 text-base font-semibold text-slate-950">
                S {sizeClassBreakdown.S} · M {sizeClassBreakdown.M} · L {sizeClassBreakdown.L} · XL{" "}
                {sizeClassBreakdown.XL}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Daily rates: S €{BUFFER_DAILY_FEE_EUR.S}, M €{BUFFER_DAILY_FEE_EUR.M}, L €
                {BUFFER_DAILY_FEE_EUR.L}, XL €{BUFFER_DAILY_FEE_EUR.XL}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-white/80 bg-white/85 py-0">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-500">Snapshot at</p>
              <p className="mt-3 font-mono text-sm text-slate-950">{formatDate(asOf.toISOString())}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Refresh page for a current view
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl font-black text-slate-950">Deposited listings</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Oldest deposit first. Accrued fees grow until the listing is released as either
              shipped (chain closed) or withdrawn (operator pulled it out).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {deposited.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">
                No listings are currently in the buffer. Use{" "}
                <code className="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs">
                  POST /api/listings/:id/deposit
                </code>{" "}
                to move an existing listing into inventory.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Listing</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Deposited at</th>
                      <th className="px-4 py-3 font-medium">Days in buffer</th>
                      <th className="px-4 py-3 font-medium">Accrued fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {deposited.map((listing) => {
                      const buffer = listing.buffer!;
                      const depositedAt = buffer.depositedAt ?? listing.createdAt;
                      return (
                        <tr key={listing.id}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{listing.title}</div>
                            <div className="text-xs text-slate-500">
                              {listing.city} · {listing.gives}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {buffer.sizeClass}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {formatDate(depositedAt)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {daysInBuffer(depositedAt, asOf)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            €{calculateAccruedFeeEur(buffer, asOf).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
