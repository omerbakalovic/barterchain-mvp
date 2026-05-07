import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

export type WaitlistEntry = {
  email: string;
  useCase: string;
  createdAt: string;
  source: "supabase" | "local";
};

const waitlistFilePath = path.join(process.cwd(), "data", "waitlist.json");

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function saveToLocalFile(entry: WaitlistEntry) {
  await fs.mkdir(path.dirname(waitlistFilePath), { recursive: true });

  const existingEntries: WaitlistEntry[] = await fs
    .readFile(waitlistFilePath, "utf8")
    .then((content) => JSON.parse(content) as WaitlistEntry[])
    .catch(() => [] as WaitlistEntry[]);

  existingEntries.push(entry);
  await fs.writeFile(waitlistFilePath, JSON.stringify(existingEntries, null, 2), "utf8");
}

async function readFromLocalFile() {
  return fs
    .readFile(waitlistFilePath, "utf8")
    .then((content) => JSON.parse(content) as WaitlistEntry[])
    .catch(() => [] as WaitlistEntry[]);
}

export async function saveWaitlistEntry(input: {
  email: string;
  useCase: string;
}): Promise<WaitlistEntry> {
  const baseEntry = {
    email: input.email,
    useCase: input.useCase,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();

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

  await saveToLocalFile(localEntry);
  return localEntry;
}

export async function readWaitlistEntries(): Promise<WaitlistEntry[]> {
  const supabase = getSupabaseClient();

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

  return readFromLocalFile();
}
