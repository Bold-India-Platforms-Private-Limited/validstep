import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useGetDashboardSummaryQuery } from "../api/apiSlice";
import { CalendarCheck, Users, FolderKanban, CalendarOff, CheckSquare2 } from "lucide-react";

const STATUS_COLORS = { TODO: "#a3a3a3", IN_PROGRESS: "#f59e0b", DONE: "#10b981" };
const STATUS_LABELS = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };
const PRIORITY_COLORS = { LOW: "#a3a3a3", MEDIUM: "#f59e0b", HIGH: "#ef4444" };

export default function DashboardAnalytics({ workspaceId }) {
  const { data, isLoading } = useGetDashboardSummaryQuery(workspaceId, { skip: !workspaceId });
  if (isLoading || !data) return null;

  const statusData = Object.entries(data.tasksByStatus)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({ name: STATUS_LABELS[status], value, color: STATUS_COLORS[status] }));

  const priorityData = Object.entries(data.tasksByPriority).map(([priority, count]) => ({
    priority,
    count,
    color: PRIORITY_COLORS[priority],
  }));

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-neutral-500 mb-3">Your Dashboard</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <StatTile icon={CheckSquare2} value={data.totalTasks} label="Total Tasks" accent />
        <StatTile icon={CalendarCheck} value={data.attendanceThisMonth} label="Days Present" />
        <StatTile icon={Users} value={data.groupCount} label="Groups" />
        <StatTile icon={FolderKanban} value={data.projectCount} label="Projects" />
        <StatTile icon={CalendarOff} value={data.pendingLeaves} label="Leave Pending" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ChartCard title="Task Status">
          {statusData.length === 0 ? (
            <EmptyChart text="No tasks assigned yet" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                    {statusData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {statusData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="Task Priority">
          {data.totalTasks === 0 ? (
            <EmptyChart text="No tasks assigned yet" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="priority" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 13 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
      <p className="text-xs font-semibold text-neutral-500 mb-1">{title}</p>
      {children}
    </div>
  );
}

function EmptyChart({ text }) {
  return <div className="h-[180px] flex items-center justify-center text-sm text-neutral-400">{text}</div>;
}

function StatTile({ icon: Icon, value, label, accent }) {
  return (
    <div
      className={`text-center rounded-2xl p-3 border ${
        accent
          ? "bg-indigo-600 border-indigo-600 text-white"
          : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <div
        className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center mb-1.5 ${
          accent ? "bg-white/15 text-white" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
        }`}
      >
        <Icon size={16} />
      </div>
      <p className={`text-xl font-bold leading-tight ${accent ? "text-white" : "text-neutral-900 dark:text-white"}`}>{value}</p>
      <p className={`text-[10px] mt-0.5 ${accent ? "text-white/80" : "text-neutral-400"}`}>{label}</p>
    </div>
  );
}
