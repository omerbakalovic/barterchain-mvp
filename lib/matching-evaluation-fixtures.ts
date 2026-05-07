import { type BarterListing } from "@/lib/barter-data";
import balancedCityMarket from "@/data/matching-evaluation/balanced-city-market.json";
import overlappingCompetition from "@/data/matching-evaluation/overlapping-competition.json";
import regionalTradeoffsMarket from "@/data/matching-evaluation/regional-tradeoffs-market.json";
import sparseDeadEndsMarket from "@/data/matching-evaluation/sparse-dead-ends-market.json";
import sparseMixedMarket from "@/data/matching-evaluation/sparse-mixed-market.json";
import syntheticMixedNetwork from "@/data/matching-evaluation/synthetic-mixed-network.json";
import trustPressureMarket from "@/data/matching-evaluation/trust-pressure-market.json";

type ListingScenario = {
  name: string;
  kind: "listing";
  description?: string;
  listingId: string;
  maxHops: number;
};

type TradeRequestScenario = {
  name: string;
  kind: "trade-request";
  description?: string;
  have: string;
  want: string;
  maxHops: number;
};

export type MatchingEvaluationScenario = ListingScenario | TradeRequestScenario;

export type MatchingEvaluationFixture = {
  name: string;
  description: string;
  testing?: string[];
  market?: {
    description: string;
    maxHops: number;
    expectations?: string[];
  };
  listings: BarterListing[];
  scenarios: MatchingEvaluationScenario[];
};

export const matchingEvaluationFixtures: MatchingEvaluationFixture[] = [
  balancedCityMarket,
  overlappingCompetition,
  sparseMixedMarket,
  trustPressureMarket,
  regionalTradeoffsMarket,
  sparseDeadEndsMarket,
  syntheticMixedNetwork,
] as MatchingEvaluationFixture[];
