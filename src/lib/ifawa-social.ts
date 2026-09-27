import type { Notification, Post } from "@/data/mock";
import { readCache, writeCache } from "./ifawa-cache";
import type { ReactionKind } from "./store";
import { supabase } from "./supabase";
import { photoToWebP } from "./image-webp";
import { loadReadReceipts, persistReceipt, readReceipts } from "./read-receipts";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  path?: string | null;
  is_profile_complete?: boolean | null;
  relation_enabled?: boolean | null;
};

type PostPayload = {
  text: string;
  type?: Post["type"] | undefined;
  mediaUrl?: string | undefined;
  sharedFrom?:
    | {
        author: string;
        text: string;
      }
    | undefined;
};

type PostRow = {
  id: string;
  author_id: string;
  body: string | null;
  created_at: string;
  updated_at?: string | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string | null;
  created_at: string;
};

type ReactionRow = {
  post_id: string;
  profile_id: string;
  reaction: ReactionKind;
};

const postMediaBucket = "post-media";

export type NetworkMember = {
  id: string;
  pseudo: string;
  avatarUrl?: string | undefined;
  signe: string;
  status?: string | undefined;
  requestId?: string | undefined;
  relationRole?: "requester" | "addressee" | undefined;
};

export type ConversationItem = {
  id: string;
  pseudo: string;
  avatarUrl?: string | undefined;
  extrait: string;
  heure: string;
  nonLus: number;
  messages: { id: string; de: "moi" | "eux"; texte: string; heure: string }[];
};

export type FeedPayload = {
  posts: Post[];
  reactions: Record<string, ReactionKind>;
};

export type NetworkPayload = {
  received: NetworkMember[];
  sent: NetworkMember[];
  accepted: NetworkMember[];
  suggestions: NetworkMember[];
};

function displayName(profile?: ProfileRow) {
  if (!profile) return "@Membre";
  return profile.display_name?.trim() || `@${profile.username ?? "membre"}`;
}

function isInternalTestProfile(_profile?: Pick<ProfileRow, "username" | "display_name"> | null) {
  return false;
}

function relativeTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function conversationReadKey(userId: string) {
  return `ifawa.conversation-reads.${userId}`;
}

function readLocalConversationReads(userId: string) {
  if (typeof window === "undefined") return new Map<string, number>();
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(conversationReadKey(userId)) ?? "{}",
    ) as Record<string, string> | null;
    return new Map(
      Object.entries(parsed ?? {}).map(([conversationId, value]) => [
        conversationId,
        new Date(value).getTime() || 0,
      ]),
    );
  } catch {
    window.localStorage.removeItem(conversationReadKey(userId));
    return new Map<string, number>();
  }
}

function parsePayload(body: string | null): PostPayload {
  if (!body) return { text: "" };
  try {
    const parsed = JSON.parse(body) as Partial<PostPayload>;
    if (typeof parsed.text === "string") {
      return {
        text: parsed.text,
        type: parsed.type,
        mediaUrl: parsed.mediaUrl,
        sharedFrom: parsed.sharedFrom,
      };
    }
  } catch {
    // Older rows can be plain text.
  }
  return { text: body };
}

function serializePayload(payload: PostPayload) {
  return JSON.stringify(payload);
}

async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function profileMap(ids: string[]) {
  if (!supabase || ids.length === 0) return new Map<string, ProfileRow>();
  const unique = [...new Set(ids)];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, path, is_profile_complete, relation_enabled")
    .in("id", unique);
  if (error) throw error;
  return new Map((data ?? []).map((profile) => [profile.id, profile as ProfileRow]));
}

