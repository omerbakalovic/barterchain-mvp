export type MatchingEngineListing = {
  id: string;
  ownerId: string;
  offer: string;
  wants: string[];
  city?: string;
  trustScore?: number;
  estimatedValue?: number;
};

export type MatchingGraphNode = {
  listing: MatchingEngineListing;
  normalizedOffer: string;
  normalizedWants: string[];
};

export type MatchingGraphEdge = {
  from: string;
  to: string;
  reason: string;
};

export type MatchingGraph = {
  nodes: Map<string, MatchingGraphNode>;
  adjacency: Map<string, string[]>;
  edges: MatchingGraphEdge[];
};

export type ScoredCycle = {
  listingIds: string[];
  listings: MatchingEngineListing[];
  score: number;
  reasons: string[];
  length: number;
};

export type MatchingEngineResult = {
  graph: MatchingGraph;
  candidateCycles: ScoredCycle[];
  selectedCycles: ScoredCycle[];
};
