import { getDisplayName } from "@/utils/displayName";

export const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes — mirrors the server's real enforcement, UI-gating only
export const DELETE_FOR_EVERYONE_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day
export const MAX_PINNED = 3;
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function conversationTitle(conversation, meId, nicknames) {
  if (!conversation) return "Conversation";
  if (conversation.isGroup) return conversation.groupName || "Group";
  const other = (conversation.participants || []).find((p) => p._id !== meId);
  return other ? getDisplayName(other, nicknames) : "Member";
}

// Groups use their own avatarUrl (Milestone 6+); for 1:1s, show the other
// participant's profile picture.
export function conversationAvatarUrl(conversation, meId) {
  if (!conversation) return undefined;
  if (conversation.isGroup) return conversation.avatarUrl || undefined;
  const other = (conversation.participants || []).find((p) => p._id !== meId);
  return other?.profilePicture || undefined;
}

export function otherParticipant(conversation, meId) {
  if (!conversation || conversation.isGroup) return null;
  return (conversation.participants || []).find((p) => p._id !== meId) || null;
}

// Short relative stamp for the conversation list; falls back to a date once
// something is a week or older so the list doesn't fill up with "27d".
export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatClock(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatLastSeen(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// Only appends ids we haven't seen before, and returns the same array
// reference when there's nothing new — keeps re-fetches/socket pushes from
// re-triggering scroll/render churn when nothing actually changed.
export function mergeNewMessages(prev, fetchedAscending) {
  if (!fetchedAscending.length) return prev;
  const existingIds = new Set(prev.map((m) => m._id));
  const toAppend = fetchedAscending.filter((m) => !existingIds.has(m._id));
  if (!toAppend.length) return prev;
  return [...prev, ...toAppend];
}

// A message is delivered/read once every OTHER participant's tracking entry
// is >= the message's createdAt — derived client-side, never stored per-message.
export function deliveryState(message, conversation, meId) {
  if (!conversation || message.sender?._id !== meId) return null;
  const others = (conversation.participants || []).filter((p) => p._id !== meId);
  if (!others.length) return "sent";

  const readBy = conversation.lastReadBy || [];
  const deliveredBy = conversation.lastDeliveredBy || [];
  const createdAt = new Date(message.createdAt).getTime();

  const allRead = others.every((p) => {
    const entry = readBy.find((r) => (r.user?._id || r.user) === p._id);
    return entry && new Date(entry.lastReadAt).getTime() >= createdAt;
  });
  if (allRead) return "read";

  const allDelivered = others.every((p) => {
    const entry = deliveredBy.find((d) => (d.user?._id || d.user) === p._id);
    return entry && new Date(entry.lastDeliveredAt).getTime() >= createdAt;
  });
  if (allDelivered) return "delivered";

  return "sent";
}

export function isConversationAdmin(conversation, userId) {
  if (!conversation) return false;
  if (!conversation.isGroup) return true;
  return (conversation.admins || []).some((a) => (a._id || a) === userId);
}
