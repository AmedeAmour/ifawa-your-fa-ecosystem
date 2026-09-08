import type { Notification, Post } from "@/data/mock";
import { readCache, writeCache } from "./ifawa-cache";
import type { ReactionKind } from "./store";
import { supabase } from "./supabase";

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
  type?: Post["type"];
  mediaUrl?: string;
  sharedFrom?: {
    author: string;
    text: string;
  };
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
  avatarUrl?: string;
  signe: string;
  status?: string;
  requestId?: string;
  relationRole?: "requester" | "addressee";
};

export type ConversationItem = {
  id: string;
  pseudo: string;
  avatarUrl?: string;
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

function isInternalTestProfile(profile?: Pick<ProfileRow, "username" | "display_name"> | null) {
  const text = `${profile?.username ?? ""} ${profile?.display_name ?? ""}`.toLowerCase();
  return [
    "codex",
    "uitest",
    "service test",
    "service flow",
    "servicetest",
    "serviceflow",
    "contribution test",
    "contribution flow",
    "contribtest",
    "contribflow",
    "utilisateur a",
    "utilisateur b",
    "fulla",
    "fullb",
    "msg fast",
    "msgfa",
    "msgfb",
    "appflow",
    "app flow",
    "finala",
    "finalb",
    "finaltwo",
    "feeda",
    "feedb",
    "avatar test",
    "avatartest",
  ].some((marker) => text.includes(marker));
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
    const parsed = JSON.parse(window.localStorage.getItem(conversationReadKey(userId)) ?? "{}") as
      | Record<string, string>
      | null;
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

function rememberLocalConversationRead(userId: string, conversationId: string) {
  if (typeof window === "undefined" || !conversationId || conversationId.startsWith("peer:")) {
    return;
  }
  const key = conversationReadKey(userId);
  let parsed: Record<string, string> = {};
  try {
    parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, string>;
  } catch {
    parsed = {};
  }
  parsed[conversationId] = new Date().toISOString();
  window.localStorage.setItem(key, JSON.stringify(parsed));
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

export async function loadFeedFromSupabase() {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  const [
    { data: posts, error: postsError },
    { data: comments, error: commentsError },
    { data: reactions, error: reactionsError },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id, author_id, body, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("post_comments")
      .select("id, post_id, author_id, body, created_at")
      .order("created_at", { ascending: true })
      .limit(400),
    supabase.from("post_reactions").select("post_id, profile_id, reaction"),
  ]);

  if (postsError) throw postsError;
  if (commentsError) throw commentsError;
  if (reactionsError) throw reactionsError;

  const postRows = (posts ?? []) as PostRow[];
  const commentRows = (comments ?? []) as CommentRow[];
  const reactionRows = (reactions ?? []) as ReactionRow[];
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
        type: payload.type ?? "Membre",
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
  writeCache(userId, "feed", payload);
  return payload;
}

export function readCachedFeed(userId?: string): FeedPayload | null {
  return readCache<FeedPayload | null>(userId, "feed", null);
}

export async function createRemotePost(text: string, type: Post["type"], mediaUrl = "") {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId || !text.trim()) return;
  const { error } = await supabase.from("posts").insert({
    author_id: userId,
    body: serializePayload({ text: text.trim(), type, mediaUrl: mediaUrl || undefined }),
  });
  if (error) throw error;
}

export async function uploadPostMedia(file: File) {
  const fallback = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  if (!supabase) return fallback();
  const userId = await currentUserId();
  if (!userId) return fallback();

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/post-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(postMediaBucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) return fallback();

  const { data } = supabase.storage.from(postMediaBucket).getPublicUrl(path);
  return data.publicUrl || fallback();
}

export async function updateRemotePost(post: Post, text: string) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId || !text.trim()) return;
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
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { data: ownedPost, error: ownedError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("author_id", userId)
    .maybeSingle();
  if (ownedError) throw ownedError;
  if (!ownedPost) return;
  await supabase.from("post_comments").delete().eq("post_id", postId);
  await supabase.from("post_reactions").delete().eq("post_id", postId);
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", userId);
  if (error) throw error;
}

