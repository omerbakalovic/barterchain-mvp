import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

import { type ChainInvite, type ChainInviteParticipant } from "@/lib/chain-invites";
import { getDataRoot, writeJsonFileSafe } from "@/lib/data-dir";

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

type ChainInviteRow = {
  id: string;
  title: string;
  note: string | null;
  participants: ChainInviteParticipant[];
  created_at: string;
  updated_at: string;
};

const ROW_COLUMNS = "id, title, note, participants, created_at, updated_at";

function toRow(invite: ChainInvite): ChainInviteRow {
  return {
    id: invite.id,
    title: invite.title,
    note: invite.note,
    participants: invite.participants,
    created_at: invite.createdAt,
    updated_at: invite.updatedAt,
  };
}

function fromRow(row: ChainInviteRow): ChainInvite {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    participants: Array.isArray(row.participants) ? row.participants : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getChainInviteFilePath(env: NodeJS.ProcessEnv = process.env) {
  return path.join(getDataRoot(env), "chain-invites.json");
}

async function readFromLocalFile(env: NodeJS.ProcessEnv = process.env) {
  return fs
    .readFile(getChainInviteFilePath(env), "utf8")
    .then((content) => JSON.parse(content) as ChainInvite[])
    .catch(() => [] as ChainInvite[]);
}

async function writeToLocalFile(invites: ChainInvite[], env: NodeJS.ProcessEnv = process.env) {
  const result = await writeJsonFileSafe(getChainInviteFilePath(env), invites);
  return result.persisted;
}

export async function readChainInvites(
  env: NodeJS.ProcessEnv = process.env
): Promise<ChainInvite[]> {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("chain_invites")
      .select(ROW_COLUMNS)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as ChainInviteRow[]).map(fromRow);
    }
  }

  const invites = await readFromLocalFile(env);
  return invites.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createStoredChainInvite(
  invite: ChainInvite,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { error } = await supabase.from("chain_invites").insert(toRow(invite));

    if (!error) {
      return true;
    }
  }

  const invites = await readFromLocalFile(env);
  invites.push(invite);
  return writeToLocalFile(invites, env);
}

export async function findChainInviteById(
  id: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<ChainInvite | null> {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("chain_invites")
      .select(ROW_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (!error) {
      return data ? fromRow(data as ChainInviteRow) : null;
    }
  }

  const invites = await readFromLocalFile(env);
  return invites.find((invite) => invite.id === id) ?? null;
}

export async function updateStoredChainInvite(
  invite: ChainInvite,
  env: NodeJS.ProcessEnv = process.env
): Promise<ChainInvite | null> {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("chain_invites")
      .update(toRow(invite))
      .eq("id", invite.id)
      .select("id")
      .maybeSingle();

    if (!error) {
      return data ? invite : null;
    }
  }

  const invites = await readFromLocalFile(env);
  const index = invites.findIndex((entry) => entry.id === invite.id);

  if (index === -1) {
    return null;
  }

  invites[index] = invite;
  await writeToLocalFile(invites, env);
  return invite;
}
