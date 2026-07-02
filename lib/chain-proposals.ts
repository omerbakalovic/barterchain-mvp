import { type BarterListing } from "@/lib/barter-data";
import { type MatchResultChain } from "@/lib/match-results";

export const CHAIN_PROPOSAL_PENDING = "pending";
export const CHAIN_PROPOSAL_ACCEPTED = "accepted";
export const CHAIN_PROPOSAL_DECLINED = "declined";

export const ACTIVE_CHAIN_PROPOSAL_STATUSES = [
  CHAIN_PROPOSAL_PENDING,
  CHAIN_PROPOSAL_ACCEPTED,
] as const;

export type ChainProposalStatus =
  | typeof CHAIN_PROPOSAL_PENDING
  | typeof CHAIN_PROPOSAL_ACCEPTED
  | typeof CHAIN_PROPOSAL_DECLINED;

export type ChainProposalParticipantStatus = ChainProposalStatus;

export type ChainProposalParticipant = {
  listingId: string;
  participantId: string;
  name: string;
  status: ChainProposalParticipantStatus;
  respondedAt: string | null;
};

export type ChainProposal = {
  id: string;
  chainId: string;
  chainSummary: string;
  chainScore: number;
  participatingListings: string[];
  participants: ChainProposalParticipant[];
  status: ChainProposalStatus;
  createdAt: string;
  updatedAt: string;
};

export type ChainProposalInput = {
  chainId: string;
  chainSummary: string;
  chainScore: number;
  listings: BarterListing[];
};

export type ChainParticipantContact = {
  listingId: string;
  name: string;
  contact: string | null;
};

/**
 * A proposal as returned by the API: once fully accepted, the response is
 * enriched with participant contacts so the chain can coordinate directly.
 * The contacts field is response-only and never persisted with the proposal.
 */
export type ChainProposalWithContacts = ChainProposal & {
  contacts?: ChainParticipantContact[];
};

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildParticipantId(listing: BarterListing) {
  const label = listing.title ?? listing.trader ?? listing.id;
  const slug = slugify(label) || "participant";
  return `${slug}-${listing.id}`;
}

export function buildChainId(listings: Array<{ id: string }>) {
  return listings.map((listing) => listing.id).join("|");
}

export function isActiveProposalStatus(status: ChainProposalStatus) {
  return ACTIVE_CHAIN_PROPOSAL_STATUSES.includes(
    status as (typeof ACTIVE_CHAIN_PROPOSAL_STATUSES)[number]
  );
}

