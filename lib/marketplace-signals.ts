import { demoListings, type BarterListing } from "@/lib/barter-data";
import {
  readMatchRequestEntries,
  type MatchRequestEntry,
} from "@/lib/match-request-store";
import { readWaitlistEntries, type WaitlistEntry } from "@/lib/waitlist-store";

export type SignalFilters = {
  item: string;
  city: string;
  trust: string;
  source: "all" | "match" | "waitlist";
};

export type SignalCount = {
  label: string;
  count: number;
};

export type MismatchSignal = {
  label: string;
  have: string;
  want: string;
  count: number;
};

export type SupplyDemandGap = {
  item: string;
  supply: number;
  demand: number;
  gap: number;
};

export type BarterCluster = {
  label: string;
  items: string[];
  requestCount: number;
  supply: number;
  demand: number;
  cities: string[];
  averageTrust: number | null;
};

export type MarketplaceSignals = {
  filters: SignalFilters;
  topRequestedItems: SignalCount[];
  topOfferedItems: SignalCount[];
  mismatches: MismatchSignal[];
  cityDistribution: SignalCount[];
  trustDistribution: SignalCount[];
  supplyDemandGaps: SupplyDemandGap[];
  barterClusters: BarterCluster[];
  totals: {
    waitlistEntries: number;
    matchRequests: number;
    filteredWaitlistEntries: number;
    filteredMatchRequests: number;
  };
  filterOptions: {
    cities: string[];
    trust: Array<{ value: string; label: string }>;
  };
};

const trustBuckets = [
  { value: "elite", label: "Elite (4.8+)" },
  { value: "high", label: "High (4.5-4.79)" },
  { value: "medium", label: "Medium (4.0-4.49)" },
  { value: "low", label: "Low (<4.0)" },
  { value: "unknown", label: "Unknown" },
] as const;

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function toDisplayLabel(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function incrementCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sortCounts(map: Map<string, number>) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([label, count]) => ({ label: toDisplayLabel(label), count }));
}

function getTrustBucket(score?: number) {
  if (score === undefined || !Number.isFinite(score)) {
    return "unknown";
  }

  if (score >= 4.8) {
    return "elite";
  }

  if (score >= 4.5) {
    return "high";
  }

  if (score >= 4) {
    return "medium";
  }

  return "low";
}

function buildListingIndex(listings: BarterListing[]) {
  const byItem = new Map<string, BarterListing[]>();

  for (const listing of listings) {
    const item = normalizeLabel(listing.gives);
    const existing = byItem.get(item) ?? [];
    existing.push(listing);
    byItem.set(item, existing);
  }

  return byItem;
}

function extractKnownTerms(text: string, knownValues: string[]) {
  const normalizedText = normalizeLabel(text);
  return knownValues.filter((value) => normalizedText.includes(value));
}

function shouldIncludeWaitlist(filters: SignalFilters) {
  return filters.source === "all" || filters.source === "waitlist";
}

function shouldIncludeMatches(filters: SignalFilters) {
  return filters.source === "all" || filters.source === "match";
}

function matchesItemFilter(values: string[], filter: string) {
  if (!filter) {
    return true;
  }

  return values.some((value) => value.includes(filter));
}

function matchesCityFilter(cities: string[], filter: string) {
  if (!filter) {
    return true;
  }

  if (filter === "unknown") {
    return cities.length === 0;
  }

  return cities.includes(filter);
}

