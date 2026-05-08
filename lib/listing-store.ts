import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

import { demoListings, type BarterListing } from "@/lib/barter-data";
import { isInBuffer } from "@/lib/buffer";
import {
  createListingId,
  toBarterListing,
  type ListingInput,
  type StoredListing,
} from "@/lib/listings";

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

function getListingsFilePath(env: NodeJS.ProcessEnv = process.env) {
  const dataRoot = env.BARTERCHAIN_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(dataRoot, "listings.json");
}

async function readFromLocalFile(env: NodeJS.ProcessEnv = process.env) {
  return fs
    .readFile(getListingsFilePath(env), "utf8")
    .then((content) => JSON.parse(content) as StoredListing[])
    .catch(() => [] as StoredListing[]);
}

async function saveToLocalFile(entry: StoredListing, env: NodeJS.ProcessEnv = process.env) {
  const filePath = getListingsFilePath(env);

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const existingEntries = await readFromLocalFile(env);
  existingEntries.push(entry);
  await fs.writeFile(filePath, JSON.stringify(existingEntries, null, 2), "utf8");
}

export async function saveListing(
  input: ListingInput,
  env: NodeJS.ProcessEnv = process.env
): Promise<StoredListing> {
  const baseEntry = {
    id: createListingId(input),
    ...input,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { error } = await supabase.from("listings").insert({
      id: baseEntry.id,
      title: baseEntry.title,
      description: baseEntry.description,
      category: baseEntry.category,
      value_estimate: baseEntry.valueEstimate,
      city: baseEntry.city,
      trust_score: baseEntry.trustScore,
      gives: baseEntry.gives,
      wants: baseEntry.wants,
      created_at: baseEntry.createdAt,
    });

    if (!error) {
      return {
        ...baseEntry,
        source: "supabase",
      };
    }
  }

  const localEntry: StoredListing = {
    ...baseEntry,
    source: "local",
  };

  await saveToLocalFile(localEntry, env);
  return localEntry;
}

export async function readStoredListings(
  env: NodeJS.ProcessEnv = process.env
): Promise<StoredListing[]> {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, title, description, category, value_estimate, city, trust_score, gives, wants, created_at"
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        category: entry.category,
        valueEstimate: entry.value_estimate,
        city: entry.city,
        trustScore: entry.trust_score,
        gives: entry.gives,
        wants: Array.isArray(entry.wants) ? entry.wants : [],
        createdAt: entry.created_at,
        source: "supabase",
      }));
    }
  }

  return readFromLocalFile(env);
}

export async function readMatcherListings(
  env: NodeJS.ProcessEnv = process.env
): Promise<BarterListing[]> {
  const storedListings = await readStoredListings(env);

  if (storedListings.length === 0) {
    return demoListings;
  }

  return [...demoListings, ...storedListings.map(toBarterListing)];
}

export async function readInventoryListings(
  env: NodeJS.ProcessEnv = process.env
): Promise<BarterListing[]> {
  const storedListings = await readStoredListings(env);
  return storedListings
    .filter((listing) => isInBuffer(listing.buffer))
    .map(toBarterListing);
}

export async function findStoredListingById(
  id: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<StoredListing | null> {
  const listings = await readStoredListings(env);
  return listings.find((listing) => listing.id === id) ?? null;
}

async function writeAllListings(
  listings: StoredListing[],
  env: NodeJS.ProcessEnv = process.env
) {
  const filePath = getListingsFilePath(env);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(listings, null, 2), "utf8");
}

export async function updateStoredListing(
  listing: StoredListing,
  env: NodeJS.ProcessEnv = process.env
): Promise<StoredListing | null> {
  const listings = await readStoredListings(env);
  const index = listings.findIndex((entry) => entry.id === listing.id);

  if (index === -1) {
    return null;
  }

  listings[index] = listing;
  await writeAllListings(listings, env);
  return listing;
}