export async function loadFeedFromSupabase(
  options: { limit?: number; authorId?: string; query?: string } = {},
) {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  let query = supabase
    .from("posts")
    .select("id, author_id, body, created_at, updated_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(options.limit ?? 20);
  if (options.authorId) query = query.eq("author_id", options.authorId);
  if (options.query) query = query.ilike("body", "%" + options.query.replace(/[%_]/g, "") + "%");
  const { data: posts, error: postsError } = await query;
  if (postsError) throw postsError;
  const postRows = (posts ?? []) as PostRow[];
  const ids = postRows.map((post) => post.id);
  const commentRows: CommentRow[] = [];
  const reactionRows: ReactionRow[] = [];
  if (ids.length) {
    await Promise.all([
      (async () => {
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase!
            .from("post_comments")
            .select("id, post_id, author_id, body, created_at")
            .in("post_id", ids)
            .order("created_at")
            .order("id")
            .range(offset, offset + 999);
          if (error) throw error;
          commentRows.push(...((data ?? []) as CommentRow[]));
          if ((data?.length ?? 0) < 1000) break;
        }
      })(),
      (async () => {
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await supabase!
            .from("post_reactions")
            .select("post_id, profile_id, reaction")
            .in("post_id", ids)
            .order("post_id")
            .order("profile_id")
            .range(offset, offset + 999);
          if (error) throw error;
          reactionRows.push(...((data ?? []) as ReactionRow[]));
          if ((data?.length ?? 0) < 1000) break;
        }
      })(),
    ]);
  }
  const profiles = await profileMap([
    ...postRows.map((post) => post.author_id),
    ...commentRows.map((comment) => comment.author_id),
  ]);

  const reactionCounts = reactionRows.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction.post_id] = (acc[reaction.post_id] ?? 0) + 1;
    return acc;
  }, {});
  const myReactions = reactionRows.reduce<Record<string, ReactionKind>>((acc, reaction) => {
    if (reaction.profile_id === userId) acc[reaction.post_id] = reaction.reaction;
    return acc;
  }, {});

  const commentsByPost = commentRows.reduce<Record<string, CommentRow[]>>((acc, comment) => {
    acc[comment.post_id] = [...(acc[comment.post_id] ?? []), comment];
    return acc;
  }, {});

  const mappedPosts: Post[] = postRows
    .filter((post) => !isInternalTestProfile(profiles.get(post.author_id)))
    .map((post) => {
      const author = profiles.get(post.author_id);
      const payload = parsePayload(post.body);
      return {
        id: post.id,
        authorId: post.author_id,
        auteur: displayName(author),
        authorAvatarUrl: author?.avatar_url ?? undefined,
        type:
          payload.type === "Officiel" || payload.type === "Pédagogie"
            ? "Membre"
            : (payload.type ?? "Membre"),
        heure: relativeTime(post.created_at),
        contenu: payload.sharedFrom
          ? `${payload.text}\n\nPublication partagée de ${payload.sharedFrom.author} : ${payload.sharedFrom.text}`
          : payload.text,
        image: Boolean(payload.mediaUrl),
        mediaUrl: payload.mediaUrl,
        reactions: reactionCounts[post.id] ?? 0,
        canEdit: post.author_id === userId,
        commentaires: (commentsByPost[post.id] ?? [])
          .filter((comment) => !isInternalTestProfile(profiles.get(comment.author_id)))
          .map((comment) => {
            const commentAuthor = profiles.get(comment.author_id);
            return {
              id: comment.id,
              authorId: comment.author_id,
              auteur: displayName(commentAuthor),
              authorAvatarUrl: commentAuthor?.avatar_url ?? undefined,
              texte: comment.body ?? "",
              heure: relativeTime(comment.created_at),
              canDelete: comment.author_id === userId || post.author_id === userId,
            };
          }),
      };
    });

  const payload = { posts: mappedPosts, reactions: myReactions };
  if (!options.authorId && !options.query) writeCache(userId, "feed", payload);
  return payload;
}

export function readCachedFeed(userId?: string): FeedPayload | null {
  return readCache<FeedPayload | null>(userId, "feed", null);
}

export async function createRemotePost(text: string, type: Post["type"], mediaUrl = "") {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId || !text.trim()) throw new Error("Reconnectez-vous et saisissez un message.");
  const { error } = await supabase.from("posts").insert({
    author_id: userId,
    body: serializePayload({ text: text.trim(), type, mediaUrl: mediaUrl || undefined }),
  });
  if (error) throw error;
}

