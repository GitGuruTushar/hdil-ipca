"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  MoreVertical,
  Reply,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Forward,
  SmilePlus,
  FileText,
  Download,
} from "lucide-react";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";
import { formatClock, deliveryState, EDIT_WINDOW_MS, DELETE_FOR_EVERYONE_WINDOW_MS, REACTION_EMOJIS } from "./helpers";

function MessageTicks({ state }) {
  if (state === "read") return <CheckCheck className="h-3.5 w-3.5 text-sky-300" strokeWidth={2.5} />;
  if (state === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-white/70" strokeWidth={2.5} />;
  if (state === "sent") return <Check className="h-3.5 w-3.5 text-white/70" strokeWidth={2.5} />;
  return null;
}

function AttachmentView({ attachment }) {
  if (attachment.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={attachment.url} alt="" className="max-h-56 w-auto rounded-xl object-cover cursor-pointer" onClick={() => window.open(attachment.url, "_blank")} />
    );
  }
  if (attachment.type === "video") {
    return <video src={attachment.url} controls className="max-h-56 w-auto rounded-xl" />;
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2 text-[12px] font-semibold"
    >
      <FileText className="h-4 w-4 flex-none" />
      <span className="truncate max-w-[160px]">{attachment.fileName || "Document"}</span>
      <Download className="h-3.5 w-3.5 flex-none" />
    </a>
  );
}

