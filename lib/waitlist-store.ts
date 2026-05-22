import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getDataRoot, writeJsonFileSafe } from "@/lib/data-dir";

export type WaitlistEntry = {
  email: string;
  useCase: string;
  createdAt: string;
  source: "supabase" | "local";
};

function getWaitlistFilePath(env: NodeJS.ProcessEnv = process.env) {
  return path.join(getDataRoot(env), "waitlist.json");
}

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

async function saveToLocalFile(entry: WaitlistEntry, env: NodeJS.ProcessEnv = process.env) {
  const filePath = getWaitlistFilePath(env);

  const existingEntries: WaitlistEntry[] = await fs
    .readFile(filePath, "utf8")
    .then((content) => JSON.parse(content) as WaitlistEntry[])
    .catch(() => [] as WaitlistEntry[]);

  existingEntries.push(entry);
  await writeJsonFileSafe(filePath, existingEntries);
}

async function readFromLocalFile(env: NodeJS.ProcessEnv = process.env) {
  return fs
    .readFile(getWaitlistFilePath(env), "utf8")
    .then((content) => JSON.parse(content) as WaitlistEntry[])
    .catch(() => [] as WaitlistEntry[]);
}

export async function saveWaitlistEntry(
  input: {
    email: string;
    useCase: string;
  },
  env: NodeJS.ProcessEnv = process.env
): Promise<WaitlistEntry> {
  const baseEntry = {
    email: input.email,
    useCase: input.useCase,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { error } = await supabase.from("waitlist_entries").insert({
      email: baseEntry.email,
      use_case: baseEntry.useCase,
      created_at: baseEntry.createdAt,
    });

    if (!error) {
      return { ...baseEntry, source: "supabase" };
    }
  }

  const localEntry: WaitlistEntry = {
    ...baseEntry,
    source: "local",
  };

  await saveToLocalFile(localEntry, env);
  return localEntry;
}

export async function readWaitlistEntries(
  env: NodeJS.ProcessEnv = process.env
): Promise<WaitlistEntry[]> {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("waitlist_entries")
      .select("email, use_case, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map((entry) => ({
        email: entry.email,
        useCase: entry.use_case ?? "",
        createdAt: entry.created_at,
        source: "supabase",
      }));
    }
  }

  return readFromLocalFile(env);
}
