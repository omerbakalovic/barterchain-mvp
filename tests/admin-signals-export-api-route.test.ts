import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { GET } from "@/app/api/admin/signals/export/route";

const originalNodeEnv = process.env.NODE_ENV;
const originalAccessKey = process.env.ADMIN_SIGNALS_ACCESS_KEY;

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalAccessKey === undefined) {
    delete process.env.ADMIN_SIGNALS_ACCESS_KEY;
  } else {
    process.env.ADMIN_SIGNALS_ACCESS_KEY = originalAccessKey;
  }
});

test("export route returns signals JSON in non-production mode without an access key", async () => {
  process.env.NODE_ENV = "development";
  delete process.env.ADMIN_SIGNALS_ACCESS_KEY;

  const response = await GET(new Request("http://localhost:3000/api/admin/signals/export"));

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition") ?? "", /attachment; filename="barterchain-signals-/);
  assert.equal(response.headers.get("cache-control"), "no-store");

  const body = (await response.json()) as {
    generatedAt: string;
    filters: { item: string; city: string; trust: string; source: string };
    signals: { totals: unknown; topRequestedItems: unknown[]; mismatches: unknown[] };
  };

  assert.match(body.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(body.filters.source, "all");
  assert.ok(Array.isArray(body.signals.topRequestedItems));
  assert.ok(Array.isArray(body.signals.mismatches));
});

test("export route refuses requests in production when no access key is supplied", async () => {
  process.env.NODE_ENV = "production";
  process.env.ADMIN_SIGNALS_ACCESS_KEY = "secret-key";

  const response = await GET(new Request("http://localhost:3000/api/admin/signals/export"));
  assert.equal(response.status, 404);
});

test("export route refuses requests in production when the access key does not match", async () => {
  process.env.NODE_ENV = "production";
  process.env.ADMIN_SIGNALS_ACCESS_KEY = "secret-key";

  const response = await GET(
    new Request("http://localhost:3000/api/admin/signals/export?key=not-the-right-key")
  );
  assert.equal(response.status, 404);
});

test("export route returns signals when the production access key matches", async () => {
  process.env.NODE_ENV = "production";
  process.env.ADMIN_SIGNALS_ACCESS_KEY = "secret-key";

  const response = await GET(
    new Request("http://localhost:3000/api/admin/signals/export?key=secret-key")
  );
  assert.equal(response.status, 200);

  const body = (await response.json()) as { signals: { totals: unknown } };
  assert.ok(body.signals.totals);
});

test("export route propagates item, city, trust, and source filters", async () => {
  process.env.NODE_ENV = "development";

  const response = await GET(
    new Request(
      "http://localhost:3000/api/admin/signals/export?item=Espresso&city=Berlin&trust=high&source=match"
    )
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as { filters: { item: string; city: string; trust: string; source: string } };
  assert.equal(body.filters.item, "espresso");
  assert.equal(body.filters.city, "berlin");
  assert.equal(body.filters.trust, "high");
  assert.equal(body.filters.source, "match");
});

test("export route falls back to source=all for unknown source values", async () => {
  process.env.NODE_ENV = "development";

  const response = await GET(
    new Request("http://localhost:3000/api/admin/signals/export?source=garbage")
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { filters: { source: string } };
  assert.equal(body.filters.source, "all");
});
