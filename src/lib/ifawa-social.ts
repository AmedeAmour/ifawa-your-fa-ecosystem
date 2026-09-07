import type { Post } from "@/data/mock";
import type { ReactionKind } from "./store";
import { supabase } from "./supabase";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  path?: string | null;
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

export type NetworkMember = {
  id: string;
  pseudo: string;
  avatarUrl?: string;
  signe: string;
  status?: string;
  requestId?: string;
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

function displayName(profile?: ProfileRow) {
  if (!profile) return "@Membre";
  return profile.display_name?.trim() || `@${profile.username ?? "membre"}`;
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
    .select("id, username, display_name, avatar_url, path")
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

  const mappedPosts: Post[] = postRows.map((post) => {
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
      commentaires: (commentsByPost[post.id] ?? []).map((comment) => {
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

  return { posts: mappedPosts, reactions: myReactions };
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
        .select("id, username, display_name, avatar_url, path")
        .neq("id", userId)
        .limit(80),
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
  const members = ((profiles ?? []) as ProfileRow[]).map((profile) => {
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
    };
  });

  return {
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

export async function answerRemoteConnection(requestId: string, status: "accepted" | "rejected") {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("connections")
    .update({ status })
    .eq("id", requestId)
    .eq("addressee_id", userId);
  if (error) throw error;
}

export async function loadConversationsFromSupabase() {
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  const { data: memberships, error: membershipsError } = await supabase
    .from("conversation_members")
    .select("conversation_id, profile_id, created_at, last_read_at");
  if (membershipsError) throw membershipsError;

  const myConversationIds = (
    (memberships ?? []) as Array<{
      conversation_id: string;
      profile_id: string;
      last_read_at: string | null;
    }>
  )
    .filter((member) => member.profile_id === userId)
    .map((member) => member.conversation_id);
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

  return myConversationIds.map((conversationId) => {
    const otherMember = memberRows.find(
      (member) => member.conversation_id === conversationId && member.profile_id !== userId,
    );
    const other = profiles.get(otherMember?.profile_id ?? "");
    const conversationMessages = messageRows.filter(
      (message) => message.conversation_id === conversationId,
    );
    const last = conversationMessages[conversationMessages.length - 1];
    return {
      id: conversationId,
      pseudo: displayName(other),
      avatarUrl: other?.avatar_url ?? undefined,
      extrait: last?.body ?? "Conversation ouverte",
      heure: relativeTime(last?.created_at),
      nonLus: 0,
      messages: conversationMessages.map((message) => ({
        id: message.id,
        de: message.sender_id === userId ? "moi" : "eux",
        texte: message.body ?? "",
        heure: relativeTime(message.created_at),
      })),
    };
  });
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
