import { compareIds, normalizeItemName } from "@/lib/matching-engine/normalize";
import {
  type MatchingEngineListing,
  type MatchingGraph,
  type MatchingGraphEdge,
  type MatchingGraphNode,
} from "@/lib/matching-engine/types";

function canConnect(from: MatchingGraphNode, to: MatchingGraphNode) {
  if (from.listing.id === to.listing.id || from.listing.ownerId === to.listing.ownerId) {
    return false;
  }

  return from.normalizedWants.includes(to.normalizedOffer);
}

export function buildMatchingGraph(listings: MatchingEngineListing[]): MatchingGraph {
  const sortedListings = [...listings].sort((left, right) => compareIds(left.id, right.id));
  const nodes = new Map<string, MatchingGraphNode>();

  for (const listing of sortedListings) {
    nodes.set(listing.id, {
      listing,
      normalizedOffer: normalizeItemName(listing.offer),
      normalizedWants: listing.wants.map(normalizeItemName).sort(compareIds),
    });
  }

  const edges: MatchingGraphEdge[] = [];
  const adjacency = new Map<string, string[]>();

  for (const from of sortedListings) {
    const fromNode = nodes.get(from.id);

    if (!fromNode) {
      continue;
    }

    const neighbors: string[] = [];

    for (const to of sortedListings) {
      const toNode = nodes.get(to.id);

      if (!toNode || !canConnect(fromNode, toNode)) {
        continue;
      }

      neighbors.push(to.id);
      edges.push({
        from: from.id,
        to: to.id,
        reason: `${from.offer} -> ${to.offer}`,
      });
    }

    adjacency.set(from.id, neighbors.sort(compareIds));
  }

  return {
    nodes,
    adjacency,
    edges,
  };
}
