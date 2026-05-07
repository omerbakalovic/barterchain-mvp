import { type BarterListing } from "@/lib/barter-data";

export type MatchResultChain = {
  chainId: string;
  listings: BarterListing[];
  hopCount: number;
  score: number;
  summary: string;
  returnItem: string;
  reasons: string[];
};

export type ChainMetric = {
  key: "score" | "trust" | "fairness" | "city" | "length";
  label: string;
  value: number;
  display: string;
  hint: string;
};

export type ChainInsight = {
  title: string;
  body: string;
};

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getChainTrustStrength(chain: MatchResultChain) {
  if (chain.listings.length === 0) {
    return 0;
  }

  const total = chain.listings.reduce((sum, listing) => sum + listing.trustScore, 0);
  return total / chain.listings.length;
}

export function getChainValueFairness(chain: MatchResultChain) {
  if (chain.listings.length === 0) {
    return 0;
  }

  const values = chain.listings.map((listing) => listing.estimatedValue);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  if (maxValue <= 0) {
    return 100;
  }

  return (minValue / maxValue) * 100;
}

export function getChainCityAlignment(chain: MatchResultChain) {
  if (chain.listings.length === 0) {
    return 0;
  }

  const starterCity = chain.listings[0]?.city;

  if (!starterCity) {
    return 0;
  }

  const aligned = chain.listings.filter((listing) => listing.city === starterCity).length;
  return (aligned / chain.listings.length) * 100;
}

export function getChainLengthStrength(chain: MatchResultChain, maxHops: number) {
  if (maxHops <= 0) {
    return 0;
  }

  return ((Math.max(0, maxHops - chain.hopCount) + 1) / maxHops) * 100;
}

export function buildChainMetrics(chain: MatchResultChain, maxHops: number): ChainMetric[] {
  const trustStrength = getChainTrustStrength(chain);
  const valueFairness = getChainValueFairness(chain);
  const cityAlignment = getChainCityAlignment(chain);
  const lengthStrength = getChainLengthStrength(chain, maxHops);

  return [
    {
      key: "score",
      label: "Score",
      value: clampPercentage(chain.score),
      display: chain.score.toFixed(2),
      hint: "Overall ranking after combining fit, trust, fairness, location, and efficiency.",
    },
    {
      key: "trust",
      label: "Trust strength",
      value: clampPercentage((trustStrength / 5) * 100),
      display: `${trustStrength.toFixed(1)} / 5`,
      hint: "Average trust score across everyone in the chain.",
    },
    {
      key: "fairness",
      label: "Value fairness",
      value: clampPercentage(valueFairness),
      display: `${Math.round(valueFairness)}%`,
      hint: "How closely the lowest and highest estimated values line up.",
    },
    {
      key: "city",
      label: "City alignment",
      value: clampPercentage(cityAlignment),
      display: `${Math.round(cityAlignment)}%`,
      hint: "How much of the chain stays aligned with the starter's city.",
    },
    {
      key: "length",
      label: "Chain length",
      value: clampPercentage(lengthStrength),
      display: `${chain.hopCount} hop${chain.hopCount === 1 ? "" : "s"}`,
      hint: "Shorter loops are usually easier to coordinate and complete.",
    },
  ];
}

export function buildWhyThisMatch(chain: MatchResultChain, maxHops: number): ChainInsight[] {
  const trustStrength = getChainTrustStrength(chain);
  const valueFairness = getChainValueFairness(chain);
  const cityAlignment = getChainCityAlignment(chain);
  const lengthStrength = getChainLengthStrength(chain, maxHops);
  const exactReturnMatch = chain.reasons.includes("exact return item match");

  const insights: ChainInsight[] = [];

  if (exactReturnMatch) {
    insights.push({
      title: "Return item fit",
      body: `The chain closes with ${chain.returnItem}, which exactly matches the requested item.`,
    });
  }

  insights.push({
    title: "Trust strength",
    body: `This route averages ${trustStrength.toFixed(1)} out of 5 across all traders, which helps limit weak links in the swap.`,
  });

  insights.push({
    title: "Value fairness",
    body: `The value fairness score is ${Math.round(valueFairness)}%, meaning the trade values stay relatively balanced across the loop.`,
  });

  if (cityAlignment > 0) {
    const starterCity = chain.listings[0]?.city ?? "the starter city";
    insights.push({
      title: "Location fit",
      body: `${Math.round(cityAlignment)}% of the chain stays aligned with ${starterCity}, which can reduce coordination or shipping friction.`,
    });
  }

  insights.push({
    title: "Execution complexity",
    body: `${chain.hopCount} participants are involved. That scores ${Math.round(lengthStrength)}% on chain efficiency relative to the current ${maxHops}-hop search limit.`,
  });

  return insights;
}

export function formatComparisonWinner(
  metricLabel: string,
  winner: "legacy" | "graph" | "tie",
  delta: number
) {
  if (winner === "tie") {
    return `${metricLabel} is tied`;
  }

  const engineLabel = winner === "graph" ? "Graph" : "Legacy";
  const sign = delta > 0 ? "+" : "";
  return `${engineLabel} leads on ${metricLabel} (${sign}${delta.toFixed(2)})`;
}



