import { buildMatchingGraph } from "@/lib/matching-engine/graph";
import { detectSimpleCycles } from "@/lib/matching-engine/cycles";
import { scoreCycles } from "@/lib/matching-engine/scoring";
import { selectBestNonOverlappingCycles } from "@/lib/matching-engine/selection";
import {
  type MatchingEngineListing,
  type MatchingEngineResult,
} from "@/lib/matching-engine/types";

export function runMatchingEngine(
  listings: MatchingEngineListing[],
  options?: {
    maxCycleLength?: number;
  }
): MatchingEngineResult {
  const graph = buildMatchingGraph(listings);
  const candidateCycles = scoreCycles(
    graph,
    detectSimpleCycles(graph, options?.maxCycleLength ?? 8)
  );
  const selectedCycles = selectBestNonOverlappingCycles(candidateCycles);

  return {
    graph,
    candidateCycles,
    selectedCycles,
  };
}
