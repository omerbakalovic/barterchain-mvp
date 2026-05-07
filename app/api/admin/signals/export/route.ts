import { NextResponse } from "next/server";

import { canAccessAdminSignals } from "@/lib/admin-access";
import {
  getMarketplaceSignals,
  type SignalFilters,
} from "@/lib/marketplace-signals";

function resolveSourceFilter(value: string | null): SignalFilters["source"] {
  return value === "match" || value === "waitlist" ? value : "all";
}

function buildExportFilename(timestamp: string) {
  const safe = timestamp.replace(/[:.]/g, "-");
  return `barterchain-signals-${safe}.json`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (!canAccessAdminSignals({ key: searchParams.get("key") })) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const filters: Partial<SignalFilters> = {
    item: searchParams.get("item") ?? "",
    city: searchParams.get("city") ?? "",
    trust: searchParams.get("trust") ?? "",
    source: resolveSourceFilter(searchParams.get("source")),
  };

  const generatedAt = new Date().toISOString();
  const signals = await getMarketplaceSignals(filters);

  return NextResponse.json(
    {
      generatedAt,
      filters: signals.filters,
      signals: {
        totals: signals.totals,
        topRequestedItems: signals.topRequestedItems,
        topOfferedItems: signals.topOfferedItems,
        cityDistribution: signals.cityDistribution,
        trustDistribution: signals.trustDistribution,
        mismatches: signals.mismatches,
        supplyDemandGaps: signals.supplyDemandGaps,
        barterClusters: signals.barterClusters,
      },
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="${buildExportFilename(generatedAt)}"`,
        "Cache-Control": "no-store",
      },
    }
  );
}
