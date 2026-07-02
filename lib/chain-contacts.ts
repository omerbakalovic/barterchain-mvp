import { readStoredListings } from "@/lib/listing-store";
import type { ChainParticipantContact, ChainProposal } from "@/lib/chain-proposals";

export type { ChainParticipantContact } from "@/lib/chain-proposals";

/**
 * Resolve the private contact details for every participant of a proposal.
 *
 * Contacts live only on stored listings (owner_contact) and are never part of
 * the public matching payload. They are attached to a proposal response only
 * once the proposal is fully accepted — accepting a chain is the participants'
 * consent to be introduced to each other.
 *
 * Demo listings have no stored contact and resolve to null.
 */
export async function getChainParticipantContacts(
  proposal: ChainProposal,
  env: NodeJS.ProcessEnv = process.env
): Promise<ChainParticipantContact[]> {
  const storedListings = await readStoredListings(env);

  return proposal.participants.map((participant) => {
    const listing = storedListings.find((entry) => entry.id === participant.listingId);

    return {
      listingId: participant.listingId,
      name: listing?.ownerName || participant.name,
      contact: listing?.ownerContact || null,
    };
  });
}

export async function attachContactsIfAccepted<T extends ChainProposal>(
  proposal: T,
  env: NodeJS.ProcessEnv = process.env
): Promise<T & { contacts?: ChainParticipantContact[] }> {
  if (proposal.status !== "accepted") {
    return proposal;
  }

  const contacts = await getChainParticipantContacts(proposal, env);
  return { ...proposal, contacts };
}
