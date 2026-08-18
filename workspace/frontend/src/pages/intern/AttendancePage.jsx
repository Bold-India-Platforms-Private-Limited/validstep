import { useMemo, useState } from "react";
import { Camera, CheckCircle2, LogOut as CheckOutIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useMyWorkspace } from "../../hooks/useMyWorkspace";
import {
  useGetMyAttendanceStatusQuery,
  useMarkAttendanceMutation,
  useCheckOutAttendanceMutation,
  useGetMyAttendanceHistoryQuery,
} from "../../api/apiSlice";
import CameraCapture from "../../components/CameraCapture";
import MonthCalendar from "../../components/ui/MonthCalendar";
import { PageSpinner } from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import { localDateKey } from "../../utils/date";
import { holidayOn } from "../../utils/holidays";

export default function AttendancePage() {
  const { workspace, isLoading: wsLoading } = useMyWorkspace();
  const { data: status, isLoading: statusLoading } = useGetMyAttendanceStatusQuery(workspace?.id, { skip: !workspace });
  const { data: history } = useGetMyAttendanceHistoryQuery({ workspaceId: workspace?.id, limit: 62 }, { skip: !workspace });
  const [markAttendance, { isLoading: marking }] = useMarkAttendanceMutation();
  const [checkOut, { isLoading: checkingOut }] = useCheckOutAttendanceMutation();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(localDateKey());

  const presentDates = useMemo(() => new Set((history?.data || []).map((a) => localDateKey(new Date(a.date)))), [history]);
  const markers = presentDates;

  async function handleCapture(imageBase64) {
    setCameraOpen(false);
    try {
      await markAttendance({ workspaceId: workspace.id, imageBase64, date: localDateKey() }).unwrap();
      toast.success("Attendance marked!");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to mark attendance");
    }
  }

  async function handleCheckOut() {
    try {
      await checkOut({ workspaceId: workspace.id, date: localDateKey() }).unwrap();
      toast.success("Checked out!");
    } catch (err) {
      toast.error(err?.data?.error || "Failed to check out");
    }
  }

  if (wsLoading || statusLoading) return <PageSpinner />;

  const markedToday = status?.markedToday;
  const todayRecord = status?.attendance;
  const selectedIsToday = selectedDate === localDateKey();
  const selectedHoliday = holidayOn(selectedDate);
  const selectedPresent = presentDates.has(selectedDate);

  return (
    <div className="px-4 sm:px-6 py-5 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-5">Attendance</h1>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-center mb-6">
        {markedToday ? (
          <>
            <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-neutral-900 dark:text-white">You're checked in for today</p>
            <div className="flex items-center justify-center gap-4 text-sm text-neutral-500 mt-1">
              <span>In: {new Date(todayRecord.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              {todayRecord.checkOutTime && (
                <span>Out: {new Date(todayRecord.checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </div>
            {todayRecord.imageUrl && (
              <img src={todayRecord.imageUrl} alt="check-in" className="w-20 h-20 rounded-2xl object-cover mx-auto mt-4" />
            )}
            {!todayRecord.checkOutTime && (
              <Button variant="secondary" onClick={handleCheckOut} loading={checkingOut} className="mt-4">
                <CheckOutIcon size={16} /> Check Out
              </Button>
            )}
          </>
        ) : (
          <>
            <Camera size={40} className="mx-auto text-neutral-300 mb-2" />
            <p className="font-semibold text-neutral-900 dark:text-white mb-1">Mark today's attendance</p>
            <p className="text-sm text-neutral-500 mb-4">Take a selfie to check in</p>
            <Button onClick={() => setCameraOpen(true)} loading={marking} className="w-full sm:w-auto">
              <Camera size={16} /> Check In
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <MonthCalendar value={selectedDate} onChange={setSelectedDate} markers={markers} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 mb-3">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center gap-3">
            {selectedHoliday ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <p className="text-sm text-neutral-700 dark:text-neutral-200">Holiday — {selectedHoliday.name}</p>
              </>
            ) : selectedPresent ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-sm text-neutral-700 dark:text-neutral-200">Present</p>
                {selectedIsToday && todayRecord?.imageUrl && (
                  <img src={todayRecord.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover ml-auto" />
                )}
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 shrink-0" />
                <p className="text-sm text-neutral-500">{selectedDate > localDateKey() ? "Upcoming" : "Absent"}</p>
              </>
            )}
          </div>
        </div>
      </div>

      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCapture} />
    </div>
  );
}
