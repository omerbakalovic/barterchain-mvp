import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";

import { POST as acceptProposal } from "@/app/api/chain-proposals/[id]/accept/route";
import { POST as declineProposal } from "@/app/api/chain-proposals/[id]/decline/route";
import { GET, POST as createProposal } from "@/app/api/chain-proposals/route";
import { demoListings } from "@/lib/barter-data";
import { buildChainId } from "@/lib/chain-proposals";

const originalDataDir = process.env.BARTERCHAIN_DATA_DIR;
const tempDirs: string[] = [];

async function useTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-proposals-"));
  tempDirs.push(dir);
  process.env.BARTERCHAIN_DATA_DIR = dir;
  return dir;
}

function buildProposalPayload() {
  const listings = demoListings.slice(0, 4);

  return {
    chainId: buildChainId(listings),
    chainSummary:
      "Lena gives espresso machine to Samir -> Samir gives desk lamp to Noah -> Noah gives bike helmet to Mira -> Mira gives record player to Lena",
    chainScore: 97.4,
    listings,
  };
}

afterEach(async () => {
  process.env.BARTERCHAIN_DATA_DIR = originalDataDir;
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("chain proposals can be created and fully accepted", async () => {
  const dir = await useTempDataDir();
  const payload = buildProposalPayload();

  const createResponse = await createProposal(
    new Request("http://localhost:3000/api/chain-proposals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  );
  const created = (await createResponse.json()) as {
    proposal: {
      id: string;
      chainId: string;
      status: string;
      participants: Array<{ listingId: string; status: string }>;
    };
  };

  assert.equal(createResponse.status, 201);
  assert.equal(created.proposal.chainId, payload.chainId);
  assert.equal(created.proposal.status, "pending");
  assert.equal(created.proposal.participants.length, 4);

  let lastAcceptPayload: {
    proposal: {
      status: string;
      contacts?: Array<{ listingId: string; name: string; contact: string | null }>;
    };
  } | null = null;

  for (const listing of payload.listings) {
    const acceptResponse = await acceptProposal(
      new Request(`http://localhost:3000/api/chain-proposals/${created.proposal.id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listingId: listing.id }),
      }),
      {
        params: Promise.resolve({ id: created.proposal.id }),
      }
    );

    assert.equal(acceptResponse.status, 200);
    lastAcceptPayload = (await acceptResponse.json()) as typeof lastAcceptPayload;
  }

  assert.equal(lastAcceptPayload?.proposal.status, "accepted");
  assert.equal(
    lastAcceptPayload?.proposal.contacts?.length,
    4,
    "fully accepted proposal should reveal one contact entry per participant"
  );

  const listResponse = await GET();
  const listPayload = (await listResponse.json()) as {
    count: number;
    proposals: Array<{
      id: string;
      status: string;
      participants: Array<{ status: string }>;
    }>;
  };

  assert.equal(listPayload.count, 1);
  assert.equal(listPayload.proposals[0]?.status, "accepted");
  assert.ok(
    listPayload.proposals[0]?.participants.every((participant) => participant.status === "accepted")
  );

  const fileContent = await readFile(path.join(dir, "chain-proposals.json"), "utf8");
  const stored = JSON.parse(fileContent) as Array<{ status: string }>;
  assert.equal(stored[0]?.status, "accepted");
});

test("chain proposals can be declined and active listing conflicts are blocked", async () => {
  await useTempDataDir();
  const payload = buildProposalPayload();

  const createResponse = await createProposal(
    new Request("http://localhost:3000/api/chain-proposals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  );
  const created = (await createResponse.json()) as {
    proposal: {
      id: string;
      status: string;
    };
  };

  assert.equal(createResponse.status, 201);
  assert.equal(created.proposal.status, "pending");

  const conflictingResponse = await createProposal(
    new Request("http://localhost:3000/api/chain-proposals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  );

  assert.equal(conflictingResponse.status, 409);

  const declineResponse = await declineProposal(
    new Request(`http://localhost:3000/api/chain-proposals/${created.proposal.id}/decline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId: payload.listings[0]?.id }),
    }),
    {
      params: Promise.resolve({ id: created.proposal.id }),
    }
  );
  const declined = (await declineResponse.json()) as {
    proposal: {
      status: string;
      participants: Array<{ listingId: string; status: string }>;
    };
  };

  assert.equal(declineResponse.status, 200);
  assert.equal(declined.proposal.status, "declined");
  assert.equal(
    declined.proposal.participants.find((participant) => participant.listingId === payload.listings[0]?.id)?.status,
    "declined"
  );

  const replacementResponse = await createProposal(
    new Request("http://localhost:3000/api/chain-proposals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  );

  assert.equal(replacementResponse.status, 201);
});