export function validateChainProposalInput(
  payload: Record<string, unknown>
):
  | { success: true; data: ChainProposalInput }
  | { success: false; errors: string[] } {
  const chainId = normalizeWhitespace(`${payload.chainId ?? ""}`);
  const chainSummary = `${payload.chainSummary ?? ""}`.trim();
  const chainScore = Number(payload.chainScore);
  const listings = Array.isArray(payload.listings) ? payload.listings : [];
  const errors: string[] = [];

  if (!chainId) {
    errors.push("Chain id is required.");
  }

  if (chainSummary.length < 5) {
    errors.push("Chain summary is required.");
  }

  if (!Number.isFinite(chainScore)) {
    errors.push("Chain score must be a valid number.");
  }

  if (listings.length < 3) {
    errors.push("Chain proposals require at least 3 participating listings.");
  }

  const normalizedListings: BarterListing[] = [];
  const listingIds = new Set<string>();

  for (const listing of listings) {
    if (!listing || typeof listing !== "object") {
      errors.push("Each participating listing must be an object.");
      continue;
    }

    const entry = listing as Record<string, unknown>;
    const id = normalizeWhitespace(`${entry.id ?? ""}`);
    const trader = normalizeWhitespace(`${entry.trader ?? ""}`);
    const title = typeof entry.title === "string" ? entry.title : undefined;
    const city = normalizeWhitespace(`${entry.city ?? ""}`);
    const gives = normalizeWhitespace(`${entry.gives ?? ""}`);
    const wants = Array.isArray(entry.wants)
      ? entry.wants.map((value) => normalizeWhitespace(`${value ?? ""}`)).filter(Boolean)
      : [];
    const category = normalizeWhitespace(`${entry.category ?? ""}`);
    const categorySlug = normalizeWhitespace(`${entry.categorySlug ?? ""}`);
    const condition = entry.condition;
    const estimatedValue = Number(entry.estimatedValue);
    const shipping = entry.shipping;
    const trustScore = Number(entry.trustScore);
    const source =
      entry.source === "demo" || entry.source === "supabase" || entry.source === "local"
        ? entry.source
        : undefined;

    if (!id) {
      errors.push("Each participating listing needs an id.");
      continue;
    }

    if (listingIds.has(id)) {
      errors.push("A chain proposal cannot repeat the same listing.");
      continue;
    }

    if (!trader) {
      errors.push(`Listing ${id} is missing the trader name.`);
      continue;
    }

    if (!city || !gives || wants.length === 0 || !category || !categorySlug) {
      errors.push(`Listing ${id} is missing required barter fields.`);
      continue;
    }

    if (
      (condition !== "new" && condition !== "excellent" && condition !== "good" && condition !== "fair") ||
      (shipping !== "local-only" && shipping !== "domestic") ||
      !Number.isFinite(estimatedValue) ||
      !Number.isFinite(trustScore)
    ) {
      errors.push(`Listing ${id} has invalid barter metadata.`);
      continue;
    }

    listingIds.add(id);
    normalizedListings.push({
      id,
      trader,
      title,
      description: typeof entry.description === "string" ? entry.description : undefined,
      city,
      gives,
      wants,
      category,
      categorySlug,
      condition,
      estimatedValue,
      shipping,
      trustScore,
      source,
    });
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  const derivedChainId = buildChainId(normalizedListings);

  if (chainId !== derivedChainId) {
    return {
      success: false,
      errors: ["Chain id does not match the participating listings."],
    };
  }

  return {
    success: true,
    data: {
      chainId,
      chainSummary,
      chainScore: Number(chainScore.toFixed(2)),
      listings: normalizedListings,
    },
  };
}

export function createChainProposal(input: ChainProposalInput, now = new Date()): ChainProposal {
  const timestamp = now.toISOString();

  return {
    id: `proposal-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    chainId: input.chainId,
    chainSummary: input.chainSummary,
    chainScore: Number(input.chainScore.toFixed(2)),
    participatingListings: input.listings.map((listing) => listing.id),
    participants: input.listings.map((listing) => ({
      listingId: listing.id,
      participantId: buildParticipantId(listing),
      name: listing.title ?? listing.trader,
      status: CHAIN_PROPOSAL_PENDING,
      respondedAt: null,
    })),
    status: CHAIN_PROPOSAL_PENDING,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function applyChainProposalDecision(input: {
  proposal: ChainProposal;
  listingId: string;
  decision: "accepted" | "declined";
  now?: Date;
}) {
  const timestamp = (input.now ?? new Date()).toISOString();
  const participants: ChainProposalParticipant[] = input.proposal.participants.map((participant) => {
    if (participant.listingId !== input.listingId) {
      return participant;
    }

    return {
      ...participant,
      status: input.decision,
      respondedAt: timestamp,
    };
  });

  const participant = participants.find((entry) => entry.listingId === input.listingId);

  if (!participant) {
    return {
      success: false as const,
      message: "The listing does not belong to this proposal.",
    };
  }

  const status: ChainProposalStatus = participants.some((entry) => entry.status === CHAIN_PROPOSAL_DECLINED)
    ? CHAIN_PROPOSAL_DECLINED
    : participants.every((entry) => entry.status === CHAIN_PROPOSAL_ACCEPTED)
      ? CHAIN_PROPOSAL_ACCEPTED
      : CHAIN_PROPOSAL_PENDING;

  return {
    success: true as const,
    proposal: {
      ...input.proposal,
      participants,
      status,
      updatedAt: timestamp,
    },
  };
}

export function toChainProposalPayload(chain: MatchResultChain) {
  return {
    chainId: chain.chainId,
    chainSummary: chain.summary,
    chainScore: chain.score,
    listings: chain.listings,
  };
}