export async function uploadPostMedia(file: File) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Reconnectez-vous pour ajouter une image.");
  const optimized = await photoToWebP(file);
  const path = userId + "/post-" + crypto.randomUUID() + ".webp";
  const { error } = await supabase.storage
    .from(postMediaBucket)
    .upload(path, optimized, { contentType: "image/webp", cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(postMediaBucket).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("L’image n’a pas pu être enregistrée.");
  return data.publicUrl;
}

export async function updateRemotePost(post: Post, text: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId || !text.trim()) throw new Error("Reconnectez-vous et saisissez un message.");
  const { error } = await supabase
    .from("posts")
    .update({
      body: serializePayload({ text: text.trim(), type: post.type, mediaUrl: post.mediaUrl }),
    })
    .eq("id", post.id)
    .eq("author_id", userId);
  if (error) throw error;
}

export async function deleteRemotePost(postId: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Reconnectez-vous pour continuer.");
  const { data: ownedPost, error: ownedError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("author_id", userId)
    .maybeSingle();
  if (ownedError) throw ownedError;
  if (!ownedPost) return;
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", userId);
  if (error) throw error;
}

export async function setRemoteReaction(
  postId: string,
  reaction: ReactionKind,
  current?: ReactionKind,
) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Reconnectez-vous pour continuer.");
  const { error: deleteError } = await supabase
    .from("post_reactions")
    .delete()
    .eq("post_id", postId)
    .eq("profile_id", userId);
  if (deleteError) throw deleteError;
  if (current === reaction) return;
  const { error } = await supabase.from("post_reactions").insert({
    post_id: postId,
    profile_id: userId,
    reaction,
  });
  if (error) throw error;
}

export async function createRemoteComment(postId: string, text: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId || !text.trim()) throw new Error("Reconnectez-vous et saisissez un message.");
  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_id: userId,
    body: text.trim(),
  });
  if (error) throw error;
}

export async function deleteRemoteComment(postId: string, commentId: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Reconnectez-vous pour continuer.");
  const [{ data: comment, error: commentError }, { data: post, error: postError }] =
    await Promise.all([
      supabase.from("post_comments").select("id, author_id").eq("id", commentId).maybeSingle(),
      supabase.from("posts").select("id, author_id").eq("id", postId).maybeSingle(),
    ]);
  if (commentError) throw commentError;
  if (postError) throw postError;
  if (comment?.author_id !== userId && post?.author_id !== userId) return;
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function shareRemotePost(post: Post, note: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Reconnectez-vous pour continuer.");
  const { error } = await supabase.from("posts").insert({
    author_id: userId,
    body: serializePayload({
      text: note.trim() || "Je partage cette publication.",
      type: "Membre",
      mediaUrl: post.mediaUrl,
      sharedFrom: {
        author: post.auteur,
        text: post.contenu,
      },
    }),
  });
  if (error) throw error;
}

export async function loadNetworkFromSupabase(): Promise<NetworkPayload | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const [{ data: profiles, error: profilesError }, { data: connections, error: connectionsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, path, is_profile_complete, relation_enabled",
        )
        .neq("id", userId)
        .eq("is_profile_complete", true)
        .limit(500),
      supabase
        .from("connections")
        .select("id, requester_id, addressee_id, status, created_at, updated_at")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    ]);
  if (profilesError) throw profilesError;
  if (connectionsError) throw connectionsError;

  const connectionRows = (connections ?? []) as Array<{
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
  }>;
  // Existing relationships must not disappear because a profile is incomplete or outside discovery's limit.
  const linkedProfiles = await profileMap(
    connectionRows
      .flatMap((row) => [row.requester_id, row.addressee_id])
      .filter((id) => id !== userId),
  );
  const allProfiles = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );
  linkedProfiles.forEach((profile, id) => allProfiles.set(id, profile));
  connectionRows.sort((a, b) => Number(b.status === "accepted") - Number(a.status === "accepted"));
  const members: NetworkMember[] = [...allProfiles.values()]
    .filter((profile) => {
      return (
        profile.relation_enabled !== false ||
        connectionRows.some(
          (item) => item.requester_id === profile.id || item.addressee_id === profile.id,
        )
      );
    })
    .map((profile) => {
      const relation = connectionRows.find(
        (item) => item.requester_id === profile.id || item.addressee_id === profile.id,
      );
      return {
        id: profile.id,
        pseudo: displayName(profile),
        avatarUrl: profile.avatar_url ?? undefined,
        signe: profile.path === "initiated" ? "Membre initié" : "Découverte",
        status: relation?.status,
        requestId: relation?.id,
        relationRole:
          relation?.requester_id === userId
            ? "requester"
            : relation?.addressee_id === userId
              ? "addressee"
              : undefined,
      };
    });

  const payload: NetworkPayload = {
    received: members.filter((member) => {
      const relation = connectionRows.find((item) => item.id === member.requestId);
      return relation?.addressee_id === userId && relation.status === "pending";
    }),
    sent: members.filter((member) => {
      const relation = connectionRows.find((item) => item.id === member.requestId);
      return relation?.requester_id === userId && relation.status === "pending";
    }),
    accepted: members.filter((member) => member.status === "accepted"),
    suggestions: members.filter((member) => !member.status),
  };
  writeCache(userId, "network", payload);
  return payload;
}

