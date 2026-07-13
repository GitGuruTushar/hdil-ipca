"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, Users, MessageCircle, Search, Pin, X } from "lucide-react";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Avatar from "@/components/app/avatar";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";
import { getSocket } from "@/utils/socket";
import NewMessageDialog from "./messages/new-message-dialog";
import ParticipantsDialog from "./messages/participants-dialog";
import ForwardDialog from "./messages/forward-dialog";
import MessageBubble from "./messages/message-bubble";
import Composer from "./messages/composer";
import {
  conversationTitle,
  conversationAvatarUrl,
  otherParticipant,
  timeAgo,
  formatLastSeen,
  mergeNewMessages,
  isConversationAdmin,
} from "./messages/helpers";

const NEAR_BOTTOM_PX = 120;
const TYPING_IDLE_MS = 2000;
const TYPING_SAFETY_MS = 5000;

export default function MessagesPanel({ basePath }) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { nicknames } = useNicknames();

  const [me, setMe] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [msgPage, setMsgPage] = useState(1);
  const [msgTotalPages, setMsgTotalPages] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);

  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [lastSeenById, setLastSeenById] = useState({});
  const [typingByConversation, setTypingByConversation] = useState({});

  const selectedIdRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const appliedInitialParamRef = useRef(false);
  const typingStateRef = useRef({ isTyping: false, idleTimer: null });
  const typingSafetyTimersRef = useRef({});

  const activeConversation = useMemo(() => conversations.find((c) => c._id === selectedId) || null, [conversations, selectedId]);
  const threadTitle = conversationTitle(activeConversation, me?._id, nicknames);
  const threadAmAdmin = isConversationAdmin(activeConversation, me?._id);
  const threadOther = otherParticipant(activeConversation, me?._id);
  const threadOnline = threadOther && onlineUserIds.has(threadOther._id);

  // -------------------------------------------------------------- //
  // Data loading
  // -------------------------------------------------------------- //

  const loadConversations = useCallback(
    (opts = {}) => {
      const { silent = false } = opts;
      if (!silent) setConversationsLoading(true);
      return axiosInstance
        .get("/conversations", { params: { limit: 100 } })
        .then((res) => setConversations(res.data.conversations || []))
        .catch((err) => {
          if (!silent) toast({ title: "Couldn't load conversations", description: apiErrorMessage(err), variant: "destructive" });
        })
        .finally(() => {
          if (!silent) setConversationsLoading(false);
        });
    },
    [toast]
  );

  const fetchMessages = useCallback(
    (id, opts = {}) => {
      const { silent = false } = opts;
      if (!silent) setMessagesLoading(true);
      return axiosInstance
        .get(`/conversations/${id}/messages`, { params: { page: 1, limit: 50 } })
        .then((res) => {
          const ascending = [...(res.data.messages || [])].reverse();
          setMsgTotalPages(res.data.totalPages || 1);
          setMessages((prev) => mergeNewMessages(prev, ascending));
        })
        .catch((err) => {
          if (!silent) toast({ title: "Couldn't load messages", description: apiErrorMessage(err), variant: "destructive" });
        })
        .finally(() => {
          if (!silent) setMessagesLoading(false);
        });
    },
    [toast]
  );

  const fetchPinned = useCallback((id) => {
    axiosInstance
      .get(`/conversations/pinned/${id}`)
      .then((res) => setPinnedMessages(res.data || []))
      .catch(() => setPinnedMessages([]));
  }, []);

  // Initial load: current user + conversation list + (if arriving from a
  // notification link) the conversation named in the ?c= query param.
  useEffect(() => {
    axiosInstance.get("/auth/me").then((res) => setMe(res.data)).catch(() => {});
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appliedInitialParamRef.current) return;
    const c = searchParams.get("c");
    if (c) {
      appliedInitialParamRef.current = true;
      setSelectedId(c);
    }
  }, [searchParams]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // -------------------------------------------------------------- //
  // Socket.io — real-time push replaces the old polling entirely. The
  // connection itself is owned by the authenticated shell (app-shell.jsx /
  // member-shell.jsx); this component only attaches listeners and joins/
  // leaves the room for whichever thread is open.
  // -------------------------------------------------------------- //

  useEffect(() => {
    const socket = getSocket();

    const onMessageNew = (message) => {
      if (message.conversation !== selectedIdRef.current) return;
      setMessages((prev) => mergeNewMessages(prev, [message]));
      forceScrollRef.current = true;
      if (message.sender?._id !== me?._id) {
        axiosInstance.put(`/conversations/${message.conversation}/read`).catch(() => {});
      }
    };

    const onMessageEdited = (payload) => {
      setMessages((prev) => prev.map((m) => (m._id === payload.messageId ? { ...m, content: payload.content, editedAt: payload.editedAt } : m)));
    };

    const onMessageDeleted = (payload) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === payload.messageId ? { ...m, isDeletedForEveryone: true, content: null, attachments: [] } : m))
      );
    };

    const onMessageReaction = (payload) => {
      setMessages((prev) => prev.map((m) => (m._id === payload.messageId ? { ...m, reactions: payload.reactions } : m)));
    };

    const onMessagePinned = (payload) => {
      setMessages((prev) => prev.map((m) => (m._id === payload.messageId ? { ...m, pinned: true } : m)));
      if (payload.conversationId === selectedIdRef.current) fetchPinned(payload.conversationId);
    };

    const onMessageUnpinned = (payload) => {
      setMessages((prev) => prev.map((m) => (m._id === payload.messageId ? { ...m, pinned: false } : m)));
      if (payload.conversationId === selectedIdRef.current) fetchPinned(payload.conversationId);
    };

    const onConversationCreated = (conversation) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversation._id);
        const merged = exists ? prev.map((c) => (c._id === conversation._id ? conversation : c)) : [conversation, ...prev];
        return merged.slice().sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    };

    const onConversationUpdated = (payload) => {
      setConversations((prev) =>
        prev
          .map((c) =>
            c._id === payload.conversationId
              ? {
                  ...c,
                  lastMessageText: payload.lastMessageText,
                  lastMessageAt: payload.lastMessageAt,
                  unreadCount: payload.conversationId === selectedIdRef.current ? c.unreadCount : (c.unreadCount || 0) + 1,
                }
              : c
          )
          .slice()
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      );
    };

    const onConversationRemoved = (payload) => {
      setConversations((prev) => prev.filter((c) => c._id !== payload.conversationId));
      if (payload.conversationId === selectedIdRef.current) {
        setSelectedId(null);
        router.replace(basePath, { scroll: false });
      }
    };

    const onParticipantsUpdated = (payload) => {
      setConversations((prev) => prev.map((c) => (c._id === payload.conversationId ? payload.conversation : c)));
    };

    const onReceiptDelivered = (payload) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id !== payload.conversationId) return c;
          const rest = (c.lastDeliveredBy || []).filter((e) => (e.user?._id || e.user) !== payload.userId);
          return { ...c, lastDeliveredBy: [...rest, { user: payload.userId, lastDeliveredAt: payload.lastDeliveredAt }] };
        })
      );
    };

    const onReceiptRead = (payload) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id !== payload.conversationId) return c;
          const rest = (c.lastReadBy || []).filter((e) => (e.user?._id || e.user) !== payload.userId);
          return { ...c, lastReadBy: [...rest, { user: payload.userId, lastReadAt: payload.lastReadAt }] };
        })
      );
    };

    const onPresenceSnapshot = (payload) => {
      setOnlineUserIds(new Set(payload.onlineUserIds || []));
    };

    const onPresenceUpdate = (payload) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
      if (payload.lastSeenAt) setLastSeenById((prev) => ({ ...prev, [payload.userId]: payload.lastSeenAt }));
    };

    const onTypingStart = (payload) => {
      setTypingByConversation((prev) => ({
        ...prev,
        [payload.conversationId]: { ...(prev[payload.conversationId] || {}), [payload.userId]: payload.fullName },
      }));
      clearTimeout(typingSafetyTimersRef.current[`${payload.conversationId}:${payload.userId}`]);
      typingSafetyTimersRef.current[`${payload.conversationId}:${payload.userId}`] = setTimeout(() => {
        setTypingByConversation((prev) => {
          const next = { ...(prev[payload.conversationId] || {}) };
          delete next[payload.userId];
          return { ...prev, [payload.conversationId]: next };
        });
      }, TYPING_SAFETY_MS);
    };

    const onTypingStop = (payload) => {
      clearTimeout(typingSafetyTimersRef.current[`${payload.conversationId}:${payload.userId}`]);
      setTypingByConversation((prev) => {
        const next = { ...(prev[payload.conversationId] || {}) };
        delete next[payload.userId];
        return { ...prev, [payload.conversationId]: next };
      });
    };

    socket.on("message:new", onMessageNew);
    socket.on("message:edited", onMessageEdited);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("message:reaction", onMessageReaction);
    socket.on("message:pinned", onMessagePinned);
    socket.on("message:unpinned", onMessageUnpinned);
    socket.on("conversation:created", onConversationCreated);
    socket.on("conversation:updated", onConversationUpdated);
    socket.on("conversation:removed", onConversationRemoved);
    socket.on("participants:updated", onParticipantsUpdated);
    socket.on("receipt:delivered", onReceiptDelivered);
    socket.on("receipt:read", onReceiptRead);
    socket.on("presence:snapshot", onPresenceSnapshot);
    socket.on("presence:update", onPresenceUpdate);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("message:edited", onMessageEdited);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("message:reaction", onMessageReaction);
      socket.off("message:pinned", onMessagePinned);
      socket.off("message:unpinned", onMessageUnpinned);
      socket.off("conversation:created", onConversationCreated);
      socket.off("conversation:updated", onConversationUpdated);
      socket.off("conversation:removed", onConversationRemoved);
      socket.off("participants:updated", onParticipantsUpdated);
      socket.off("receipt:delivered", onReceiptDelivered);
      socket.off("receipt:read", onReceiptRead);
      socket.off("presence:snapshot", onPresenceSnapshot);
      socket.off("presence:update", onPresenceUpdate);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?._id, basePath]);

  // Join/leave the conversation's live room as threads open/close.
  useEffect(() => {
    if (!selectedId) return undefined;
    const socket = getSocket();
    socket.emit("conversation:join", selectedId);
    return () => socket.emit("conversation:leave", selectedId);
  }, [selectedId]);

  // Opening a thread: reset its message state, fetch page 1, mark read.
  useEffect(() => {
    if (!selectedId) return;
    setMessages([]);
    setMsgPage(1);
    setMsgTotalPages(1);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    isNearBottomRef.current = true;
    forceScrollRef.current = true;
    fetchMessages(selectedId);
    fetchPinned(selectedId);
    axiosInstance.put(`/conversations/${selectedId}/read`).catch(() => {});
    setConversations((prev) => prev.map((c) => (c._id === selectedId ? { ...c, unreadCount: 0 } : c)));
  }, [selectedId, fetchMessages, fetchPinned]);

  // Auto-scroll: always on send/initial load, otherwise only if the reader
  // was already near the bottom — avoids yanking someone reading history.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (forceScrollRef.current || isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      forceScrollRef.current = false;
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  // -------------------------------------------------------------- //
  // Actions
  // -------------------------------------------------------------- //

  const openThread = (id) => setSelectedId(id);

  const closeThread = () => {
    setSelectedId(null);
    router.replace(basePath, { scroll: false });
  };

  const loadOlder = () => {
    if (loadingOlder || msgPage >= msgTotalPages || !selectedId) return;
    setLoadingOlder(true);
    const nextPage = msgPage + 1;
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;
    axiosInstance
      .get(`/conversations/${selectedId}/messages`, { params: { page: nextPage, limit: 50 } })
      .then((res) => {
        const olderAscending = [...(res.data.messages || [])].reverse();
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const toPrepend = olderAscending.filter((m) => !existingIds.has(m._id));
          return [...toPrepend, ...prev];
        });
        setMsgPage(nextPage);
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
        });
      })
      .catch((err) => toast({ title: "Couldn't load earlier messages", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => setLoadingOlder(false));
  };

  const stopTyping = useCallback(() => {
    if (!typingStateRef.current.isTyping || !selectedId) return;
    typingStateRef.current.isTyping = false;
    getSocket().emit("typing:stop", selectedId);
  }, [selectedId]);

  const handleTyping = useCallback(() => {
    if (!selectedId) return;
    if (!typingStateRef.current.isTyping) {
      typingStateRef.current.isTyping = true;
      getSocket().emit("typing:start", selectedId);
    }
    clearTimeout(typingStateRef.current.idleTimer);
    typingStateRef.current.idleTimer = setTimeout(stopTyping, TYPING_IDLE_MS);
  }, [selectedId, stopTyping]);

  const send = () => {
    const content = draft.trim();
    if ((!content && !files.length) || sending || !selectedId) return;
    setSending(true);
    forceScrollRef.current = true;
    stopTyping();

    if (editingMessage) {
      axiosInstance
        .put(`/conversations/${selectedId}/messages/${editingMessage._id}`, { content })
        .then((res) => {
          setMessages((prev) => prev.map((m) => (m._id === res.data._id ? res.data : m)));
          setDraft("");
          setEditingMessage(null);
          if (textareaRef.current) textareaRef.current.style.height = "auto";
        })
        .catch((err) => toast({ title: "Couldn't edit message", description: apiErrorMessage(err), variant: "destructive" }))
        .finally(() => setSending(false));
      return;
    }

    const fd = new FormData();
    if (content) fd.append("content", content);
    if (replyingTo) fd.append("replyTo", replyingTo._id);
    files.forEach((f) => fd.append("files", f));

    axiosInstance
      .post(`/conversations/${selectedId}/messages`, fd)
      .then((res) => {
        setMessages((prev) => mergeNewMessages(prev, [res.data]));
        setDraft("");
        setFiles([]);
        setReplyingTo(null);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setConversations((prev) =>
          prev
            .map((c) => (c._id === selectedId ? { ...c, lastMessageText: content || `[${res.data.attachments?.[0]?.type}]`, lastMessageAt: res.data.createdAt } : c))
            .slice()
            .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
        );
      })
      .catch((err) => toast({ title: "Couldn't send message", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => setSending(false));
  };

  const handleFilesSelected = (list) => setFiles((prev) => [...prev, ...list]);
  const handleRemoveFile = (i) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const startReply = (message) => {
    setEditingMessage(null);
    setReplyingTo(message);
    textareaRef.current?.focus();
  };

  const startEdit = (message) => {
    setReplyingTo(null);
    setEditingMessage(message);
    setDraft(message.content || "");
    textareaRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setEditingMessage(null);
    setDraft("");
  };

  const deleteMessage = (message, forEveryone) => {
    axiosInstance
      .delete(`/conversations/${selectedId}/messages/${message._id}`, { data: { forEveryone } })
      .then(() => {
        if (forEveryone) {
          setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, isDeletedForEveryone: true, content: null, attachments: [] } : m)));
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== message._id));
        }
      })
      .catch((err) => toast({ title: "Couldn't delete message", description: apiErrorMessage(err), variant: "destructive" }));
  };

  const reactToMessage = (message, emoji) => {
    axiosInstance
      .put(`/conversations/${selectedId}/messages/${message._id}/reactions`, { emoji })
      .then((res) => setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, reactions: res.data.reactions } : m))))
      .catch((err) => toast({ title: "Couldn't react to message", description: apiErrorMessage(err), variant: "destructive" }));
  };

  const pinMessage = (message, pinned) => {
    axiosInstance
      .put(`/conversations/${selectedId}/messages/${message._id}/pin`, { pinned })
      .then(() => {
        setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, pinned } : m)));
        fetchPinned(selectedId);
      })
      .catch((err) => toast({ title: "Couldn't update pinned message", description: apiErrorMessage(err), variant: "destructive" }));
  };

  const runSearch = () => {
    const q = searchQuery.trim();
    if (!q || !selectedId) {
      setSearchResults([]);
      return;
    }
    axiosInstance
      .get(`/conversations/${selectedId}/messages/search`, { params: { q } })
      .then((res) => setSearchResults(res.data.messages || []))
      .catch(() => setSearchResults([]));
  };

  const jumpToMessage = (messageId) => {
    setSearchOpen(false);
    const el = document.getElementById(`message-${messageId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleConversationCreated = (conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c._id === conversation._id);
      const merged = exists ? prev.map((c) => (c._id === conversation._id ? conversation : c)) : [conversation, ...prev];
      return merged.slice().sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    });
    setSelectedId(conversation._id);
  };

  const handleConversationUpdated = (conversation) => {
    setConversations((prev) => prev.map((c) => (c._id === conversation._id ? conversation : c)));
  };

  const handleLeft = () => {
    setConversations((prev) => prev.filter((c) => c._id !== selectedId));
    setParticipantsOpen(false);
    setSelectedId(null);
    router.replace(basePath, { scroll: false });
    toast({ title: "Left the conversation" });
  };

  const typingNames = Object.values(typingByConversation[selectedId] || {});

  const newMessageButton = (
    <button
      type="button"
      onClick={() => setNewMsgOpen(true)}
      className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> New message
    </button>
  );

  // -------------------------------------------------------------- //
  // Render
  // -------------------------------------------------------------- //

  return (
    <div>
      <PageHeader title="Messages" description="Direct and group conversations with other members." action={newMessageButton} />

      <div className="app-glass glass-shadow rounded-2xl overflow-hidden md:grid md:grid-cols-[320px_1fr] h-[min(76vh,720px)] min-h-[460px]">
        {/* Conversation list pane */}
        <div className={`${selectedId ? "hidden md:flex" : "flex"} flex-col min-h-0 md:border-r md:border-line`}>
          <div className="flex-1 overflow-y-auto min-h-0">
            {conversationsLoading && (
              <div className="p-3 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-ivory animate-pulse" />
                ))}
              </div>
            )}

            {!conversationsLoading && conversations.length === 0 && (
              <EmptyState
                icon={MessageCircle}
                title="No conversations yet"
                description="Start a conversation with another member to see it here."
                action={newMessageButton}
              />
            )}

            {!conversationsLoading &&
              conversations.map((c) => {
                const title = conversationTitle(c, me?._id, nicknames);
                const active = c._id === selectedId;
                const other = otherParticipant(c, me?._id);
                const online = other && onlineUserIds.has(other._id);
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => openThread(c._id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 text-left border-b border-line last:border-0 ${
                      active ? "bg-[#E5E3FB]" : "hover:bg-ivory"
                    }`}
                  >
                    <div className="relative flex-none">
                      <Avatar isGroup={c.isGroup} name={title} src={conversationAvatarUrl(c, me?._id)} />
                      {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-ok border-2 border-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-ink text-[13px] truncate">{title}</span>
                        <span className="text-[10.5px] text-body/70 flex-none">{timeAgo(c.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-[12px] text-body truncate">{c.lastMessageText || "No messages yet"}</span>
                        {!!c.unreadCount && (
                          <span className="h-4 min-w-4 px-1 rounded-full bg-alarm text-white text-[9px] font-bold flex items-center justify-center flex-none">
                            {c.unreadCount > 9 ? "9+" : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Thread pane */}
        <div className={`${selectedId ? "flex" : "hidden md:flex"} flex-col min-h-0 min-w-0`}>
          {!selectedId && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="h-11 w-11 rounded-full bg-ivory flex items-center justify-center mb-3">
                <MessageCircle className="h-5 w-5 text-body" strokeWidth={1.75} />
              </div>
              <div className="font-display font-bold text-ink text-[15px]">Select a conversation</div>
              <p className="text-sm text-body mt-1 max-w-xs">Choose a conversation from the list, or start a new one.</p>
            </div>
          )}

          {selectedId && (
            <>
              <div className="flex-none flex items-center gap-2.5 px-3.5 py-3 border-b border-line">
                <button
                  type="button"
                  onClick={closeThread}
                  aria-label="Back to conversations"
                  className="md:hidden h-8 w-8 rounded-full border border-line bg-white flex items-center justify-center flex-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <Avatar isGroup={activeConversation?.isGroup} name={threadTitle} src={conversationAvatarUrl(activeConversation, me?._id)} size="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-ink text-[13.5px] truncate">{threadTitle}</div>
                  {activeConversation?.isGroup ? (
                    <div className="text-[11px] text-body truncate">
                      {typingNames.length > 0 ? `${typingNames.join(", ")} typing…` : `${activeConversation.participants.length} participants`}
                    </div>
                  ) : (
                    <div className="text-[11px] text-body truncate">
                      {typingNames.length > 0
                        ? "typing…"
                        : threadOnline
                          ? "Online"
                          : lastSeenById[threadOther?._id] || threadOther?.lastSeenAt
                            ? `Last seen ${formatLastSeen(lastSeenById[threadOther?._id] || threadOther?.lastSeenAt)}`
                            : ""}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-label="Search in conversation"
                  className="h-8 w-8 rounded-full border border-line bg-white flex items-center justify-center flex-none"
                >
                  <Search className="h-4 w-4 text-body" strokeWidth={2} />
                </button>
                {activeConversation?.isGroup && (
                  <button
                    type="button"
                    onClick={() => setParticipantsOpen(true)}
                    aria-label="Group participants"
                    className="h-8 w-8 rounded-full border border-line bg-white flex items-center justify-center flex-none"
                  >
                    <Users className="h-4 w-4 text-body" strokeWidth={2} />
                  </button>
                )}
              </div>

              {searchOpen && (
                <div className="flex-none px-3.5 py-2 border-b border-line">
                  <div className="flex items-center gap-2 h-9 rounded-full border border-line bg-white px-3">
                    <Search className="h-3.5 w-3.5 text-body/70 flex-none" />
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder="Search in this conversation…"
                      className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-ink placeholder:text-body/60"
                    />
                    <button type="button" onClick={runSearch} className="text-[11px] font-bold text-madder flex-none">
                      Search
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-1.5 max-h-32 overflow-y-auto rounded-xl border border-line divide-y divide-line">
                      {searchResults.map((m) => (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => jumpToMessage(m._id)}
                          className="w-full text-left px-3 py-1.5 text-[12px] text-ink hover:bg-ivory truncate"
                        >
                          {m.content}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pinnedMessages.length > 0 && (
                <div className="flex-none px-3.5 py-1.5 border-b border-line bg-ivory space-y-1">
                  {pinnedMessages.map((m) => (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => jumpToMessage(m._id)}
                      className="w-full flex items-center gap-1.5 text-[11px] text-ink text-left truncate"
                    >
                      <Pin className="h-3 w-3 text-madder flex-none" />
                      <span className="truncate">{m.content || "[attachment]"}</span>
                    </button>
                  ))}
                </div>
              )}

              <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-3.5 py-3 flex flex-col gap-2">
                {msgPage < msgTotalPages && (
                  <button
                    type="button"
                    onClick={loadOlder}
                    disabled={loadingOlder}
                    className="self-center text-[11px] font-semibold text-madder mb-2 disabled:opacity-60"
                  >
                    {loadingOlder ? "Loading…" : "Load earlier messages"}
                  </button>
                )}

                {messagesLoading && <div className="text-center text-xs text-body py-6">Loading messages…</div>}

                {!messagesLoading && messages.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-center text-xs text-body py-10">No messages yet — say hello.</div>
                )}

                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const showSenderName = activeConversation?.isGroup && (!prev || prev.sender?._id !== m.sender?._id);
                  return (
                    <div key={m._id} id={`message-${m._id}`}>
                      <MessageBubble
                        message={m}
                        conversation={activeConversation}
                        meId={me?._id}
                        showSenderName={showSenderName}
                        canPin={threadAmAdmin}
                        onReply={startReply}
                        onEdit={startEdit}
                        onDelete={deleteMessage}
                        onReact={reactToMessage}
                        onPin={pinMessage}
                        onForward={setForwardMessage}
                      />
                    </div>
                  );
                })}
              </div>

              {editingMessage && (
                <div className="flex-none flex items-center justify-between gap-2 px-3.5 py-1.5 bg-ivory border-t border-line">
                  <span className="text-[11px] font-bold text-madder">Editing message</span>
                  <button type="button" onClick={cancelReply} aria-label="Cancel edit" className="text-body/60">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <Composer
                draft={draft}
                onDraftChange={setDraft}
                onSend={send}
                onTyping={handleTyping}
                replyingTo={replyingTo}
                onCancelReply={cancelReply}
                files={files}
                onFilesSelected={handleFilesSelected}
                onRemoveFile={handleRemoveFile}
                sending={sending}
                textareaRef={textareaRef}
              />
            </>
          )}
        </div>
      </div>

      <NewMessageDialog open={newMsgOpen} onOpenChange={setNewMsgOpen} meId={me?._id} onCreated={handleConversationCreated} />
      <ParticipantsDialog
        open={participantsOpen}
        onOpenChange={setParticipantsOpen}
        conversation={activeConversation}
        meId={me?._id}
        onUpdated={handleConversationUpdated}
        onLeft={handleLeft}
      />
      <ForwardDialog
        open={!!forwardMessage}
        onOpenChange={(v) => !v && setForwardMessage(null)}
        message={forwardMessage}
        conversations={conversations}
        meId={me?._id}
        onForwarded={() => setForwardMessage(null)}
      />
    </div>
  );
}
