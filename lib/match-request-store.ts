import { promises as fs } from "node:fs";
import path from "node:path";

import type { MatchApiMode } from "@/lib/match-api";

export type MatchRequestEntry = {
  have: string;
  want: string;
  maxHops: number;
  engine: MatchApiMode;
  createdAt: string;
};

function getMatchRequestFilePath(env: NodeJS.ProcessEnv = process.env) {
  const dataRoot = env.BARTERCHAIN_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataRoot, "match-requests.json");
}

function shouldPersistMatchRequests(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== "test" || Boolean(env.BARTERCHAIN_DATA_DIR);
}

export async function readMatchRequestEntries(
  env: NodeJS.ProcessEnv = process.env
): Promise<MatchRequestEntry[]> {
  const filePath = getMatchRequestFilePath(env);

  return fs
    .readFile(filePath, "utf8")
    .then((content) => JSON.parse(content) as MatchRequestEntry[])
    .catch(() => [] as MatchRequestEntry[]);
}

export async function saveMatchRequestEntry(
  input: Omit<MatchRequestEntry, "createdAt">,
  env: NodeJS.ProcessEnv = process.env
) {
  if (!shouldPersistMatchRequests(env)) {
    return null;
  }

  const filePath = getMatchRequestFilePath(env);
  const entry: MatchRequestEntry = {
    ...input,
    createdAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const existingEntries = await readMatchRequestEntries(env);
  existingEntries.push(entry);
  await fs.writeFile(filePath, JSON.stringify(existingEntries, null, 2), "utf8");

  return entry;
}
