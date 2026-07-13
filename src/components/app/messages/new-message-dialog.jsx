"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DirectoryPicker, SelectedChips } from "./directory-picker";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";

// New message dialog — pick one person to message directly, or several to
// start a group (reuses/dedupes an existing 1:1 via the backend). Groups can
// also get an optional description at creation time.
export default function NewMessageDialog({ open, onOpenChange, meId, onCreated }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setGroupName("");
      setDescription("");
    }
  }, [open]);

  const toggle = (u) => {
    setSelected((prev) => (prev.some((p) => p._id === u._id) ? prev.filter((p) => p._id !== u._id) : [...prev, u]));
  };

  const isGroup = selected.length > 1;

  const submit = () => {
    if (!selected.length || creating) return;
    if (isGroup && !groupName.trim()) {
      toast({ title: "Group name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    axiosInstance
      .post("/conversations", {
        participantIds: selected.map((u) => u._id),
        isGroup,
        groupName: isGroup ? groupName.trim() : undefined,
        description: isGroup ? description.trim() || undefined : undefined,
      })
      .then((res) => {
        onCreated(res.data);
        onOpenChange(false);
      })
      .catch((err) => toast({ title: "Couldn't start conversation", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => setCreating(false));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !creating && onOpenChange(v)}>
      <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-ink">New message</DialogTitle>
          <DialogDescription className="text-body">
            Pick one person to message directly, or several to start a group.
          </DialogDescription>
        </DialogHeader>

        <SelectedChips selected={selected} onRemove={toggle} />
        <DirectoryPicker excludeIds={meId ? [meId] : []} selected={selected} onToggle={toggle} />

        {isGroup && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1.5">Group name</label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Wing A committee"
                className="w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/50 outline-none focus:border-madder"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-body uppercase tracking-wide mb-1.5">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="What's this group for?"
                className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/50 outline-none focus:border-madder resize-none"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="h-9 px-4 rounded-full border border-line bg-white text-[13px] font-bold text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!selected.length || creating}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
          >
            {creating ? "Starting…" : isGroup ? "Create group" : "Start conversation"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
