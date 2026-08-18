import { useGetNoticesQuery, useGetNotificationsQuery } from "../api/apiSlice";

const NOTICE_STYLES = {
  INFO: "border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-900",
  WARNING: "border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-900",
  SUCCESS: "border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-900",
  DANGER: "border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-900",
};

export default function NoticesFeed({ workspaceId }) {
  const { data: notices } = useGetNoticesQuery(workspaceId, { skip: !workspaceId });
  const { data: notifications } = useGetNotificationsQuery(workspaceId, { skip: !workspaceId });

  const hasContent = notices?.data?.length > 0 || notifications?.data?.length > 0;
  if (!hasContent) return null;

  return (
    <div className="space-y-2 mb-6">
      {notices?.data?.map((n) => (
        <div key={n.id} className={`border rounded-xl px-4 py-3 ${NOTICE_STYLES[n.type]}`}>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{n.title}</p>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{n.content}</p>
        </div>
      ))}
      {notifications?.data?.map((n) => (
        <div key={n.id} className="border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{n.title}</p>
            {n.subtitle && <p className="text-sm text-neutral-600 dark:text-neutral-300">{n.subtitle}</p>}
          </div>
          {n.buttonUrl && (
            <a
              href={n.buttonUrl}
              target={n.openInNewTab ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-600 text-white shrink-0"
            >
              {n.buttonName || "View"}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