function matchesTrustFilter(buckets: string[], filter: string) {
  if (!filter) {
    return true;
  }

  return buckets.includes(filter);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildClusters(input: {
  matchRequests: MatchRequestEntry[];
  demandCounts: Map<string, number>;
  supplyCounts: Map<string, number>;
  listingIndex: Map<string, BarterListing[]>;
}) {
  const adjacency = new Map<string, Set<string>>();

  for (const request of input.matchRequests) {
    const have = normalizeLabel(request.have);
    const want = normalizeLabel(request.want);

    if (!have || !want) {
      continue;
    }

    const haveNeighbors = adjacency.get(have) ?? new Set<string>();
    haveNeighbors.add(want);
    adjacency.set(have, haveNeighbors);

    const wantNeighbors = adjacency.get(want) ?? new Set<string>();
    wantNeighbors.add(have);
    adjacency.set(want, wantNeighbors);
  }

  const visited = new Set<string>();
  const clusters: BarterCluster[] = [];

  for (const start of adjacency.keys()) {
    if (visited.has(start)) {
      continue;
    }

    const stack = [start];
    const items: string[] = [];

    while (stack.length > 0) {
      const item = stack.pop();

      if (!item || visited.has(item)) {
        continue;
      }

      visited.add(item);
      items.push(item);

      for (const neighbor of adjacency.get(item) ?? []) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    if (items.length < 2) {
      continue;
    }

    const itemSet = new Set(items);
    const relevantRequests = input.matchRequests.filter((request) => {
      const have = normalizeLabel(request.have);
      const want = normalizeLabel(request.want);
      return itemSet.has(have) || itemSet.has(want);
    });
    const trustScores = items.flatMap(
      (item) => input.listingIndex.get(item)?.map((listing) => listing.trustScore) ?? []
    );
    const cities = [
      ...new Set(
        items.flatMap(
          (item) =>
            input.listingIndex
              .get(item)
              ?.map((listing) => normalizeLabel(listing.city))
              .filter(Boolean) ?? []
        )
      ),
    ];
    const supply = items.reduce((sum, item) => sum + (input.supplyCounts.get(item) ?? 0), 0);
    const demand = items.reduce((sum, item) => sum + (input.demandCounts.get(item) ?? 0), 0);

    clusters.push({
      label: items.slice(0, 3).map(toDisplayLabel).join(" / "),
      items: items.map(toDisplayLabel).sort((left, right) => left.localeCompare(right)),
      requestCount: relevantRequests.length,
      supply,
      demand,
      cities: cities.map(toDisplayLabel).sort((left, right) => left.localeCompare(right)),
      averageTrust: average(trustScores),
    });
  }

  return clusters.sort(
    (left, right) =>
      right.requestCount - left.requestCount ||
      Math.abs(right.demand - right.supply) - Math.abs(left.demand - left.supply) ||
      left.label.localeCompare(right.label)
  );
}

export function buildMarketplaceSignals(input: {
  waitlistEntries: WaitlistEntry[];
  matchRequests: MatchRequestEntry[];
  listings?: BarterListing[];
  filters?: Partial<SignalFilters>;
}): MarketplaceSignals {
  const listings = input.listings ?? demoListings;
  const listingIndex = buildListingIndex(listings);
  const knownItems = [...listingIndex.keys()];
  const knownCities = [
    ...new Set(listings.map((listing) => normalizeLabel(listing.city)).filter(Boolean)),
  ];
  const filters: SignalFilters = {
    item: normalizeLabel(input.filters?.item ?? ""),
    city: normalizeLabel(input.filters?.city ?? ""),
    trust: normalizeLabel(input.filters?.trust ?? ""),
    source: input.filters?.source ?? "all",
  };

  const filteredMatchRequests = shouldIncludeMatches(filters)
    ? input.matchRequests.filter((request) => {
        const have = normalizeLabel(request.have);
        const want = normalizeLabel(request.want);
        const linkedListings = listingIndex.get(have) ?? [];
        const cities = [
          ...new Set(linkedListings.map((listing) => normalizeLabel(listing.city)).filter(Boolean)),
        ];
        const buckets = [
          ...new Set(linkedListings.map((listing) => getTrustBucket(listing.trustScore))),
        ];

        return (
          matchesItemFilter([have, want], filters.item) &&
          matchesCityFilter(cities, filters.city) &&
          matchesTrustFilter(buckets.length > 0 ? buckets : ["unknown"], filters.trust)
        );
      })
    : [];

  const filteredWaitlistEntries = shouldIncludeWaitlist(filters)
    ? input.waitlistEntries.filter((entry) => {
        const matchedItems = extractKnownTerms(entry.useCase, knownItems);
        const matchedCities = extractKnownTerms(entry.useCase, knownCities);

        return (
          matchesItemFilter([normalizeLabel(entry.useCase), ...matchedItems], filters.item) &&
          matchesCityFilter(matchedCities, filters.city)
        );
      })
    : [];

  const demandCounts = new Map<string, number>();
  const supplyCounts = new Map<string, number>();
  const mismatchCounts = new Map<string, MismatchSignal>();
  const cityCounts = new Map<string, number>();
  const trustCounts = new Map<string, number>();

  for (const request of filteredMatchRequests) {
    const have = normalizeLabel(request.have);
    const want = normalizeLabel(request.want);

    incrementCount(supplyCounts, have);
    incrementCount(demandCounts, want);

    if (have !== want) {
      const key = `${have}->${want}`;
      const existing = mismatchCounts.get(key);
      mismatchCounts.set(
        key,
        existing
          ? { ...existing, count: existing.count + 1 }
          : {
              label: `${toDisplayLabel(have)} -> ${toDisplayLabel(want)}`,
              have: toDisplayLabel(have),
              want: toDisplayLabel(want),
              count: 1,
            }
      );
    }

    const linkedListings = listingIndex.get(have) ?? [];

    if (linkedListings.length === 0) {
      incrementCount(cityCounts, "unknown");
      incrementCount(trustCounts, "unknown");
      continue;
    }

    const uniqueCities = new Set(
      linkedListings.map((listing) => normalizeLabel(listing.city)).filter(Boolean)
    );
    for (const city of uniqueCities) {
      incrementCount(cityCounts, city);
    }

    const uniqueBuckets = new Set(
      linkedListings.map((listing) => getTrustBucket(listing.trustScore))
    );
    for (const bucket of uniqueBuckets) {
      incrementCount(trustCounts, bucket);
    }
  }

  for (const entry of filteredWaitlistEntries) {
    for (const item of extractKnownTerms(entry.useCase, knownItems)) {
      incrementCount(demandCounts, item);
    }

    const cities = extractKnownTerms(entry.useCase, knownCities);
    if (cities.length === 0) {
      incrementCount(cityCounts, "unknown");
    }

    for (const city of cities) {
      incrementCount(cityCounts, city);
    }
  }

  const gapItems = new Set([...demandCounts.keys(), ...supplyCounts.keys()]);
  const supplyDemandGaps = [...gapItems]
    .map((item) => ({
      item: toDisplayLabel(item),
      supply: supplyCounts.get(item) ?? 0,
      demand: demandCounts.get(item) ?? 0,
      gap: (demandCounts.get(item) ?? 0) - (supplyCounts.get(item) ?? 0),
    }))
    .sort(
      (left, right) =>
        Math.abs(right.gap) - Math.abs(left.gap) ||
        right.demand - left.demand ||
        left.item.localeCompare(right.item)
    )
    .slice(0, 8);

  const trustDistributionMap = new Map<string, number>();
  for (const bucket of trustBuckets) {
    trustDistributionMap.set(bucket.label, trustCounts.get(bucket.value) ?? 0);
  }

  return {
    filters,
    topRequestedItems: sortCounts(demandCounts).slice(0, 8),
    topOfferedItems: sortCounts(supplyCounts).slice(0, 8),
    mismatches: [...mismatchCounts.values()]
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
      .slice(0, 8),
    cityDistribution: sortCounts(cityCounts).slice(0, 8),
    trustDistribution: [...trustDistributionMap.entries()]
      .filter(([, count]) => count > 0)
      .map(([label, count]) => ({ label, count })),
    supplyDemandGaps,
    barterClusters: buildClusters({
      matchRequests: filteredMatchRequests,
      demandCounts,
      supplyCounts,
      listingIndex,
    }).slice(0, 6),
    totals: {
      waitlistEntries: input.waitlistEntries.length,
      matchRequests: input.matchRequests.length,
      filteredWaitlistEntries: filteredWaitlistEntries.length,
      filteredMatchRequests: filteredMatchRequests.length,
    },
    filterOptions: {
      cities: [...new Set([...knownCities, "unknown"])].map(toDisplayLabel).sort((left, right) =>
        left.localeCompare(right)
      ),
      trust: trustBuckets.map((bucket) => ({
        value: bucket.value,
        label: bucket.label,
      })),
    },
  };
}

export async function getMarketplaceSignals(filters?: Partial<SignalFilters>) {
  const [waitlistEntries, matchRequests] = await Promise.all([
    readWaitlistEntries(),
    readMatchRequestEntries(),
  ]);

  return buildMarketplaceSignals({
    waitlistEntries,
    matchRequests,
    filters,
  });
}
