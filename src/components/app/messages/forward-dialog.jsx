"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Avatar from "@/components/app/avatar";
import { conversationTitle, conversationAvatarUrl } from "./helpers";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useNicknames } from "@/hooks/use-nicknames";

// Lets the viewer pick one of their own conversations to forward a message into.
export default function ForwardDialog({ open, onOpenChange, message, conversations, meId, onForwarded }) {
  const { toast } = useToast();
  const { nicknames } = useNicknames();
  const [sendingId, setSendingId] = useState(null);

  if (!message) return null;

  const forwardTo = (conversationId) => {
    setSendingId(conversationId);
    const fd = new FormData();
    fd.append("content", message.content || "");
    fd.append("forwardedFrom", message._id);
    axiosInstance
      .post(`/conversations/${conversationId}/messages`, fd)
      .then(() => {
        toast({ title: "Message forwarded" });
        onForwarded?.(conversationId);
        onOpenChange(false);
      })
      .catch((err) => toast({ title: "Couldn't forward message", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => setSendingId(null));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-line rounded-2xl max-w-sm max-h-[75vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-ink">Forward message</DialogTitle>
          <DialogDescription className="text-body">Choose a conversation to forward this to.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-line divide-y divide-line">
          {conversations.map((c) => {
            const title = conversationTitle(c, meId, nicknames);
            return (
              <button
                key={c._id}
                type="button"
                onClick={() => forwardTo(c._id)}
                disabled={sendingId === c._id}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-ivory text-left disabled:opacity-60"
              >
                <Avatar isGroup={c.isGroup} name={title} src={conversationAvatarUrl(c, meId)} size="h-8 w-8" textSize="text-[10.5px]" />
                <span className="text-[12.5px] font-bold text-ink truncate flex-1">{title}</span>
                {sendingId === c._id && <span className="text-[11px] text-body">Sending…</span>}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