export async function setRemoteReaction(
  postId: string,
  reaction: ReactionKind,
  current?: ReactionKind,
) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
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
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId || !text.trim()) return;
  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_id: userId,
    body: text.trim(),
  });
  if (error) throw error;
}

export async function deleteRemoteComment(postId: string, commentId: string) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
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
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
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

export async function loadNetworkFromSupabase() {
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
  const members = ((profiles ?? []) as ProfileRow[])
    .filter((profile) => {
      return !isInternalTestProfile(profile) && profile.relation_enabled !== false;
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

  const payload = {
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
  if (!supabase) return;
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
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("id", requestId)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;
}

export async function answerRemoteConnection(requestId: string, status: "accepted" | "rejected") {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
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
    await findOrCreateConversation(relation.requester_id);
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

  const conversationId = crypto.randomUUID();
  const { error: conversationError } = await supabase
    .from("conversations")
    .insert({ id: conversationId });
  if (conversationError) {
    const { error: fallbackError } = await supabase
      .from("conversations")
      .insert({ id: conversationId, created_by: userId });
    if (fallbackError) throw fallbackError;
  }

  const { error: membersError } = await supabase.from("conversation_members").insert([
    { conversation_id: conversationId, profile_id: userId },
    { conversation_id: conversationId, profile_id: otherProfileId },
  ]);
  if (membersError) throw membersError;

  return conversationId;
}

export async function loadConversationsFromSupabase() {
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
    ((memberships ?? []) as Array<{
      conversation_id: string;
      last_read_at: string | null;
    }>).map((member) => [
      member.conversation_id,
      member.last_read_at ? new Date(member.last_read_at).getTime() : 0,
    ]),
  );
  const localReadDates = readLocalConversationReads(userId);
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

  const payload = myConversationIds.map((conversationId) => {
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

export async function markConversationRead(conversationId: string) {
  if (!supabase || !conversationId || conversationId.startsWith("peer:")) return;
  const userId = await currentUserId();
  if (!userId) return;
  rememberLocalConversationRead(userId, conversationId);
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", userId);
  if (error) return;
}

export async function sendRemoteMessage(conversationId: string, text: string) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId || !text.trim()) return;
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
    { data: ownPosts, error: ownPostsError },
    { data: memberships, error: membershipsError },
  ] = await Promise.all([
      supabase
        .from("connections")
        .select("id, requester_id, addressee_id, status, created_at, updated_at")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order("updated_at", { ascending: false })
        .limit(30),
      supabase.from("posts").select("id, author_id").eq("author_id", userId).limit(80),
      supabase
        .from("conversation_members")
        .select("conversation_id, profile_id, last_read_at")
        .eq("profile_id", userId),
    ]);
  if (connectionsError) throw connectionsError;
  if (ownPostsError) throw ownPostsError;
  if (membershipsError) throw membershipsError;

  const connectionRows = (connections ?? []) as Array<{
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
    created_at: string;
    updated_at: string | null;
  }>;
  const ownPostIds = ((ownPosts ?? []) as Array<{ id: string }>).map((post) => post.id);
  const membershipRows = (memberships ?? []) as Array<{
    conversation_id: string;
    profile_id: string;
    last_read_at: string | null;
  }>;
  const conversationIds = membershipRows.map((membership) => membership.conversation_id);

  const [
    { data: comments, error: commentsError },
    { data: messageRowsRaw, error: messagesError },
    { data: conversationMembers, error: conversationMembersError },
    profiles,
  ] = await Promise.all([
    ownPostIds.length
      ? supabase
          .from("post_comments")
          .select("id, post_id, author_id, body, created_at")
          .in("post_id", ownPostIds)
          .neq("author_id", userId)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length
      ? supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at")
          .in("conversation_id", conversationIds)
          .neq("sender_id", userId)
          .order("created_at", { ascending: false })
          .limit(80)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length
      ? supabase
          .from("conversation_members")
          .select("conversation_id, profile_id")
          .in("conversation_id", conversationIds)
      : Promise.resolve({ data: [], error: null }),
    profileMap([
      ...connectionRows.flatMap((connection) => [connection.requester_id, connection.addressee_id]),
    ]),
  ]);
  if (commentsError) throw commentsError;
  if (messagesError) throw messagesError;
  if (conversationMembersError) throw conversationMembersError;

  const commentRows = (comments ?? []) as Array<{
    id: string;
    author_id: string;
    body: string | null;
    created_at: string;
  }>;
  const commentProfiles = await profileMap(commentRows.map((comment) => comment.author_id));
  const messageRows = (messageRowsRaw ?? []) as Array<{
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string | null;
    created_at: string;
  }>;
  const conversationMemberRows = (conversationMembers ?? []) as Array<{
    conversation_id: string;
    profile_id: string;
  }>;
  const messageProfiles = await profileMap([
    ...messageRows.map((message) => message.sender_id),
    ...conversationMemberRows.map((member) => member.profile_id),
  ]);

  const connectionNotifications: Notification[] = connectionRows
    .filter((connection) => {
      if (connection.status === "pending") return connection.addressee_id === userId;
      if (connection.status === "accepted") return connection.requester_id === userId;
      return false;
    })
    .map((connection) => {
      const otherId =
        connection.requester_id === userId ? connection.addressee_id : connection.requester_id;
      if (isInternalTestProfile(profiles.get(otherId))) return null;
      const other = displayName(profiles.get(otherId));
      return {
        id: `connection-${connection.id}-${connection.status}`,
        texte:
          connection.status === "pending"
            ? `${other} vous a envoyé une demande de connexion.`
            : `${other} a accepté votre demande de connexion.`,
        heure: relativeTime(connection.updated_at ?? connection.created_at),
        type: "connexion",
        nonLue: true,
      };
    })
    .filter((notification): notification is Notification => Boolean(notification));

  const commentNotifications: Notification[] = commentRows
    .filter((comment) => !isInternalTestProfile(commentProfiles.get(comment.author_id)))
    .map((comment) => ({
      id: `comment-${comment.id}`,
      texte: `${displayName(commentProfiles.get(comment.author_id))} a commenté votre publication.`,
      heure: relativeTime(comment.created_at),
      type: "commentaire",
      nonLue: true,
    }));

  const lastReadByConversation = new Map(
    membershipRows.map((membership) => [
      membership.conversation_id,
      membership.last_read_at ? new Date(membership.last_read_at).getTime() : 0,
    ]),
  );
  const localReadDates = readLocalConversationReads(userId);
  const latestUnreadMessages = new Map<string, (typeof messageRows)[number]>();
  messageRows.forEach((message) => {
    const lastReadAt = Math.max(
      lastReadByConversation.get(message.conversation_id) ?? 0,
      localReadDates.get(message.conversation_id) ?? 0,
    );
    const sentAt = new Date(message.created_at).getTime();
    if (lastReadAt && sentAt <= lastReadAt) return;
    if (!latestUnreadMessages.has(message.conversation_id)) {
      latestUnreadMessages.set(message.conversation_id, message);
    }
  });
  const messageNotifications: Notification[] = [...latestUnreadMessages.values()]
    .filter((message) => !isInternalTestProfile(messageProfiles.get(message.sender_id)))
    .map((message) => ({
      id: `message-${message.conversation_id}-${message.id}`,
      texte: `${displayName(messageProfiles.get(message.sender_id))} vous a envoyé un message.`,
      heure: relativeTime(message.created_at),
      type: "message",
      conversationId: message.conversation_id,
      nonLue: true,
    }));

  const payload = [...connectionNotifications, ...commentNotifications, ...messageNotifications]
    .sort((a, b) => {
      const parse = (value: string) => {
        if (value.includes("min")) return Number.parseInt(value, 10) || 0;
        if (value.includes(" h")) return (Number.parseInt(value.replace(/\D/g, ""), 10) || 0) * 60;
        if (value.includes(" j")) {
          return (Number.parseInt(value.replace(/\D/g, ""), 10) || 0) * 1440;
        }
        return 0;
      };
      return parse(a.heure) - parse(b.heure);
    })
    .slice(0, 50);
  writeCache(userId, "notifications", payload);
  return payload;
}

export function readCachedNotifications(userId?: string): Notification[] | null {
  return readCache<Notification[] | null>(userId, "notifications", null);
}
