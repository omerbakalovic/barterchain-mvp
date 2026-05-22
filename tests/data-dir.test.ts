import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { getDataRoot } from "@/lib/data-dir";

test("getDataRoot uses /tmp on Vercel", () => {
  const root = getDataRoot({ VERCEL: "1" });
  assert.equal(root, path.join(os.tmpdir(), "barterchain-data"));
});

test("getDataRoot honors BARTERCHAIN_DATA_DIR override", () => {
  const root = getDataRoot({ BARTERCHAIN_DATA_DIR: "/custom/data" });
  assert.equal(root, "/custom/data");
});
