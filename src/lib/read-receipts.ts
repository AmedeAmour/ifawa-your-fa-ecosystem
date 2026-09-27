import { supabase } from "./supabase";

type Receipt = {
  kind: "conversation" | "notification";
  item_id: string;
  read_at: string;
  pending?: boolean;
};
const prefix = "ifawa.read-receipts.";

export function readReceipts(userId: string): Receipt[] {
  if (typeof window === "undefined") return [];
  try {
    const rows: unknown = JSON.parse(window.localStorage.getItem(prefix + userId) ?? "[]");
    return Array.isArray(rows)
      ? rows.filter(
          (row): row is Receipt =>
            row &&
            ["conversation", "notification"].includes(row.kind) &&
            typeof row.item_id === "string" &&
            Number.isFinite(Date.parse(row.read_at)),
        )
      : [];
  } catch {
    return [];
  }
}

function save(userId: string, rows: Receipt[]) {
  try {
    window.localStorage.setItem(prefix + userId, JSON.stringify(rows));
  } catch {
    /* Remote persistence remains available. */
  }
}

export function rememberReceipt(
  userId: string,
  kind: Receipt["kind"],
  itemId: string,
  readAt = new Date().toISOString(),
) {
  const rows = readReceipts(userId);
  const previous = rows.find((row) => row.kind === kind && row.item_id === itemId);
  const receipt: Receipt = {
    kind,
    item_id: itemId,
    read_at:
      previous && Date.parse(previous.read_at) > Date.parse(readAt) ? previous.read_at : readAt,
    pending: true,
  };
  save(userId, [...rows.filter((row) => row !== previous), receipt]);
  return receipt;
}

export async function persistReceipt(
  userId: string,
  kind: Receipt["kind"],
  itemId: string,
  readAt?: string,
) {
  const receipt = rememberReceipt(userId, kind, itemId, readAt);
  if (!supabase) throw new Error("Connexion indisponible.");
  const { error } = await supabase.from("user_read_receipts").upsert(
    {
      profile_id: userId,
      kind: receipt.kind,
      item_id: receipt.item_id,
      read_at: receipt.read_at,
    },
    { onConflict: "profile_id,kind,item_id" },
  );
  if (error) throw error;
  save(
    userId,
    readReceipts(userId).map((row) =>
      row.kind === kind && row.item_id === itemId && row.read_at === receipt.read_at
        ? { ...row, pending: false }
        : row,
    ),
  );
}

export async function loadReadReceipts(userId: string) {
  if (!supabase) return readReceipts(userId);
  const pending = readReceipts(userId).filter((row) => row.pending);
  if (pending.length) {
    const { error } = await supabase.from("user_read_receipts").upsert(
      pending.map(({ kind, item_id, read_at }) => ({ profile_id: userId, kind, item_id, read_at })),
      { onConflict: "profile_id,kind,item_id" },
    );
    if (!error)
      save(
        userId,
        readReceipts(userId).map((row) =>
          pending.some(
            (sent) =>
              sent.kind === row.kind &&
              sent.item_id === row.item_id &&
              sent.read_at === row.read_at,
          )
            ? { ...row, pending: false }
            : row,
        ),
      );
  }
  // Retain account-scoped receipts offline; never restore profile or message contents after logout.
  const { data, error } = await supabase
    .from("user_read_receipts")
    .select("kind,item_id,read_at")
    .eq("profile_id", userId);
  if (!error && data) {
    const rows = readReceipts(userId);
    for (const remote of data as Receipt[]) {
      const local = rows.find((row) => row.kind === remote.kind && row.item_id === remote.item_id);
      if (!local) rows.push(remote);
      else if (Date.parse(remote.read_at) >= Date.parse(local.read_at))
        Object.assign(local, remote, { pending: false });
    }
    save(userId, rows);
    return rows;
  }
  return readReceipts(userId);
}
