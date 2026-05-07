import { compareIds } from "@/lib/matching-engine/normalize";
import { type MatchingGraph } from "@/lib/matching-engine/types";

function canonicalizeCycle(cycle: string[]) {
  const minId = [...cycle].sort(compareIds)[0];
  const startIndex = cycle.findIndex((id) => id === minId);
  const rotated = [...cycle.slice(startIndex), ...cycle.slice(0, startIndex)];
  return rotated.join("|");
}

export function detectSimpleCycles(graph: MatchingGraph, maxCycleLength = 8) {
  const nodeIds = [...graph.nodes.keys()].sort(compareIds);
  const seen = new Set<string>();
  const cycles: string[][] = [];

  for (const startId of nodeIds) {
    const visited = new Set<string>([startId]);

    function dfs(currentId: string, path: string[]) {
      const neighbors = graph.adjacency.get(currentId) ?? [];

      for (const nextId of neighbors) {
        if (nextId === startId) {
          if (path.length >= 3 && path.length <= maxCycleLength) {
            const cycle = [...path];
            const key = canonicalizeCycle(cycle);

            if (!seen.has(key)) {
              seen.add(key);
              cycles.push(cycle);
            }
          }

          continue;
        }

        if (visited.has(nextId) || path.length >= maxCycleLength) {
          continue;
        }

        if (compareIds(nextId, startId) < 0) {
          continue;
        }

        visited.add(nextId);
        dfs(nextId, [...path, nextId]);
        visited.delete(nextId);
      }
    }

    dfs(startId, [startId]);
  }

  return cycles.sort((left, right) => {
    if (left.length !== right.length) {
      return left.length - right.length;
    }

    return left.join("|").localeCompare(right.join("|"));
  });
}
