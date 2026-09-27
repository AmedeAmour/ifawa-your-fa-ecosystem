const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function storage() {
  const store = {};
  Object.defineProperties(store, {
    getItem: { value: (key) => store[key] ?? null },
    setItem: {
      value: (key, value) => {
        store[key] = value;
      },
    },
    removeItem: {
      value: (key) => {
        delete store[key];
      },
    },
  });
  return store;
}
function load(file, localStorage, supabase = null) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, window: { localStorage }, require: () => ({ supabase }) },
  );
  return exports;
}

test("read positions survive logout while private content is cleared and accounts remain isolated", () => {
  const disk = storage();
  const receipts = load("src/lib/read-receipts.ts", disk);
  receipts.rememberReceipt("alice", "conversation", "chat", "2026-09-15T12:00:00.000Z");
  receipts.rememberReceipt("alice", "notification", "comment-1");
  disk.setItem("ifawa.app-state", "private profile");
  disk.setItem("ifawa.cache.v3.alice.conversations", "private messages");
  load("src/lib/ifawa-cache.ts", disk).clearPrivateCaches();
  assert.equal(disk.getItem("ifawa.app-state"), null);
  assert.equal(disk.getItem("ifawa.cache.v3.alice.conversations"), null);
  const fresh = load("src/lib/read-receipts.ts", disk);
  assert.equal(fresh.readReceipts("alice").length, 2);
  assert.equal(fresh.readReceipts("bob").length, 0);
  assert.equal(fresh.readReceipts("alice")[0].read_at, "2026-09-15T12:00:00.000Z");
});

test("failed remote writes stay pending and are retried after reconnect", async () => {
  const disk = storage();
  let offline = true;
  const writes = [];
  const remote = {
    from() {
      return {
        async upsert(rows) {
          writes.push(rows);
          return { error: offline ? new Error("offline") : null };
        },
        select() {
          return { eq: async () => ({ data: [], error: null }) };
        },
      };
    },
  };
  const receipts = load("src/lib/read-receipts.ts", disk, remote);
  await assert.rejects(
    receipts.persistReceipt("alice", "conversation", "chat", "2026-09-15T12:00:00Z"),
  );
  assert.equal(receipts.readReceipts("alice")[0].pending, true);
  offline = false;
  await receipts.loadReadReceipts("alice");
  assert.equal(receipts.readReceipts("alice")[0].pending, false);
  assert.equal(writes.length, 2);
  assert.equal(writes[1][0].profile_id, "alice");
});

test("an old response cannot overwrite a newer local read position", async () => {
  const disk = storage();
  const receipts = load("src/lib/read-receipts.ts", disk, {
    from() {
      return {
        upsert: async () => ({ error: null }),
        select() {
          return {
            eq: async () => ({
              error: null,
              data: [{ kind: "conversation", item_id: "chat", read_at: "2026-09-15T10:00:00Z" }],
            }),
          };
        },
      };
    },
  });
  receipts.rememberReceipt("alice", "conversation", "chat", "2026-09-15T12:00:00Z");
  await receipts.loadReadReceipts("alice");
  assert.equal(receipts.readReceipts("alice")[0].read_at, "2026-09-15T12:00:00Z");
});

test("reading a notification never advances a conversation read position", () => {
  const receipts = load("src/lib/read-receipts.ts", storage());
  receipts.rememberReceipt("alice", "conversation", "chat", "2026-09-15T10:00:00Z");
  receipts.rememberReceipt("alice", "notification", "comment-1", "2026-09-15T12:00:00Z");
  assert.equal(
    receipts.readReceipts("alice").find((row) => row.kind === "conversation").read_at,
    "2026-09-15T10:00:00Z",
  );
});