export function readCachedNetwork(userId?: string): NetworkPayload | null {
  return readCache<NetworkPayload | null>(userId, "network", null);
}

export async function loadMemberProfile(profileId: string): Promise<NetworkMember | null> {
  if (!supabase || !profileId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, path, is_profile_complete, relation_enabled")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const profile = data as ProfileRow;
  if (isInternalTestProfile(profile)) return null;
  return {
    id: profile.id,
    pseudo: displayName(profile),
    avatarUrl: profile.avatar_url ?? undefined,
    signe: profile.path === "initiated" ? "Membre initié" : "Découverte",
  };
}

export async function sendRemoteConnection(addresseeId: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId || userId === addresseeId) return;
  const { error } = await supabase.from("connections").insert({
    requester_id: userId,
    addressee_id: addresseeId,
    status: "pending",
  });
  if (error) throw error;
}

export async function removeRemoteConnection(requestId: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Reconnectez-vous pour continuer.");
  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("id", requestId)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
}

export async function answerRemoteConnection(requestId: string, status: "accepted" | "rejected") {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Reconnectez-vous pour continuer.");
  const { data: relation, error: relationError } = await supabase
    .from("connections")
    .select("id, requester_id, addressee_id")
    .eq("id", requestId)
    .eq("addressee_id", userId)
    .maybeSingle();
  if (relationError) throw relationError;

  const { error } = await supabase
    .from("connections")
    .update({ status })
    .eq("id", requestId)
    .eq("addressee_id", userId);
  if (error) throw error;

  if (status === "accepted" && relation?.requester_id) {
    // The conversation is created atomically when the first message is sent.
  }
}

export async function findOrCreateConversation(otherProfileId: string) {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId || userId === otherProfileId) return null;

  const { data: myMemberships, error: mineError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("profile_id", userId);
  if (mineError) throw mineError;

  const conversationIds = [...new Set((myMemberships ?? []).map((row) => row.conversation_id))];
  if (conversationIds.length > 0) {
    const { data: matchingMembers, error: matchError } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("profile_id", otherProfileId)
      .in("conversation_id", conversationIds);
    if (matchError) throw matchError;
    const existing = matchingMembers?.[0]?.conversation_id;
    if (existing) return existing as string;
  }

  const { data, error } = await supabase.rpc("start_direct_conversation", {
    peer_id: otherProfileId,
  });
  if (error)
    throw new Error(
      error.code === "PGRST202"
        ? "La création sécurisée des conversations attend la mise à jour du serveur."
        : error.message,
    );
  return data as string;
}

