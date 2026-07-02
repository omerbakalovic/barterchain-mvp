import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getDataRoot, writeJsonFileSafe } from "@/lib/data-dir";
import type { MatchApiMode } from "@/lib/match-api";

export type MatchRequestEntry = {
  have: string;
  want: string;
  maxHops: number;
  engine: MatchApiMode;
  createdAt: string;
};

function getSupabaseClient(env: NodeJS.ProcessEnv = process.env) {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getMatchRequestFilePath(env: NodeJS.ProcessEnv = process.env) {
  return path.join(getDataRoot(env), "match-requests.json");
}

function shouldPersistMatchRequests(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== "test" || Boolean(env.BARTERCHAIN_DATA_DIR);
}

async function readFromLocalFile(env: NodeJS.ProcessEnv = process.env) {
  return fs
    .readFile(getMatchRequestFilePath(env), "utf8")
    .then((content) => JSON.parse(content) as MatchRequestEntry[])
    .catch(() => [] as MatchRequestEntry[]);
}

export async function readMatchRequestEntries(
  env: NodeJS.ProcessEnv = process.env
): Promise<MatchRequestEntry[]> {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("match_requests")
      .select("have, want, max_hops, engine, created_at")
      .order("created_at", { ascending: true });

    if (!error && data) {
      return data.map((entry) => ({
        have: entry.have,
        want: entry.want,
        maxHops: entry.max_hops,
        engine: entry.engine,
        createdAt: entry.created_at,
      }));
    }
  }

  return readFromLocalFile(env);
}

export async function saveMatchRequestEntry(
  input: Omit<MatchRequestEntry, "createdAt">,
  env: NodeJS.ProcessEnv = process.env
) {
  if (!shouldPersistMatchRequests(env)) {
    return null;
  }

  const entry: MatchRequestEntry = {
    ...input,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { error } = await supabase.from("match_requests").insert({
      have: entry.have,
      want: entry.want,
      max_hops: entry.maxHops,
      engine: entry.engine,
      created_at: entry.createdAt,
    });

    if (!error) {
      return entry;
    }
  }

  const filePath = getMatchRequestFilePath(env);
  const existingEntries = await readFromLocalFile(env);
  existingEntries.push(entry);

  const result = await writeJsonFileSafe(filePath, existingEntries);
  if (!result.persisted) {
    return null;
  }

  return entry;
}
