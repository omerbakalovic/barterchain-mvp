import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  createChainProposal,
  isActiveProposalStatus,
  type ChainProposal,
  type ChainProposalParticipant,
  type ChainProposalStatus,
  type ChainProposalInput,
} from "@/lib/chain-proposals";
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

type ChainProposalRow = {
  id: string;
  chain_id: string;
  chain_summary: string;
  chain_score: number;
  participating_listings: string[];
  participants: ChainProposalParticipant[];
  status: ChainProposalStatus;
  created_at: string;
  updated_at: string;
};

function toRow(proposal: ChainProposal): ChainProposalRow {
  return {
    id: proposal.id,
    chain_id: proposal.chainId,
    chain_summary: proposal.chainSummary,
    chain_score: proposal.chainScore,
    participating_listings: proposal.participatingListings,
    participants: proposal.participants,
    status: proposal.status,
    created_at: proposal.createdAt,
    updated_at: proposal.updatedAt,
  };
}

function fromRow(row: ChainProposalRow): ChainProposal {
  return {
    id: row.id,
    chainId: row.chain_id,
    chainSummary: row.chain_summary,
    chainScore: row.chain_score,
    participatingListings: Array.isArray(row.participating_listings)
      ? row.participating_listings
      : [],
    participants: Array.isArray(row.participants) ? row.participants : [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ROW_COLUMNS =
  "id, chain_id, chain_summary, chain_score, participating_listings, participants, status, created_at, updated_at";

function getChainProposalFilePath(env: NodeJS.ProcessEnv = process.env) {
  return path.join(getDataRoot(env), "chain-proposals.json");
}

async function readFromLocalFile(env: NodeJS.ProcessEnv = process.env) {
  return fs
    .readFile(getChainProposalFilePath(env), "utf8")
    .then((content) => JSON.parse(content) as ChainProposal[])
    .catch(() => [] as ChainProposal[]);
}

async function writeToLocalFile(
  proposals: ChainProposal[],
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const filePath = getChainProposalFilePath(env);
  const result = await writeJsonFileSafe(filePath, proposals);
  return result.persisted;
}

async function readAllProposals(env: NodeJS.ProcessEnv = process.env): Promise<ChainProposal[]> {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("chain_proposals")
      .select(ROW_COLUMNS)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as ChainProposalRow[]).map(fromRow);
    }
  }

  return readFromLocalFile(env);
}

export async function readChainProposals(
  env: NodeJS.ProcessEnv = process.env
): Promise<ChainProposal[]> {
  const proposals = await readAllProposals(env);
  return proposals.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createStoredChainProposal(
  input: ChainProposalInput,
  env: NodeJS.ProcessEnv = process.env
) {
  const proposals = await readAllProposals(env);
  const conflictingProposal = proposals.find(
    (proposal) =>
      isActiveProposalStatus(proposal.status) &&
      proposal.participatingListings.some((listingId) =>
        input.listings.some((listing) => listing.id === listingId)
      )
  );

  if (conflictingProposal) {
    return {
      success: false as const,
      message: "One or more listings are already tied to another active proposal.",
      conflict: conflictingProposal,
    };
  }

  const proposal = createChainProposal(input);
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { error } = await supabase.from("chain_proposals").insert(toRow(proposal));

    if (!error) {
      return {
        success: true as const,
        proposal,
      };
    }
  }

  const localProposals = await readFromLocalFile(env);
  localProposals.push(proposal);
  await writeToLocalFile(localProposals, env);

  return {
    success: true as const,
    proposal,
  };
}

export async function findChainProposalById(id: string, env: NodeJS.ProcessEnv = process.env) {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("chain_proposals")
      .select(ROW_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return fromRow(data as ChainProposalRow);
    }

    if (!error) {
      return null;
    }
  }

  const proposals = await readFromLocalFile(env);
  return proposals.find((proposal) => proposal.id === id) ?? null;
}

export async function updateChainProposal(
  proposal: ChainProposal,
  env: NodeJS.ProcessEnv = process.env
) {
  const supabase = getSupabaseClient(env);

  if (supabase) {
    const { data, error } = await supabase
      .from("chain_proposals")
      .update(toRow(proposal))
      .eq("id", proposal.id)
      .select("id")
      .maybeSingle();

    if (!error) {
      return data ? proposal : null;
    }
  }

  const proposals = await readFromLocalFile(env);
  const proposalIndex = proposals.findIndex((entry) => entry.id === proposal.id);

  if (proposalIndex === -1) {
    return null;
  }

  proposals[proposalIndex] = proposal;
  await writeToLocalFile(proposals, env);
  return proposal;
}