export async function loadConversationsFromSupabase(): Promise<ConversationItem[] | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  const { data: memberships, error: membershipsError } = await supabase
    .from("conversation_members")
    .select("conversation_id, profile_id, created_at, last_read_at")
    .eq("profile_id", userId);
  if (membershipsError) throw membershipsError;

  const myConversationIds = (
    (memberships ?? []) as Array<{
      conversation_id: string;
      profile_id: string;
      last_read_at: string | null;
    }>
  ).map((member) => member.conversation_id);
  const myReadDates = new Map(
    (
      (memberships ?? []) as Array<{
        conversation_id: string;
        last_read_at: string | null;
      }>
    ).map((member) => [
      member.conversation_id,
      member.last_read_at ? new Date(member.last_read_at).getTime() : 0,
    ]),
  );
  const receipts = await loadReadReceipts(userId);
  const localReadDates = readLocalConversationReads(userId);
  for (const receipt of receipts)
    if (receipt.kind === "conversation") {
      localReadDates.set(
        receipt.item_id,
        Math.max(localReadDates.get(receipt.item_id) ?? 0, Date.parse(receipt.read_at)),
      );
    }
  if (myConversationIds.length === 0) return [];

  const [{ data: messages, error: messagesError }, { data: allMembers, error: membersError }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .in("conversation_id", myConversationIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("conversation_members")
        .select("conversation_id, profile_id, created_at, last_read_at")
        .in("conversation_id", myConversationIds),
    ]);
  if (messagesError) throw messagesError;
  if (membersError) throw membersError;

  const memberRows = (allMembers ?? []) as Array<{
    conversation_id: string;
    profile_id: string;
    last_read_at: string | null;
  }>;
  const profiles = await profileMap(memberRows.map((member) => member.profile_id));
  const messageRows = (messages ?? []) as Array<{
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string | null;
    created_at: string;
  }>;

  const payload: ConversationItem[] = myConversationIds.map((conversationId) => {
    const otherMember = memberRows.find(
      (member) => member.conversation_id === conversationId && member.profile_id !== userId,
    );
    const other = profiles.get(otherMember?.profile_id ?? "");
    const conversationMessages = messageRows.filter(
      (message) => message.conversation_id === conversationId,
    );
    const last = conversationMessages[conversationMessages.length - 1];
    const lastReadAt = Math.max(
      myReadDates.get(conversationId) ?? 0,
      localReadDates.get(conversationId) ?? 0,
      ...readReceipts(userId)
        .filter((row) => row.kind === "conversation" && row.item_id === conversationId)
        .map((row) => Date.parse(row.read_at)),
    );
    const unreadCount = conversationMessages.filter((message) => {
      const sentAt = new Date(message.created_at).getTime();
      return message.sender_id !== userId && (!lastReadAt || sentAt > lastReadAt);
    }).length;
    return {
      id: conversationId,
      pseudo: displayName(other),
      avatarUrl: other?.avatar_url ?? undefined,
      extrait: last?.body ?? "Conversation ouverte",
      heure: relativeTime(last?.created_at),
      nonLus: unreadCount,
      messages: conversationMessages.map((message) => ({
        id: message.id,
        de: message.sender_id === userId ? "moi" : "eux",
        texte: message.body ?? "",
        heure: relativeTime(message.created_at),
      })),
    };
  });
  writeCache(userId, "conversations", payload);
  return payload;
}

export function readCachedConversations(userId?: string): ConversationItem[] | null {
  return readCache<ConversationItem[] | null>(userId, "conversations", null);
}

export async function markConversationRead(conversationId: string, lastMessageId?: string) {
  if (!supabase || !conversationId || conversationId.startsWith("peer:")) return;
  const userId = await currentUserId();
  if (!userId) throw new Error("Reconnectez-vous pour enregistrer la lecture.");
  // A server timestamp avoids marking future messages read when the device clock is ahead.
  if (!lastMessageId) return;
  const { data, error } = await supabase
    .from("messages")
    .select("created_at")
    .eq("id", lastMessageId)
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("La lecture n’a pas pu être confirmée.");
  await persistReceipt(userId, "conversation", conversationId, data.created_at);
}

