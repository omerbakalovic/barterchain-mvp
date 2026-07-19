import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

import { GET as listInvites, POST as createInvite } from "@/app/api/chain-invites/route";
import { GET as getInvite } from "@/app/api/chain-invites/[id]/route";
import { POST as respond } from "@/app/api/chain-invites/[id]/respond/route";

const originalDataDir = process.env.BARTERCHAIN_DATA_DIR;
const originalNodeEnv = process.env.NODE_ENV;
const originalAccessKey = process.env.ADMIN_SIGNALS_ACCESS_KEY;
const tempDirs: string[] = [];

async function useTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-invites-"));
  tempDirs.push(dir);
  process.env.BARTERCHAIN_DATA_DIR = dir;
  return dir;
}

afterEach(async () => {
  process.env.BARTERCHAIN_DATA_DIR = originalDataDir;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalAccessKey === undefined) delete process.env.ADMIN_SIGNALS_ACCESS_KEY;
  else process.env.ADMIN_SIGNALS_ACCESS_KEY = originalAccessKey;

  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function buildCreateRequest(extra: Record<string, unknown> = {}) {
  return new Request("http://localhost:3000/api/chain-invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Apple-Kaskade",
      participants: [
        { label: "Sulz", gives: "17 Pro Max", wants: "16 Pro Max" },
        { label: "Amelie", gives: "17 Pro", wants: "17 Pro Max" },
        { label: "Langwedel", gives: "16 Pro Max", wants: "17 Pro" },
      ],
      ...extra,
    }),
  });
}

function respondRequest(id: string, body: Record<string, unknown>) {
  return [
    new Request(`http://localhost:3000/api/chain-invites/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  ] as const;
}

test("full lifecycle: create, respond, contacts revealed only when all accepted", async () => {
  await useTempDataDir();

  const createResponse = await createInvite(buildCreateRequest());
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()) as {
    invite: { id: string };
    url: string;
  };
  assert.match(created.url, /^\/chain\//);

  const id = created.invite.id;

  const first = await respond(
    ...respondRequest(id, { participantId: "p1", decision: "accepted", contact: "sulz@example.com" })
  );
  assert.equal(first.status, 200);
  const firstPayload = (await first.json()) as {
    invite: { status: string; participants: Array<{ contact: string | null }> };
  };
  assert.equal(firstPayload.invite.status, "pending");
  assert.equal(
    firstPayload.invite.participants.every((p) => p.contact === null),
    true,
    "contacts must stay hidden while pending"
  );

  await respond(...respondRequest(id, { participantId: "p2", decision: "accepted" }));
  const last = await respond(
    ...respondRequest(id, { participantId: "p3", decision: "accepted", contact: "lw@example.com" })
  );
  const lastPayload = (await last.json()) as {
    invite: { status: string; participants: Array<{ id: string; contact: string | null }> };
  };
  assert.equal(lastPayload.invite.status, "accepted");
  assert.equal(
    lastPayload.invite.participants.find((p) => p.id === "p1")?.contact,
    "sulz@example.com"
  );

  const getResponse = await getInvite(
    new Request(`http://localhost:3000/api/chain-invites/${id}`),
    { params: Promise.resolve({ id }) }
  );
  const getPayload = (await getResponse.json()) as { invite: { status: string } };
  assert.equal(getPayload.invite.status, "accepted");
});

test("responding twice or after a decline returns 409", async () => {
  await useTempDataDir();
  const createResponse = await createInvite(buildCreateRequest());
  const created = (await createResponse.json()) as { invite: { id: string } };
  const id = created.invite.id;

  await respond(...respondRequest(id, { participantId: "p1", decision: "accepted" }));
  const again = await respond(...respondRequest(id, { participantId: "p1", decision: "accepted" }));
  assert.equal(again.status, 409);

  await respond(...respondRequest(id, { participantId: "p2", decision: "declined" }));
  const afterDecline = await respond(
    ...respondRequest(id, { participantId: "p3", decision: "accepted" })
  );
  assert.equal(afterDecline.status, 409);
});

test("creation is gated by the admin key in production", async () => {
  await useTempDataDir();
  process.env.NODE_ENV = "production";
  process.env.ADMIN_SIGNALS_ACCESS_KEY = "secret";

  const withoutKey = await createInvite(buildCreateRequest());
  assert.equal(withoutKey.status, 404);

  const withKey = await createInvite(buildCreateRequest({ key: "secret" }));
  assert.equal(withKey.status, 201);
});

test("listing requires the admin key in production but the public GET does not", async () => {
  await useTempDataDir();

  const createResponse = await createInvite(buildCreateRequest());
  const created = (await createResponse.json()) as { invite: { id: string } };

  process.env.NODE_ENV = "production";
  process.env.ADMIN_SIGNALS_ACCESS_KEY = "secret";

  const listBlocked = await listInvites(
    new Request("http://localhost:3000/api/chain-invites")
  );
  assert.equal(listBlocked.status, 404);

  const listAllowed = await listInvites(
    new Request("http://localhost:3000/api/chain-invites?key=secret")
  );
  assert.equal(listAllowed.status, 200);

  const publicGet = await getInvite(
    new Request(`http://localhost:3000/api/chain-invites/${created.invite.id}`),
    { params: Promise.resolve({ id: created.invite.id }) }
  );
  assert.equal(publicGet.status, 200);
});

test("unknown chain and invalid payloads are rejected", async () => {
  await useTempDataDir();

  const missing = await getInvite(
    new Request("http://localhost:3000/api/chain-invites/nope"),
    { params: Promise.resolve({ id: "nope" }) }
  );
  assert.equal(missing.status, 404);

  const createResponse = await createInvite(buildCreateRequest());
  const created = (await createResponse.json()) as { invite: { id: string } };

  const badDecision = await respond(
    ...respondRequest(created.invite.id, { participantId: "p1", decision: "maybe" })
  );
  assert.equal(badDecision.status, 400);

  const noParticipant = await respond(
    ...respondRequest(created.invite.id, { decision: "accepted" })
  );
  assert.equal(noParticipant.status, 400);
});
