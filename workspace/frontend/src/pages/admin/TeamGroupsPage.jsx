import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, Search, UserMinus, MessagesSquare, Sparkles, Trash2, Eraser, Megaphone, UserPlus, KeyRound, Mail, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetWorkspaceMembersQuery,
  useRemoveWorkspaceMembersMutation,
  useResetMemberPasswordMutation,
  useSendBulkCredentialsMutation,
  useGetGroupsQuery,
  useBulkDeleteGroupsMutation,
  useBulkClearChatMutation,
  useBulkBroadcastMessageMutation,
} from "../../api/apiSlice";
import { usePresence } from "../../hooks/usePresence";
import { STATUS_META } from "../../utils/presenceStatus";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import Pagination from "../../components/ui/Pagination";
import EmptyState from "../../components/ui/EmptyState";
import { PageSpinner } from "../../components/ui/Spinner";
import BulkInviteModal from "./members/BulkInviteModal";
import BulkGenerateModal from "./members/BulkGenerateModal";
import CreateGroupModal from "./members/CreateGroupModal";
import AddGroupMembersModal from "./members/AddGroupMembersModal";

export default function TeamGroupsPage() {
  const { workspaceId } = useParams();
  const [tab, setTab] = useState("groups");

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
        {["groups", "members"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
              tab === t ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" : "text-neutral-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "groups" ? <GroupsTab workspaceId={workspaceId} /> : <MembersTab workspaceId={workspaceId} />}
    </div>
  );
}

function GroupsTab({ workspaceId }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGetGroupsQuery({ workspaceId, page });
  const [selectedIds, setSelectedIds] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [addMembersGroup, setAddMembersGroup] = useState(null);
  const [bulkDelete] = useBulkDeleteGroupsMutation();
  const [bulkClear] = useBulkClearChatMutation();
  const [bulkBroadcast] = useBulkBroadcastMessageMutation();
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  function toggle(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.length} groups and their chat history? This cannot be undone.`)) return;
    await bulkDelete({ workspaceId, groupIds: selectedIds }).unwrap();
    toast.success("Groups deleted");
    setSelectedIds([]);
  }

  async function handleBulkClear() {
    if (!confirm(`Clear chat history for ${selectedIds.length} groups?`)) return;
    await bulkClear({ workspaceId, groupIds: selectedIds }).unwrap();
    toast.success("Chats cleared");
    setSelectedIds([]);
  }

  async function handleBroadcast() {
    if (!broadcastText.trim()) return;
    await bulkBroadcast({ workspaceId, groupIds: selectedIds, content: broadcastText }).unwrap();
    toast.success(`Sent to ${selectedIds.length} groups`);
    setBroadcastText("");
    setBroadcastOpen(false);
    setSelectedIds([]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> New Group
          </Button>
          <Button variant="secondary" onClick={() => setGenerateOpen(true)}>
            <Sparkles size={16} /> Generate Groups
          </Button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-xl">
            <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{selectedIds.length} selected</span>
            <button onClick={() => setBroadcastOpen(true)} className="p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg" title="Broadcast message">
              <Megaphone size={15} />
            </button>
            <button onClick={handleBulkClear} className="p-1.5 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg" title="Clear chats">
              <Eraser size={15} />
            </button>
            <button onClick={handleBulkDelete} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg" title="Delete groups">
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No groups yet"
          subtitle="Create groups manually, or auto-generate them from your intern roster."
          action={<Button onClick={() => setCreateOpen(true)}>Create a group</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.data?.map((group) => (
            <div
              key={group.id}
              className={`bg-white dark:bg-neutral-900 border rounded-2xl p-4 transition ${
                selectedIds.includes(group.id) ? "border-indigo-400 ring-1 ring-indigo-400" : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(group.id)}
                    onChange={() => toggle(group.id)}
                    className="rounded"
                  />
                  <span className="font-semibold text-neutral-900 dark:text-white">{group.name}</span>
                </label>
                <button
                  onClick={() => setAddMembersGroup(group)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                  title="Add members"
                >
                  <UserPlus size={15} />
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1 mb-3">{group._count?.members || 0} members</p>
              {group.lastMessage && (
                <p className="text-xs text-neutral-400 truncate mb-3">
                  <span className="font-medium">{group.lastMessage.user?.name}:</span> {group.lastMessage.content}
                </p>
              )}
              <Link
                to={`/admin/w/${workspaceId}/groups/${group.id}`}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Open chat →
              </Link>
            </div>
          ))}
        </div>
      )}
      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} workspaceId={workspaceId} />
      <BulkGenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} workspaceId={workspaceId} />
      <AddGroupMembersModal
        open={!!addMembersGroup}
        onClose={() => setAddMembersGroup(null)}
        workspaceId={workspaceId}
        group={addMembersGroup}
      />
      <Modal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title={`Broadcast to ${selectedIds.length} groups`}>
        <textarea
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          rows={4}
          placeholder="Message to send to every selected group…"
          className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white"
        />
        <Button className="w-full mt-3" onClick={handleBroadcast} disabled={!broadcastText.trim()}>
          Send Broadcast
        </Button>
      </Modal>
    </div>
  );
}

