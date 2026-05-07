import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAccessAdminSignals } from "@/lib/admin-access";
import { readMatchRequestEntries, type MatchRequestEntry } from "@/lib/match-request-store";
import { normalizeLabel } from "@/lib/marketplace-signals";

export const metadata: Metadata = {
  title: "Mismatch drill-down | BarterChain MVP",
  robots: {
    index: false,
    follow: false,
  },
};

function parseSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function buildBackHref(key: string) {
  return key ? `/admin/signals?key=${encodeURIComponent(key)}` : "/admin/signals";
}

export default async function MismatchDrillDownPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const accessKey = parseSearchParam(params.key);

  if (!canAccessAdminSignals({ key: accessKey })) {
    notFound();
  }

  const haveFilter = normalizeLabel(parseSearchParam(params.have));
  const wantFilter = normalizeLabel(parseSearchParam(params.want));

  if (!haveFilter || !wantFilter) {
    notFound();
  }

  const allRequests = await readMatchRequestEntries();
  const matchingRequests: MatchRequestEntry[] = allRequests
    .filter(
      (entry) =>
        normalizeLabel(entry.have) === haveFilter && normalizeLabel(entry.want) === wantFilter
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f5ee_0%,#f1eadc_100%)] px-6 py-10 text-slate-900 md:px-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <Link
            href={buildBackHref(accessKey)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 hover:text-amber-900"
          >
            ← Back to signals
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            Mismatch drill-down
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
            Match requests for {parseSearchParam(params.have)} → {parseSearchParam(params.want)}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Every logged exploration request that produced this have/want pair, newest first.
          </p>
        </div>

        <Card className="rounded-[1.75rem] border-white/80 bg-white/90 py-0">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl font-black text-slate-950">
              {matchingRequests.length} matching request{matchingRequests.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-600">
              Showing logged GET /api/match invocations whose normalized have and want strings match
              the drill-down filter exactly.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {matchingRequests.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500">
                No logged requests for this pair. The mismatch tally on the signals page may include
                normalized variants — check the casing and whitespace of the source data.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Logged at</th>
                      <th className="px-4 py-3 font-medium">Engine</th>
                      <th className="px-4 py-3 font-medium">Max hops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {matchingRequests.map((entry, index) => (
                      <tr key={`${entry.createdAt}-${index}`}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{entry.engine}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.maxHops}</td>
                      </tr>
                    ))}
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
