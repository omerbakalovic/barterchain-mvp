import { promises as fs } from "node:fs";
import path from "node:path";

import {
  createChainProposal,
  isActiveProposalStatus,
  type ChainProposal,
  type ChainProposalInput,
} from "@/lib/chain-proposals";
import { getDataRoot, writeJsonFileSafe } from "@/lib/data-dir";

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

export async function readChainProposals(
  env: NodeJS.ProcessEnv = process.env
): Promise<ChainProposal[]> {
  const proposals = await readFromLocalFile(env);
  return proposals.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createStoredChainProposal(
  input: ChainProposalInput,
  env: NodeJS.ProcessEnv = process.env
) {
  const proposals = await readFromLocalFile(env);
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
  proposals.push(proposal);
  await writeToLocalFile(proposals, env);

  return {
    success: true as const,
    proposal,
  };
}

export async function findChainProposalById(id: string, env: NodeJS.ProcessEnv = process.env) {
  const proposals = await readFromLocalFile(env);
  return proposals.find((proposal) => proposal.id === id) ?? null;
}

export async function updateChainProposal(
  proposal: ChainProposal,
  env: NodeJS.ProcessEnv = process.env
) {
  const proposals = await readFromLocalFile(env);
  const proposalIndex = proposals.findIndex((entry) => entry.id === proposal.id);

  if (proposalIndex === -1) {
    return null;
  }

  proposals[proposalIndex] = proposal;
  await writeToLocalFile(proposals, env);
  return proposal;
}