function MembersTab({ workspaceId }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetWorkspaceMembersQuery({ workspaceId, page, search: search || undefined });
  const [selected, setSelected] = useState([]);
  const [removeMembers] = useRemoveWorkspaceMembersMutation();
  const [resetPassword, { isLoading: resetting }] = useResetMemberPasswordMutation();
  const [sendCredentials] = useSendBulkCredentialsMutation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [resettingUserId, setResettingUserId] = useState(null);
  const [credentialsMenuOpen, setCredentialsMenuOpen] = useState(false);
  const { onlineUserIds, statuses } = usePresence(workspaceId);

  function toggle(userId) {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  async function handleRemove() {
    if (!confirm(`Remove ${selected.length} member(s) from this batch?`)) return;
    await removeMembers({ workspaceId, userIds: selected }).unwrap();
    toast.success("Members removed");
    setSelected([]);
  }

  async function handleResetPassword(userId, name) {
    if (!confirm(`Reset ${name}'s password and email them the new one?`)) return;
    setResettingUserId(userId);
    try {
      const { emailSent } = await resetPassword({ workspaceId, userId }).unwrap();
      toast.success(emailSent ? "New password emailed" : "Password reset, but the email failed to send");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to reset password");
    } finally {
      setResettingUserId(null);
    }
  }

  async function handleSendCredentials(body, confirmMsg) {
    if (!confirm(confirmMsg)) return;
    setCredentialsMenuOpen(false);
    try {
      const { recipientCount } = await sendCredentials({ workspaceId, ...body }).unwrap();
      if (recipientCount === 0) {
        toast("Nobody matched that — nothing sent");
      } else {
        toast.success(`Sending new credentials to ${recipientCount} member(s)…`);
      }
    } catch (err) {
      toast.error(err?.data?.error || "Failed to send");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email…"
            className="pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-900 dark:text-white w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <Button variant="danger" onClick={handleRemove}>
              <UserMinus size={15} /> Remove {selected.length}
            </Button>
          )}
          <div className="relative">
            <Button variant="secondary" onClick={() => setCredentialsMenuOpen((v) => !v)}>
              <Mail size={15} /> Send Credentials <ChevronDown size={13} />
            </Button>
            {credentialsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-20 py-1.5">
                {selected.length > 0 && (
                  <button
                    onClick={() =>
                      handleSendCredentials(
                        { userIds: selected },
                        `Reset & email new passwords to the ${selected.length} selected member(s)?`
                      )
                    }
                    className="w-full text-left px-3.5 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    To {selected.length} selected
                  </button>
                )}
                <button
                  onClick={() =>
                    handleSendCredentials(
                      { target: "never_logged_in" },
                      "Reset & email new passwords to every member who has never logged in?"
                    )
                  }
                  className="w-full text-left px-3.5 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  To everyone who never logged in
                </button>
                <button
                  onClick={() =>
                    handleSendCredentials(
                      { target: "all" },
                      "Reset & email new passwords to EVERY member in this batch?"
                    )
                  }
                  className="w-full text-left px-3.5 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  To all members
                </button>
              </div>
            )}
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <Plus size={16} /> Bulk Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60">
              <tr>
                <th className="w-10 px-4 py-2.5"></th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500">Member</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 hidden sm:table-cell">Role</th>
                <th className="text-left px-3 py-2.5 font-medium text-neutral-500 hidden sm:table-cell">Last login</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((m) => (
                <tr key={m.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-2.5">
                    <input type="checkbox" checked={selected.includes(m.userId)} onChange={() => toggle(m.userId)} className="rounded" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <Avatar name={m.user?.name} size={28} />
                        {onlineUserIds.includes(m.userId) && (
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900 ${
                              STATUS_META[statuses[m.userId] || m.status || "AVAILABLE"].dot
                            }`}
                            title={STATUS_META[statuses[m.userId] || m.status || "AVAILABLE"].label}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-800 dark:text-neutral-100 truncate">{m.user?.name}</p>
                        <p className="text-xs text-neutral-400 truncate">{m.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell text-neutral-500">{m.role}</td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    {m.user?.lastLoginAt ? (
                      <span className="text-neutral-500">{new Date(m.user.lastLoginAt).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-amber-600 text-xs font-medium bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Never logged in
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => handleResetPassword(m.userId, m.user?.name)}
                      disabled={resetting && resettingUserId === m.userId}
                      className="p-1.5 rounded-lg text-neutral-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-40"
                      title="Reset password & email"
                    >
                      <KeyRound size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.data?.length === 0 && <EmptyState title="No members found" />}
          <div className="px-4">
            <Pagination pagination={data?.pagination} onPageChange={setPage} />
          </div>
        </div>
      )}

      <BulkInviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} workspaceId={workspaceId} />
    </div>
  );
}