export async function sendRemoteMessage(conversationId: string, text: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId || !text.trim()) throw new Error("Reconnectez-vous et saisissez un message.");
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    body: text.trim(),
  });
  if (error) throw error;
}

export async function loadNotificationsFromSupabase(): Promise<Notification[] | null> {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const [
    { data: connections, error: connectionsError },
    { data: ownPosts, error: postsError },
    { data: contributionNotifications, error: contributionNotificationsError },
    receipts,
  ] = await Promise.all([
    supabase
      .from("connections")
      .select("id,requester_id,addressee_id,status,created_at,updated_at")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase.from("posts").select("id").eq("author_id", userId).limit(80),
    supabase
      .from("contribution_notifications")
      .select("id,message,kind,created_at,contribution_id")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    loadReadReceipts(userId),
  ]);
  if (connectionsError) throw connectionsError;
  if (postsError) throw postsError;
  if (contributionNotificationsError) throw contributionNotificationsError;
  const ids = (ownPosts ?? []).map((post) => post.id);
  const { data: comments, error: commentsError } = ids.length
    ? await supabase
        .from("post_comments")
        .select("id,author_id,created_at")
        .in("post_id", ids)
        .neq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [], error: null };
  if (commentsError) throw commentsError;
  const profiles = await profileMap([
    ...(connections ?? []).flatMap((item) => [item.requester_id, item.addressee_id]),
    ...(comments ?? []).map((item) => item.author_id),
  ]);
  const readIds = new Set(
    [...receipts, ...readReceipts(userId)]
      .filter((row) => row.kind === "notification")
      .map((row) => row.item_id),
  );
  const items: Array<{ date: string; notification: Notification }> = [];
  for (const connection of connections ?? []) {
    if (!(
      (connection.status === "pending" && connection.addressee_id === userId) ||
      (connection.status === "accepted" && connection.requester_id === userId)
    ))
      continue;
    const otherId =
      connection.requester_id === userId ? connection.addressee_id : connection.requester_id;
    if (isInternalTestProfile(profiles.get(otherId))) continue;
    const id = `connection-${connection.id}-${connection.status}`;
    const date = connection.updated_at ?? connection.created_at;
    items.push({
      date,
      notification: {
        id,
        type: "connexion",
        nonLue: !readIds.has(id),
        heure: relativeTime(date),
        texte:
          displayName(profiles.get(otherId)) +
          (connection.status === "pending"
            ? " vous a envoyé une demande de connexion."
            : " a accepté votre demande de connexion."),
      },
    });
  }
  for (const comment of comments ?? []) {
    if (isInternalTestProfile(profiles.get(comment.author_id))) continue;
    const id = `comment-${comment.id}`;
    items.push({
      date: comment.created_at,
      notification: {
        id,
        type: "commentaire",
        nonLue: !readIds.has(id),
        heure: relativeTime(comment.created_at),
        texte: displayName(profiles.get(comment.author_id)) + " a commenté votre publication.",
      },
    });
  }
  for (const notification of contributionNotifications ?? []) {
    const id = `contribution-${notification.id}`;
    items.push({
      date: notification.created_at,
      notification: {
        id,
        type: "contribution",
        nonLue: !readIds.has(id),
        heure: relativeTime(notification.created_at),
        texte: notification.message,
      },
    });
  }
  // Private messages belong to the Messages badge, never to the activity bell.
  const payload = items
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 50)
    .map((item) => item.notification);
  writeCache(userId, "notifications", payload);
  return payload;
}

export function readCachedNotifications(userId?: string): Notification[] | null {
  return readCache<Notification[] | null>(userId, "notifications", null);
}

export async function reportRemotePost(postId: string, reason: string, details: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const userId = await currentUserId();
  if (!userId) throw new Error("Connexion requise.");
  const { error } = await supabase
    .from("post_reports")
    .insert({ post_id: postId, reporter_id: userId, reason, details: details.trim() });
  if (error) throw error;
}
