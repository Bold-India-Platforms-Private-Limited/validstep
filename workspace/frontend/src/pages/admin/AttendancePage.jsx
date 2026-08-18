import { useState } from "react";
import { useParams } from "react-router-dom";
import { Trash2, BellRing, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { useGetAttendanceByDateQuery, useDeleteAttendanceMutation, useSendAttendanceRemindersMutation } from "../../api/apiSlice";
import { PageSpinner } from "../../components/ui/Spinner";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import MonthCalendar from "../../components/ui/MonthCalendar";
import { localDateKey } from "../../utils/date";

export default function AttendancePage() {
  const { workspaceId } = useParams();
  const [date, setDate] = useState(localDateKey());
  const { data, isLoading } = useGetAttendanceByDateQuery({ workspaceId, date });
  const [deleteAttendance] = useDeleteAttendanceMutation();
  const [sendReminders, { isLoading: reminding }] = useSendAttendanceRemindersMutation();

  const isToday = date === localDateKey();

  async function handleRemind() {
    try {
      const { recipientCount } = await sendReminders(workspaceId).unwrap();
      toast.success(
        recipientCount === 0 ? "Everyone has already checked in" : `Reminding ${recipientCount} member(s)…`
      );
    } catch (err) {
      toast.error(err?.data?.error || "Failed to send reminders");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Attendance</h2>
        {isToday && data?.absentCount > 0 && (
          <Button onClick={handleRemind} loading={reminding} variant="secondary">
            <BellRing size={15} /> Remind {data.absentCount} pending
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <MonthCalendar value={date} onChange={setDate} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-4 text-sm">
            <span className="font-medium text-neutral-800 dark:text-neutral-100">
              {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
            {!isLoading && (
              <>
                <span className="text-emerald-600">{data?.presentCount || 0} present</span>
                <span className="text-red-500">{data?.absentCount || 0} absent</span>
              </>
            )}
          </div>

          {isLoading ? (
            <PageSpinner />
          ) : data?.present?.length === 0 ? (
            <EmptyState title="No check-ins on this date" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
              {data?.present?.map((a) => (
                <div key={a.id} className="group relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 aspect-square">
                  <img src={a.imageUrl} alt={a.user?.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 py-2">
                    <p className="text-xs font-medium text-white truncate">{a.user?.name}</p>
                    <p className="text-[10px] text-white/70 truncate">{a.user?.email}</p>
                    <p className="text-[10px] text-white/70">
                      {new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteAttendance({ workspaceId, attendanceId: a.id })}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-600 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {data?.absent?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-500 mb-2">Absent ({data.absentCount})</p>
              <div className="flex flex-wrap gap-2">
                {data.absent.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full pl-1 pr-3 py-1">
                    <Avatar name={u.name} size={22} />
                    <span className="text-xs text-neutral-600 dark:text-neutral-300">{u.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
