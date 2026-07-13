"use client";
import { useEffect, useRef, useState } from "react";
import { UserPlus, LogOut, Crown, UserMinus, Camera, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Avatar from "@/components/app/avatar";
import ConfirmDialog from "@/components/app/confirm-dialog";
import NicknameEditor from "@/components/app/nickname-editor";
import { DirectoryPicker, SelectedChips } from "./directory-picker";
import { isConversationAdmin } from "./helpers";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

// Group info dialog — view participants, admins manage the group (rename,
// description, photo, add/remove/promote), everyone can view + leave.
export default function ParticipantsDialog({ open, onOpenChange, conversation, meId, onUpdated, onLeft }) {
  const { toast } = useToast();
  const { nicknames } = useNicknames();
  const fileInputRef = useRef(null);

  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [togglingAdminId, setTogglingAdminId] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [editingInfo, setEditingInfo] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  useEffect(() => {
    if (!open) {
      setAdding(false);
      setSelected([]);
      setEditingInfo(false);
    }
  }, [open]);

  if (!conversation) return null;

  const amAdmin = isConversationAdmin(conversation, meId);

  const toggle = (u) => {
    setSelected((prev) => (prev.some((p) => p._id === u._id) ? prev.filter((p) => p._id !== u._id) : [...prev, u]));
  };

  const submitAdd = () => {
    if (!selected.length || saving) return;
    setSaving(true);
    axiosInstance
      .post(`/conversations/${conversation._id}/participants`, { userIds: selected.map((u) => u._id) })
      .then((res) => {
        onUpdated(res.data);
        setAdding(false);
        setSelected([]);
        toast({ title: "Participants added" });
      })
      .catch((err) => toast({ title: "Couldn't add participants", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => setSaving(false));
  };

  const leave = () => {
    setLeaving(true);
    axiosInstance
      .post(`/conversations/${conversation._id}/leave`)
      .then(() => onLeft())
      .catch((err) => toast({ title: "Couldn't leave conversation", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => {
        setLeaving(false);
        setConfirmLeaveOpen(false);
      });
  };

  const confirmRemove = () => {
    if (!removeTarget || removing) return;
    setRemoving(true);
    axiosInstance
      .delete(`/conversations/${conversation._id}/participants/${removeTarget._id}`)
      .then((res) => {
        if (res.data?.conversation) onUpdated(res.data.conversation);
        else onUpdated(res.data);
        toast({ title: "Participant removed" });
      })
      .catch((err) => toast({ title: "Couldn't remove participant", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => {
        setRemoving(false);
        setRemoveTarget(null);
      });
  };

  const toggleAdmin = (participant, promote) => {
    setTogglingAdminId(participant._id);
    axiosInstance
      .put(`/conversations/${conversation._id}/admins/${participant._id}`, { promote })
      .then((res) => onUpdated(res.data))
      .catch((err) => toast({ title: "Couldn't update admin status", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => setTogglingAdminId(null));
  };

  const startEditingInfo = () => {
    setNameDraft(conversation.groupName || "");
    setDescriptionDraft(conversation.description || "");
    setEditingInfo(true);
  };

  const saveInfo = () => {
    if (savingInfo) return;
    setSavingInfo(true);
    axiosInstance
      .put(`/conversations/${conversation._id}`, { groupName: nameDraft.trim(), description: descriptionDraft.trim() })
      .then((res) => {
        onUpdated(res.data);
        setEditingInfo(false);
        toast({ title: "Group updated" });
      })
      .catch((err) => toast({ title: "Couldn't update group", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => setSavingInfo(false));
  };

  const uploadAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    axiosInstance
      .post(`/conversations/${conversation._id}/avatar`, fd)
      .then((res) => onUpdated(res.data))
      .catch((err) => toast({ title: "Couldn't update group photo", description: apiErrorMessage(err), variant: "destructive" }))
      .finally(() => {
        setAvatarUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  };

  const existingIds = (conversation.participants || []).map((p) => p._id);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar isGroup name={conversation.groupName} src={conversation.avatarUrl} size="h-12 w-12" />
                {amAdmin && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    aria-label="Change group photo"
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-madder text-white flex items-center justify-center border-2 border-white"
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="font-display text-ink truncate">{conversation.groupName}</DialogTitle>
                <DialogDescription className="text-body">{conversation.participants.length} participants</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {conversation.description && !editingInfo && <p className="text-[12.5px] text-body -mt-2">{conversation.description}</p>}

          {amAdmin &&
            (editingInfo ? (
              <div className="space-y-2">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={100}
                  className="w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink outline-none focus:border-madder"
                  placeholder="Group name"
                />
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[12.5px] text-ink outline-none focus:border-madder resize-none"
                  placeholder="Description"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingInfo(false)} className="h-8 px-3 rounded-full border border-line bg-white text-[12px] font-bold text-ink">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveInfo}
                    disabled={savingInfo}
                    className="h-8 px-3 rounded-full text-[12px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                  >
                    {savingInfo ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={startEditingInfo} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-madder">
                <Pencil className="h-3.5 w-3.5" /> Edit name/description
              </button>
            ))}

          <div className="rounded-xl border border-line divide-y divide-line max-h-56 overflow-y-auto">
            {conversation.participants.map((p) => {
              const isSelf = p._id === meId;
              const pIsAdmin = isConversationAdmin(conversation, p._id);
              const name = getDisplayName(p, nicknames);
              return (
                <div key={p._id} className="flex items-center gap-2.5 px-3 py-2">
                  <Avatar isGroup={false} name={name} src={p.profilePicture} size="h-8 w-8" textSize="text-[10.5px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px] font-bold text-ink truncate">
                        {name} {isSelf && <span className="text-body font-normal">(you)</span>}
                      </span>
                      {pIsAdmin && conversation.isGroup && (
                        <span title="Group admin">
                          <Crown className="h-3 w-3 text-amber-500 flex-none" />
                        </span>
                      )}
                      {!isSelf && <NicknameEditor targetUserId={p._id} realName={p.fullName || p.username} />}
                    </div>
                    <div className="text-[11px] text-body truncate">@{p.username}</div>
                  </div>
                  {amAdmin && !isSelf && conversation.isGroup && (
                    <div className="flex items-center gap-1 flex-none">
                      <button
                        type="button"
                        onClick={() => toggleAdmin(p, !pIsAdmin)}
                        disabled={togglingAdminId === p._id}
                        className="text-[10.5px] font-bold text-madder disabled:opacity-60"
                      >
                        {pIsAdmin ? "Demote" : "Promote"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(p)}
                        aria-label={`Remove ${name}`}
                        className="h-7 w-7 rounded-full flex items-center justify-center text-alarm hover:bg-red-50"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {adding ? (
            <div>
              <SelectedChips selected={selected} onRemove={toggle} />
              <DirectoryPicker excludeIds={existingIds} selected={selected} onToggle={toggle} />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setSelected([]);
                  }}
                  className="h-9 px-4 rounded-full border border-line bg-white text-[13px] font-bold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitAdd}
                  disabled={!selected.length || saving}
                  className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60"
                >
                  {saving ? "Adding…" : "Add"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-madder">
              <UserPlus className="h-3.5 w-3.5" strokeWidth={2} /> Add participants
            </button>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={() => setConfirmLeaveOpen(true)}
              className="h-9 px-3 rounded-full text-[13px] font-bold text-alarm inline-flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} /> Leave group
            </button>
            <button type="button" onClick={() => onOpenChange(false)} className="h-9 px-4 rounded-full border border-line bg-white text-[13px] font-bold text-ink">
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmLeaveOpen}
        onOpenChange={setConfirmLeaveOpen}
        title="Leave this group?"
        description={`You'll stop receiving messages from ${conversation.groupName} unless someone adds you back.`}
        confirmLabel="Leave"
        loading={leaving}
        onConfirm={leave}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title="Remove this participant?"
        description={removeTarget ? `${getDisplayName(removeTarget, nicknames)} will lose access to this group.` : ""}
        confirmLabel="Remove"
        loading={removing}
        onConfirm={confirmRemove}
      />
    </>
  );
}
