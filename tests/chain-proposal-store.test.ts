import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { demoListings } from "@/lib/barter-data";
import {
  applyChainProposalDecision,
  buildChainId,
  CHAIN_PROPOSAL_ACCEPTED,
  CHAIN_PROPOSAL_DECLINED,
  type ChainProposal,
  type ChainProposalInput,
} from "@/lib/chain-proposals";
import {
  createStoredChainProposal,
  findChainProposalById,
  readChainProposals,
  updateChainProposal,
} from "@/lib/chain-proposal-store";

const tempDirs: string[] = [];

async function makeTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-cp-store-"));
  tempDirs.push(dir);
  const env: NodeJS.ProcessEnv = { ...process.env, BARTERCHAIN_DATA_DIR: dir };
  return { dir, env };
}

function buildInput(start: number, end: number): ChainProposalInput {
  const listings = demoListings.slice(start, end);
  return {
    chainId: buildChainId(listings),
    chainSummary: listings.map((listing) => listing.trader).join(" -> "),
    chainScore: 80,
    listings,
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("createStoredChainProposal persists a new pending proposal", async () => {
  const { env } = await makeTempDataDir();
  const result = await createStoredChainProposal(buildInput(0, 4), env);

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.proposal.status, "pending");
  assert.equal(result.proposal.participatingListings.length, 4);

  const stored = await readChainProposals(env);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]?.id, result.proposal.id);
});

test("createStoredChainProposal blocks when a pending proposal already references a listing", async () => {
  const { env } = await makeTempDataDir();
  const first = await createStoredChainProposal(buildInput(0, 4), env);
  assert.equal(first.success, true);

  const conflicting = await createStoredChainProposal(buildInput(0, 4), env);
  assert.equal(conflicting.success, false);
  if (conflicting.success) return;

  assert.match(conflicting.message, /active proposal/);
  assert.equal(conflicting.conflict.id, first.success ? first.proposal.id : "");
});

test("an accepted proposal also blocks new proposals on overlapping listings", async () => {
  const { env } = await makeTempDataDir();
  const created = await createStoredChainProposal(buildInput(0, 4), env);
  assert.equal(created.success, true);
  if (!created.success) return;

  let proposal: ChainProposal = created.proposal;
  for (const listing of proposal.participatingListings) {
    const decision = applyChainProposalDecision({
      proposal,
      listingId: listing,
      decision: "accepted",
    });
    assert.equal(decision.success, true);
    if (!decision.success) return;
    proposal = decision.proposal;
  }

  const persisted = await updateChainProposal(proposal, env);
  assert.equal(persisted?.status, CHAIN_PROPOSAL_ACCEPTED);

  const conflict = await createStoredChainProposal(buildInput(0, 4), env);
  assert.equal(conflict.success, false);
});

test("a declined proposal frees its listings for a fresh proposal", async () => {
  const { env } = await makeTempDataDir();
  const created = await createStoredChainProposal(buildInput(0, 4), env);
  assert.equal(created.success, true);
  if (!created.success) return;

  const decision = applyChainProposalDecision({
    proposal: created.proposal,
    listingId: created.proposal.participatingListings[0]!,
    decision: "declined",
  });
  assert.equal(decision.success, true);
  if (!decision.success) return;
  assert.equal(decision.proposal.status, CHAIN_PROPOSAL_DECLINED);

  await updateChainProposal(decision.proposal, env);

  const replacement = await createStoredChainProposal(buildInput(0, 4), env);
  assert.equal(replacement.success, true);
});

test("findChainProposalById returns null for an unknown id", async () => {
  const { env } = await makeTempDataDir();
  const result = await findChainProposalById("does-not-exist", env);
  assert.equal(result, null);
});

test("findChainProposalById returns the stored proposal when it exists", async () => {
  const { env } = await makeTempDataDir();
  const created = await createStoredChainProposal(buildInput(0, 4), env);
  assert.equal(created.success, true);
  if (!created.success) return;

  const found = await findChainProposalById(created.proposal.id, env);
  assert.equal(found?.id, created.proposal.id);
});

test("updateChainProposal returns null when the proposal id is missing", async () => {
  const { env } = await makeTempDataDir();
  const created = await createStoredChainProposal(buildInput(0, 4), env);
  assert.equal(created.success, true);
  if (!created.success) return;

  const phantom: ChainProposal = { ...created.proposal, id: "phantom-id" };
  const result = await updateChainProposal(phantom, env);
  assert.equal(result, null);
});

test("readChainProposals returns proposals sorted by createdAt descending", async () => {
  const { dir, env } = await makeTempDataDir();
  const earlier: ChainProposal = {
    id: "proposal-early",
    chainId: "chain-early",
    chainSummary: "early",
    chainScore: 50,
    participatingListings: ["x"],
    participants: [],
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const later: ChainProposal = {
    ...earlier,
    id: "proposal-late",
    chainId: "chain-late",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  };

  const filePath = path.join(dir, "chain-proposals.json");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify([earlier, later]), "utf8");

  const sorted = await readChainProposals(env);
  assert.equal(sorted[0]?.id, "proposal-late");
  assert.equal(sorted[1]?.id, "proposal-early");
});
