import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Trash2, Eye, EyeOff, Megaphone, Bell } from "lucide-react";
import toast from "react-hot-toast";
import {
  useGetNoticesQuery,
  useCreateNoticeMutation,
  usePublishNoticeMutation,
  useDeleteNoticeMutation,
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useDeleteNotificationMutation,
} from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

const NOTICE_STYLES = {
  INFO: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  WARNING: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  SUCCESS: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  DANGER: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

export default function AnnouncementsPage() {
  const { workspaceId } = useParams();
  const [tab, setTab] = useState("notices");

  return (
    <div>
      <div className="flex gap-1 mb-5 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
        {["notices", "notifications"].map((t) => (
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
      {tab === "notices" ? <NoticesTab workspaceId={workspaceId} /> : <NotificationsTab workspaceId={workspaceId} />}
    </div>
  );
}

function NoticesTab({ workspaceId }) {
  const { data, isLoading } = useGetNoticesQuery(workspaceId);
  const [createNotice, { isLoading: creating }] = useCreateNoticeMutation();
  const [publishNotice] = usePublishNoticeMutation();
  const [deleteNotice] = useDeleteNoticeMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", type: "INFO" });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createNotice({ workspaceId, ...form }).unwrap();
      toast.success("Notice created");
      setForm({ title: "", content: "", type: "INFO" });
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.error || "Failed");
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New Notice
        </Button>
      </div>
      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState icon={Megaphone} title="No notices yet" />
      ) : (
        <div className="space-y-2">
          {data?.data?.map((n) => (
            <div key={n.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${NOTICE_STYLES[n.type]}`}>{n.type}</span>
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{n.title}</p>
                  </div>
                  <p className="text-sm text-neutral-500">{n.content}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => publishNotice({ workspaceId, noticeId: n.id, published: !n.published })}
                    className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    title={n.published ? "Unpublish" : "Publish"}
                  >
                    {n.published ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => deleteNotice({ workspaceId, noticeId: n.id })} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Notice">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
            <input
              autoFocus
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Content</label>
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={3}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            >
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="SUCCESS">Success</option>
              <option value="DANGER">Danger</option>
            </select>
          </div>
          <Button type="submit" loading={creating} className="w-full">
            Create (starts unpublished)
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function NotificationsTab({ workspaceId }) {
  const { data, isLoading } = useGetNotificationsQuery(workspaceId);
  const [createNotification, { isLoading: creating }] = useCreateNotificationMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", buttonName: "", buttonUrl: "" });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createNotification({ workspaceId, ...form }).unwrap();
      toast.success("Notification created");
      setForm({ title: "", subtitle: "", buttonName: "", buttonUrl: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.error || "Failed");
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} /> New Notification
        </Button>
      </div>
      {isLoading ? (
        <PageSpinner />
      ) : data?.data?.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" />
      ) : (
        <div className="space-y-2">
          {data?.data?.map((n) => (
            <div key={n.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{n.title}</p>
                {n.subtitle && <p className="text-sm text-neutral-500">{n.subtitle}</p>}
                {n.buttonUrl && <p className="text-xs text-indigo-600 mt-1">{n.buttonName || "Link"} → {n.buttonUrl}</p>}
              </div>
              <button onClick={() => deleteNotification({ workspaceId, notificationId: n.id })} className="text-neutral-300 hover:text-red-500 shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Notification">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
            <input
              autoFocus
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Subtitle</label>
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Button label</label>
              <input
                value={form.buttonName}
                onChange={(e) => setForm({ ...form, buttonName: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Button URL</label>
              <input
                value={form.buttonUrl}
                onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-white"
              />
            </div>
          </div>
          <Button type="submit" loading={creating} className="w-full">
            Create Notification
          </Button>
        </form>
      </Modal>
    </div>
  );
}
