import { type ScoredCycle } from "@/lib/matching-engine/types";

type SelectionState = {
  score: number;
  cycles: ScoredCycle[];
  coveredCount: number;
};

function compareStates(left: SelectionState, right: SelectionState) {
  if (left.score !== right.score) {
    return left.score - right.score;
  }

  if (left.coveredCount !== right.coveredCount) {
    return left.coveredCount - right.coveredCount;
  }

  if (left.cycles.length !== right.cycles.length) {
    return right.cycles.length - left.cycles.length;
  }

  const leftKey = left.cycles.map((cycle) => cycle.listingIds.join("|")).join("||");
  const rightKey = right.cycles.map((cycle) => cycle.listingIds.join("|")).join("||");
  return rightKey.localeCompare(leftKey) * -1;
}

function overlapsWithUsedListings(cycle: ScoredCycle, usedListingIds: Set<string>) {
  return cycle.listingIds.some((listingId) => usedListingIds.has(listingId));
}

export function selectBestNonOverlappingCycles(cycles: ScoredCycle[]) {
  const sortedCycles = [...cycles];
  const suffixBestPossible = new Array<number>(sortedCycles.length + 1).fill(0);

  for (let index = sortedCycles.length - 1; index >= 0; index -= 1) {
    suffixBestPossible[index] = suffixBestPossible[index + 1] + sortedCycles[index].score;
  }

  let bestState: SelectionState = {
    score: 0,
    cycles: [],
    coveredCount: 0,
  };

  function search(index: number, selected: ScoredCycle[], usedListingIds: Set<string>, score: number) {
    if (index === sortedCycles.length) {
      const candidateState: SelectionState = {
        score,
        cycles: [...selected],
        coveredCount: usedListingIds.size,
      };

      if (compareStates(candidateState, bestState) > 0) {
        bestState = candidateState;
      }

      return;
    }

    if (score + suffixBestPossible[index] < bestState.score) {
      return;
    }

    const cycle = sortedCycles[index];

    if (!overlapsWithUsedListings(cycle, usedListingIds)) {
      const nextUsedIds = new Set(usedListingIds);
      for (const listingId of cycle.listingIds) {
        nextUsedIds.add(listingId);
      }

      search(index + 1, [...selected, cycle], nextUsedIds, score + cycle.score);
    }

    search(index + 1, selected, usedListingIds, score);
  }

  search(0, [], new Set<string>(), 0);

  return bestState.cycles.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.listingIds.join("|").localeCompare(right.listingIds.join("|"));
  });
}
