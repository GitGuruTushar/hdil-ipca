"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Check, X as XIcon, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/app/page-header";
import EmptyState from "@/components/app/empty-state";
import Pagination from "@/components/app/pagination";
import StatusPill from "@/components/app/status-pill";
import ConfirmDialog from "@/components/app/confirm-dialog";
import Avatar from "@/components/app/avatar";
import NicknameEditor from "@/components/app/nickname-editor";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";

const PAGE_SIZE = 10;

const ROLE_OPTIONS = [
  { value: "member", key: "admin.people.members.roleOptions.member", label: "Member" },
  { value: "moderator", key: "admin.people.members.roleOptions.moderator", label: "Moderator" },
  { value: "admin", key: "admin.people.members.roleOptions.admin", label: "Admin" },
];

const EMPTY_FORM = { username: "", fullName: "", email: "", phone: "", password: "", role: "member" };

const inputCls =
  "w-full h-10 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder";
const labelCls = "block text-[11px] font-bold text-body uppercase tracking-wide mb-1";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function MembersPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const { nicknames } = useNicknames();

  // Pending approvals
  const [pending, setPending] = useState([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejecting, setRejecting] = useState(false);

  // Main member list
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const loadPending = useCallback(() => {
    setPendingLoading(true);
    axiosInstance
      .get("/auth/pending", { params: { page: pendingPage, limit: PAGE_SIZE } })
      .then((res) => {
        setPending(res.data.users || []);
        setPendingTotalPages(res.data.totalPages || 1);
        setPendingTotal(res.data.total || 0);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.members.toasts.loadPendingErrorTitle", "Couldn't load pending approvals"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setPendingLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPage]);

  const loadUsers = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get("/auth/users", { params: { page, limit: PAGE_SIZE } })
      .then((res) => {
        setUsers(res.data.users || []);
        setTotalPages(res.data.totalPages || 1);
        setTotal(res.data.total || 0);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.members.toasts.loadMembersErrorTitle", "Couldn't load members"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    axiosInstance
      .post("/auth/register", {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
      })
      .then(() => {
        toast({ title: t("admin.people.members.toasts.created", "Member created") });
        setCreateOpen(false);
        setForm(EMPTY_FORM);
        if (page === 1) loadUsers();
        else setPage(1);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.members.toasts.createErrorTitle", "Couldn't create member"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setCreating(false));
  };

  const approve = (user) => {
    setApprovingId(user._id);
    axiosInstance
      .put(`/auth/users/${user._id}/approve`)
      .then(() => {
        toast({ title: `${user.fullName} ${t("admin.people.members.toasts.approvedSuffix", "approved")}` });
        setPending((prev) => prev.filter((u) => u._id !== user._id));
        setPendingTotal((t) => Math.max(0, t - 1));
        if (page === 1) loadUsers();
      })
      .catch((err) => {
        toast({
          title: t("admin.people.members.toasts.approveErrorTitle", "Couldn't approve member"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setApprovingId(null));
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    setRejecting(true);
    axiosInstance
      .put(`/auth/users/${rejectTarget._id}/reject`)
      .then(() => {
        toast({ title: t("admin.people.members.toasts.rejected", "Registration rejected") });
        setPending((prev) => prev.filter((u) => u._id !== rejectTarget._id));
        setPendingTotal((t) => Math.max(0, t - 1));
        setRejectTarget(null);
      })
      .catch((err) => {
        toast({
          title: t("admin.people.members.toasts.rejectErrorTitle", "Couldn't reject registration"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setRejecting(false));
  };

  const toggleDisable = (user) => {
    setTogglingId(user._id);
    axiosInstance
      .put(`/auth/users/${user._id}/disable`)
      .then((res) => {
        const updated = res.data.user;
        setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
        toast({
          title:
            updated.status === "disabled"
              ? t("admin.people.members.toasts.disabled", "Member disabled")
              : t("admin.people.members.toasts.reEnabled", "Member re-enabled"),
        });
      })
      .catch((err) => {
        toast({
          title: t("admin.people.members.toasts.updateErrorTitle", "Couldn't update member"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setTogglingId(null));
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDeleting(true);
    axiosInstance
      .delete(`/auth/users/${deleteTarget._id}`)
      .then(() => {
        toast({ title: t("admin.people.members.toasts.deleted", "Member deleted") });
        setDeleteTarget(null);
        if (users.length === 1 && page > 1) setPage((p) => p - 1);
        else loadUsers();
      })
      .catch((err) => {
        toast({
          title: t("admin.people.members.toasts.deleteErrorTitle", "Couldn't delete member"),
          description: apiErrorMessage(err),
          variant: "destructive",
        });
      })
      .finally(() => setDeleting(false));
  };

  return (
    <div>
      <PageHeader
        title={t("admin.people.members.title", "Members")}
        description={t(
          "admin.people.members.description",
          "Approve new sign-ups and manage federation member accounts."
        )}
        action={
          <button
            type="button"
            onClick={openCreate}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("admin.people.members.addMemberButton", "Add member")}
          </button>
        }
      />

      {/* Pending approval — visually prioritized above the main list */}
      {!pendingLoading && pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="font-display text-sm font-bold text-ink">
              {t("admin.people.members.pendingHeading", "Pending approval")}
            </h2>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              {pendingTotal}
            </span>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 divide-y divide-amber-200 overflow-hidden">
            {pending.map((u) => (
              <div key={u._id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <Avatar name={u.fullName || u.username} src={u.profilePicture} size="h-10 w-10" textSize="text-[11px]" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink text-[13.5px] truncate">{u.fullName}</div>
                  <div className="text-[12px] text-body truncate">
                    {u.email} &middot; {u.phone || t("admin.people.members.noPhone", "No phone")} &middot; {t("admin.people.members.appliedLabel", "Applied")} {formatDate(u.createdAt)}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(u.buildingNumber != null || u.galaNumber != null || u.occupancyType) && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-white text-body whitespace-nowrap">
                        {t("admin.people.members.buildingBadge", "Bldg")} {u.buildingNumber ?? "—"} &middot; {t("admin.people.members.galaBadge", "Gala")} {u.galaNumber ?? "—"}
                        {u.occupancyType ? ` · ${u.occupancyType}` : ""}
                      </span>
                    )}
                    {(u.businessName || u.businessType) && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-white text-body whitespace-nowrap">
                        {u.businessName}
                        {u.businessType ? ` (${u.businessType})` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button
                    type="button"
                    disabled={approvingId === u._id}
                    onClick={() => approve(u)}
                    className="h-8 px-3 rounded-full text-[12.5px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 inline-flex items-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {approvingId === u._id
                      ? t("admin.people.members.approving", "Approving…")
                      : t("admin.people.members.approveButton", "Approve")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectTarget(u)}
                    className="h-8 px-3 rounded-full text-[12.5px] font-bold text-ink border border-line bg-white inline-flex items-center gap-1"
                  >
                    <XIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {t("admin.people.members.rejectButton", "Reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={pendingPage} totalPages={pendingTotalPages} total={pendingTotal} onChange={setPendingPage} />
        </div>
      )}

      {/* Main member list */}
      <div className="app-glass glass-shadow rounded-2xl overflow-hidden">
        {loading && (
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-ivory animate-pulse" />
            ))}
          </div>
        )}

        {!loading && users.length === 0 && (
          <EmptyState
            icon={Users}
            title={t("admin.people.members.emptyState.title", "No members yet")}
            description={t(
              "admin.people.members.emptyState.description",
              "Add the first member account directly, or wait for members to self-register from the login page."
            )}
            action={
              <button
                type="button"
                onClick={openCreate}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              >
                {t("admin.people.members.emptyState.addMemberButton", "+ Add member")}
              </button>
            }
          />
        )}

        {!loading && users.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.people.members.table.name", "Name")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.people.members.table.email", "Email")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.people.members.table.role", "Role")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.people.members.table.status", "Status")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70">
                      {t("admin.people.members.table.joined", "Joined")}
                    </th>
                    <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wide text-body/70 text-right">
                      {t("admin.people.members.table.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-line last:border-0">
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <div className="font-semibold text-ink text-[13px] truncate">{getDisplayName(u, nicknames)}</div>
                          <NicknameEditor targetUserId={u._id} realName={u.fullName || u.username} />
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="text-[12.5px] text-body truncate">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={u.role} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={u.status} />
                      </td>
                      <td className="py-3 px-4 text-[12.5px] text-body whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={togglingId === u._id}
                            onClick={() => toggleDisable(u)}
                            className="h-8 px-3 rounded-full text-[11.5px] font-bold text-ink border border-line bg-white disabled:opacity-60 whitespace-nowrap"
                          >
                            {togglingId === u._id
                              ? t("admin.people.members.saving", "Saving…")
                              : u.status === "disabled"
                              ? t("admin.people.members.enableButton", "Enable")
                              : t("admin.people.members.disableButton", "Disable")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="h-8 px-3 rounded-full text-[11.5px] font-bold text-white bg-alarm whitespace-nowrap"
                          >
                            {t("admin.people.members.deleteButton", "Delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-line">
              {users.map((u) => (
                <div key={u._id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="font-semibold text-ink text-[13.5px] truncate">{getDisplayName(u, nicknames)}</div>
                        <NicknameEditor targetUserId={u._id} realName={u.fullName || u.username} />
                      </div>
                      <div className="text-[12px] text-body truncate">{u.email}</div>
                    </div>
                    <StatusPill status={u.status} className="flex-none" />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <StatusPill status={u.role} />
                    <span className="text-[11px] text-body">
                      {t("admin.people.members.joinedLabel", "Joined")} {formatDate(u.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={togglingId === u._id}
                      onClick={() => toggleDisable(u)}
                      className="flex-1 h-8 rounded-lg border border-line bg-white text-[12px] font-semibold text-ink disabled:opacity-60"
                    >
                      {togglingId === u._id
                        ? t("admin.people.members.saving", "Saving…")
                        : u.status === "disabled"
                        ? t("admin.people.members.enableButton", "Enable")
                        : t("admin.people.members.disableButton", "Disable")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(u)}
                      className="flex-1 h-8 rounded-lg text-[12px] font-semibold text-white bg-alarm"
                    >
                      {t("admin.people.members.deleteButton", "Delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-line">
              <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* Add member */}
      <Dialog open={createOpen} onOpenChange={(o) => (!creating ? setCreateOpen(o) : null)}>
        <DialogContent className="bg-white border-line rounded-2xl max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-ink">
              {t("admin.people.members.createDialog.title", "Add a member")}
            </DialogTitle>
            <DialogDescription className="text-body">
              {t(
                "admin.people.members.createDialog.description",
                "Creates an account with immediate access — no approval step needed."
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-3">
            <div>
              <label htmlFor="mem-username" className={labelCls}>
                {t("admin.people.members.form.usernameLabel", "Username")}
              </label>
              <input
                id="mem-username"
                required
                maxLength={50}
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder={t("admin.people.members.form.usernamePlaceholder", "e.g. rpatel")}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="mem-fullname" className={labelCls}>
                {t("admin.people.members.form.fullNameLabel", "Full name")}
              </label>
              <input
                id="mem-fullname"
                required
                maxLength={100}
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder={t("admin.people.members.form.fullNamePlaceholder", "e.g. Rakesh Patel")}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="mem-email" className={labelCls}>
                {t("admin.people.members.form.emailLabel", "Email")}
              </label>
              <input
                id="mem-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t("admin.people.members.form.emailPlaceholder", "name@example.com")}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="mem-phone" className={labelCls}>
                {t("admin.people.members.form.phoneLabel", "Phone (optional)")}
              </label>
              <input
                id="mem-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder={t("admin.people.members.form.phonePlaceholder", "e.g. 9876543210")}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="mem-password" className={labelCls}>
                {t("admin.people.members.form.passwordLabel", "Initial password")}
              </label>
              <input
                id="mem-password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t("admin.people.members.form.passwordPlaceholder", "At least 6 characters")}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="mem-role" className={labelCls}>
                {t("admin.people.members.form.roleLabel", "Role")}
              </label>
              <select
                id="mem-role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className={inputCls}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.key, opt.label)}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-1">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white w-full sm:w-auto"
              >
                {t("admin.people.members.form.cancelButton", "Cancel")}
              </button>
              <button
                type="submit"
                disabled={creating}
                className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 w-full sm:w-auto"
              >
                {creating
                  ? t("admin.people.members.form.creating", "Creating…")
                  : t("admin.people.members.form.createButton", "Create member")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title={t("admin.people.members.confirmReject.title", "Reject this registration?")}
        description={
          rejectTarget
            ? `${rejectTarget.fullName}${t(
                "admin.people.members.confirmReject.description",
                "'s account request will be deleted. They can sign up again later."
              )}`
            : undefined
        }
        confirmLabel={t("admin.people.members.confirmReject.confirmButton", "Reject registration")}
        loading={rejecting}
        onConfirm={confirmReject}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("admin.people.members.confirmDelete.title", "Delete this member?")}
        description={
          deleteTarget
            ? `"${deleteTarget.fullName}" ${t(
                "admin.people.members.confirmDelete.description",
                "will be permanently removed. This fails if they still own a business listing."
              )}`
            : undefined
        }
        confirmLabel={t("admin.people.members.confirmDelete.confirmButton", "Delete member")}
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
