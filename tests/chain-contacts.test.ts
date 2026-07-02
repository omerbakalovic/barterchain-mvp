import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

import {
  attachContactsIfAccepted,
  getChainParticipantContacts,
} from "@/lib/chain-contacts";
import { createChainProposal, type ChainProposal } from "@/lib/chain-proposals";
import { saveListing } from "@/lib/listing-store";
import { demoListings } from "@/lib/barter-data";

const tempDirs: string[] = [];

async function makeTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-contacts-"));
  tempDirs.push(dir);
  const env: NodeJS.ProcessEnv = { ...process.env, BARTERCHAIN_DATA_DIR: dir };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  return env;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("getChainParticipantContacts resolves stored owner contact and falls back for demo listings", async () => {
  const env = await makeTempDataDir();

  const stored = await saveListing(
    {
      title: "Vintage road bike",
      description: "Steel frame commuter bike with lights and fresh tires.",
      category: "Mobility",
      valueEstimate: 180,
      city: "Konstanz",
      trustScore: 4.5,
      gives: "road bike",
      wants: ["record player"],
      ownerName: "Davor",
      ownerContact: "davor@example.com",
    },
    env
  );

  const demoListing = demoListings[0]!;
  const storedAsBarter = { ...demoListing, id: stored.id, trader: "Davor" };
  const proposal = createChainProposal({
    chainId: `${stored.id}|${demoListing.id}|${demoListings[1]!.id}`,
    chainSummary: "test chain",
    chainScore: 80,
    listings: [storedAsBarter, demoListing, demoListings[1]!],
  });

  const contacts = await getChainParticipantContacts(proposal, env);

  assert.equal(contacts.length, 3);

  const storedContact = contacts.find((entry) => entry.listingId === stored.id);
  assert.equal(storedContact?.name, "Davor");
  assert.equal(storedContact?.contact, "davor@example.com");

  const demoContact = contacts.find((entry) => entry.listingId === demoListing.id);
  assert.equal(demoContact?.contact, null);
  assert.ok(demoContact?.name, "demo participant keeps its display name");
});

test("attachContactsIfAccepted leaves pending proposals untouched", async () => {
  const env = await makeTempDataDir();
  const proposal = createChainProposal({
    chainId: demoListings.slice(0, 3).map((listing) => listing.id).join("|"),
    chainSummary: "pending chain",
    chainScore: 70,
    listings: demoListings.slice(0, 3),
  });

  const result = await attachContactsIfAccepted(proposal, env);
  assert.equal(result.status, "pending");
  assert.equal("contacts" in result, false);
});

test("attachContactsIfAccepted enriches accepted proposals with contacts", async () => {
  const env = await makeTempDataDir();
  const base = createChainProposal({
    chainId: demoListings.slice(0, 3).map((listing) => listing.id).join("|"),
    chainSummary: "accepted chain",
    chainScore: 90,
    listings: demoListings.slice(0, 3),
  });

  const accepted: ChainProposal = {
    ...base,
    status: "accepted",
    participants: base.participants.map((participant) => ({
      ...participant,
      status: "accepted",
      respondedAt: new Date().toISOString(),
    })),
  };

  const result = await attachContactsIfAccepted(accepted, env);
  assert.equal(result.status, "accepted");
  assert.ok(Array.isArray(result.contacts));
  assert.equal(result.contacts?.length, 3);
});