export default function MessageBubble({
  message,
  conversation,
  meId,
  showSenderName,
  canPin,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onPin,
  onForward,
}) {
  const { nicknames } = useNicknames();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const reactionPickerRef = useRef(null);

  // Fixed positioning computed from the trigger's real screen position, rather
  // than an absolute offset relative to the bubble — the message list scrolls
  // with overflow-y-auto, which clips any absolutely-positioned dropdown that
  // would otherwise overflow past the scrollable area (a real bug: the menu on
  // the last few messages in a thread was getting cut off at the bottom).
  // Idempotent "open" rather than a toggle — a toggle is fragile against any
  // double-invocation (double-click, a stray duplicate event, etc.) since an
  // even number of calls silently cancels itself back to closed. Closing only
  // ever happens via the explicit close paths below (menu item click, click-
  // outside, scroll), never by re-clicking the trigger.
  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const openUpward = rect.bottom + 220 > window.innerHeight;
      setMenuStyle({
        position: "fixed",
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: mine ? undefined : rect.left,
        right: mine ? window.innerWidth - rect.right : undefined,
      });
    }
    setMenuOpen(true);
    setReactionPickerOpen(false);
  };

  // Click/tap-outside dismissal (works on touch devices, unlike :hover-based
  // dismissal) plus close-on-scroll since a scroll would leave the fixed-
  // positioned popover pointing at empty space.
  useEffect(() => {
    if (!menuOpen && !reactionPickerOpen) return undefined;
    const isOutside = (target) =>
      !triggerRef.current?.contains(target) && !menuRef.current?.contains(target) && !reactionPickerRef.current?.contains(target);
    const closeIfOutside = (e) => {
      if (isOutside(e.target)) {
        setMenuOpen(false);
        setReactionPickerOpen(false);
      }
    };
    const closeOnScroll = () => {
      setMenuOpen(false);
      setReactionPickerOpen(false);
    };
    document.addEventListener("mousedown", closeIfOutside, true);
    document.addEventListener("touchstart", closeIfOutside, true);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside, true);
      document.removeEventListener("touchstart", closeIfOutside, true);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [menuOpen, reactionPickerOpen]);

  const mine = message.sender?._id === meId;
  const state = deliveryState(message, conversation, meId);
  const withinEditWindow = mine && Date.now() - new Date(message.createdAt).getTime() < EDIT_WINDOW_MS;
  const withinDeleteForEveryoneWindow = mine && Date.now() - new Date(message.createdAt).getTime() < DELETE_FOR_EVERYONE_WINDOW_MS;

  if (message.isDeletedForEveryone) {
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[78%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 bg-ivory text-body/60 italic text-[12.5px]">
          This message was deleted
        </div>
      </div>
    );
  }

  const reactionCounts = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const myReaction = (message.reactions || []).find((r) => r.user === meId || r.user?._id === meId);

  return (
    <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[78%] sm:max-w-[70%]">
        {message.pinned && (
          <div className={`flex items-center gap-1 text-[10px] font-bold text-body/60 mb-0.5 ${mine ? "justify-end" : ""}`}>
            <Pin className="h-2.5 w-2.5" /> Pinned
          </div>
        )}
        <div
          className={`rounded-2xl px-3.5 py-2 ${
            mine ? "bg-gradient-to-br from-madder to-grape text-white rounded-br-sm" : "bg-ivory text-ink rounded-bl-sm"
          }`}
        >
          {showSenderName && !mine && (
            <div className="text-[10.5px] font-bold text-madder mb-0.5">{getDisplayName(message.sender, nicknames)}</div>
          )}

          {message.replyTo && (
            <div className={`rounded-lg px-2 py-1 mb-1.5 text-[11px] border-l-2 ${mine ? "bg-white/15 border-white/50" : "bg-white border-madder"}`}>
              <div className={`font-bold ${mine ? "text-white/90" : "text-madder"}`}>{getDisplayName(message.replyTo.sender, nicknames)}</div>
              <div className={`truncate ${mine ? "text-white/70" : "text-body"}`}>{message.replyTo.content || "[attachment]"}</div>
            </div>
          )}

          {message.forwardedFrom && <div className={`text-[10px] italic mb-1 ${mine ? "text-white/70" : "text-body/60"}`}>Forwarded</div>}

          {message.attachments?.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-1.5">
              {message.attachments.map((a, i) => (
                <AttachmentView key={i} attachment={a} />
              ))}
            </div>
          )}

          {message.content && <div className="text-[13px] whitespace-pre-wrap break-words">{message.content}</div>}

          <div className={`flex items-center gap-1 mt-1 justify-end`}>
            {message.editedAt && <span className={`text-[9px] ${mine ? "text-white/60" : "text-body/60"}`}>(edited)</span>}
            <span className={`text-[9.5px] ${mine ? "text-white/70" : "text-body/70"}`}>{formatClock(message.createdAt)}</span>
            {mine && <MessageTicks state={state} />}
          </div>
        </div>

        {Object.keys(reactionCounts).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? "justify-end" : ""}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message, emoji)}
                className={`text-[11px] rounded-full px-1.5 py-0.5 border ${
                  myReaction?.emoji === emoji ? "border-madder bg-[#E5E3FB]" : "border-line bg-white"
                }`}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}

        {/* Hover/tap menu trigger */}
        <div className={`absolute top-0 ${mine ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button
            ref={triggerRef}
            type="button"
            onClick={openMenu}
            aria-label="Message actions"
            className="h-7 w-7 rounded-full bg-white border border-line flex items-center justify-center text-body"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        {menuOpen && (
          <div ref={menuRef} style={menuStyle || {}} className="z-30 w-40 rounded-xl border border-line bg-white glass-shadow py-1">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setReactionPickerOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-ivory"
            >
              <SmilePlus className="h-3.5 w-3.5" /> React
            </button>
            <button
              type="button"
              onClick={() => {
                onReply(message);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-ivory"
            >
              <Reply className="h-3.5 w-3.5" /> Reply
            </button>
            <button
              type="button"
              onClick={() => {
                onForward(message);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-ivory"
            >
              <Forward className="h-3.5 w-3.5" /> Forward
            </button>
            {canPin && (
              <button
                type="button"
                onClick={() => {
                  onPin(message, !message.pinned);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-ivory"
              >
                {message.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                {message.pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {mine && withinEditWindow && !message.attachments?.length && (
              <button
                type="button"
                onClick={() => {
                  onEdit(message);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-ivory"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onDelete(message, false);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-alarm hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete for me
            </button>
            {mine && withinDeleteForEveryoneWindow && (
              <button
                type="button"
                onClick={() => {
                  onDelete(message, true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-alarm hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
              </button>
            )}
          </div>
        )}

        {reactionPickerOpen && (
          <div
            ref={reactionPickerRef}
            style={menuStyle || {}}
            className="z-30 flex gap-1 rounded-full border border-line bg-white glass-shadow px-2 py-1.5"
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(message, emoji);
                  setReactionPickerOpen(false);
                  setMenuOpen(false);
                }}
                className="text-base hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
