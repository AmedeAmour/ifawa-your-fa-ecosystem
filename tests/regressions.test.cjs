const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(relative, dependencies, window) {
  const source = fs.readFileSync(relative, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    window,
    console,
    AbortSignal,
    require(name) {
      if (name === "./image-webp" && !(name in dependencies))
        return { photoToWebP: async (file) => file };
      if (name === "./read-receipts" && !(name in dependencies))
        return {
          persistReceipt: async () => {},
          loadReadReceipts: async () => [],
          readReceipts: () => [],
        };
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("changing accounts clears profile, feed and device saves before any new remote data", () => {
  const store = load(
    "src/lib/store.ts",
    {
      react: { useSyncExternalStore: (_, snapshot) => snapshot() },
    },
    { localStorage: memoryStorage() },
  );
  store.actions.setCurrentUserId("alice");
  store.actions.majProfil({ pseudo: "Alice", signe: "Private sign" });
  store.actions.remplacerPosts([{ id: "private-post" }]);
  store.actions.toggleSavedPost("private-post");
  store.actions.setCurrentUserId("bob");
  assert.equal(store.useApp().currentUserId, "bob");
  assert.equal(store.useApp().profileReady, false);
  assert.equal(store.useApp().profil.signe, "");
  assert.equal(store.useApp().posts.length, 0);
  assert.equal(store.useApp().savedPostIds.length, 0);
  store.actions.majProfil({ initie: true });
  assert.equal(store.useApp().profileReady, true);
  store.actions.setCurrentUserId(undefined);
  assert.equal(store.useApp().currentUserId, undefined);
  assert.equal(store.useApp().profileReady, false);
});

test("blocked browser storage does not prevent account isolation or local interaction", () => {
  const fail = () => {
    throw new Error("Storage disabled");
  };
  const store = load(
    "src/lib/store.ts",
    {
      react: { useSyncExternalStore: (_, snapshot) => snapshot() },
    },
    { localStorage: { getItem: fail, setItem: fail, removeItem: fail } },
  );
  assert.doesNotThrow(() => store.actions.setCurrentUserId("alice"));
  assert.doesNotThrow(() => store.actions.toggleSavedPost("one"));
  assert.doesNotThrow(() => store.actions.setCurrentUserId("bob"));
  assert.equal(store.useApp().savedPostIds.length, 0);
});

test("existing profile login never replays stale onboarding metadata or writes profile data", async () => {
  const writes = [];
  const supabase = {
    auth: {
      signInWithPassword: async () => ({
        error: null,
        data: {
          user: {
            id: "alice",
            user_metadata: { username: "old_name", path: "initiated" },
          },
        },
      }),
    },
    from(table) {
      assert.equal(table, "profiles");
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { id: "alice" }, error: null }),
        upsert: (value) => {
          writes.push(value);
          return Promise.resolve({ error: null });
        },
      };
      return query;
    },
  };
  const auth = load(
    "src/lib/ifawa-auth.ts",
    {
      "./supabase": { supabase },
      "./store": { actions: {} },
      "./ifawa-cache": { clearPrivateCaches() {} },
    },
    { localStorage: memoryStorage() },
  );
  const result = await auth.signInWithEmail(" Alice@example.org ", "password");
  assert.equal(result.user.id, "alice");
  assert.equal(writes.length, 0);
});

test("login surfaces profile read failure instead of overwriting an unknown existing profile", async () => {
  let writes = 0;
  const expected = new Error("database unavailable");
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: null, error: expected }),
    upsert: () => {
      writes++;
    },
  };
  const auth = load(
    "src/lib/ifawa-auth.ts",
    {
      "./supabase": {
        supabase: {
          auth: {
            signInWithPassword: async () => ({ error: null, data: { user: { id: "alice" } } }),
          },
          from: () => query,
        },
      },
      "./store": { actions: {} },
      "./ifawa-cache": { clearPrivateCaches() {} },
    },
    { localStorage: memoryStorage() },
  );
  await assert.rejects(auth.signInWithEmail("alice@example.org", "password"), expected);
  assert.equal(writes, 0);
});

test("discovery onboarding preserves the optional presentation without inventing Fa details", async () => {
  const writes = [];
  const storage = memoryStorage();
  storage.setItem(
    "ifawa.pending-onboarding",
    JSON.stringify({
      email: "alice@example.org",
      draft: { pseudo: "Alice", initie: false, temoignage: "Je découvre le Fa." },
    }),
  );
  const auth = load(
    "src/lib/ifawa-auth.ts",
    {
      "./supabase": {
        supabase: {
          auth: {
            signInWithPassword: async () => ({ error: null, data: { user: { id: "alice" } } }),
          },
          from(table) {
            const query = {
              select: () => query,
              eq: () => query,
              maybeSingle: async () => ({ data: null, error: null }),
              upsert: async (value) => {
                writes.push({ table, value });
                return { error: null };
              },
            };
            return query;
          },
        },
      },
      "./store": { actions: {} },
      "./ifawa-cache": { clearPrivateCaches() {} },
    },
    { localStorage: storage },
  );
  await auth.signInWithEmail("alice@example.org", "password");
  const details = writes.find((item) => item.table === "profile_fa_details").value;
  assert.equal(details.experience_text, "Je découvre le Fa.");
  assert.equal(details.fa_sign_id, null);
  assert.equal(details.initiation_year, null);
  assert.equal(details.sign_visibility, "private");
});

test("custom signs survive saving and loading without becoming library entries", async () => {
  let stored;
  const auth = load("src/lib/ifawa-auth.ts", {
    "./supabase": {
      supabase: {
        from(table) {
          const query = {
            select: () => query,
            eq: () => query,
            abortSignal: () => query,
            maybeSingle: async () => ({
              error: null,
              data:
                table === "profiles"
                  ? { username: "test", path: "initiated" }
                  : table === "profile_fa_details"
                    ? { ...stored, fa_signs: null }
                    : null,
            }),
            upsert: async (value) => {
              if (table === "profile_fa_details") stored = value;
              return { error: null };
            },
          };
          return query;
        },
      },
    },
    "./store": { actions: {} },
    "./ifawa-cache": { clearPrivateCaches() {} },
  });
  await auth.createOrUpdateProfile(
    { id: "test" },
    { pseudo: "Test", initie: true, signe: " Mon signe personnel ", annee: "2020" },
  );
  assert.equal(stored.fa_sign_id, null);
  assert.equal(stored.custom_sign_name, "Mon signe personnel");
  const profile = await auth.loadCurrentProfile("test");
  assert.equal(profile.signe, "Mon signe personnel");
});

test("message send rejects expired authentication instead of reporting a successful no-op", async () => {
  const social = load("src/lib/ifawa-social.ts", {
    "./supabase": { supabase: { auth: { getUser: async () => ({ data: { user: null } }) } } },
    "./ifawa-cache": { readCache() {}, writeCache() {} },
  });
  await assert.rejects(social.sendRemoteMessage("conversation", "A message"), /Reconnectez/);
});
