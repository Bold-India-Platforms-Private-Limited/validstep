import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useGetTasksQuery } from "../../api/apiSlice";
import { PageSpinner } from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import { BarChart3 } from "lucide-react";

const STATUS_COLORS = { TODO: "#a3a3a3", IN_PROGRESS: "#f59e0b", DONE: "#10b981" };
const STATUS_LABELS = { TODO: "To Do", IN_PROGRESS: "In Progress", DONE: "Done" };
const PRIORITY_COLORS = { LOW: "#a3a3a3", MEDIUM: "#f59e0b", HIGH: "#ef4444" };

export default function AnalyticsTab({ projectId }) {
  const { data, isLoading } = useGetTasksQuery(projectId);
  const tasks = data?.data || [];

  const statusData = useMemo(() => {
    const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    tasks.forEach((t) => counts[t.status]++);
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, value]) => ({ name: STATUS_LABELS[status], value, color: STATUS_COLORS[status] }));
  }, [tasks]);

  const priorityData = useMemo(() => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    tasks.forEach((t) => counts[t.priority]++);
    return Object.entries(counts).map(([priority, count]) => ({ priority, count, color: PRIORITY_COLORS[priority] }));
  }, [tasks]);

  const assigneeData = useMemo(() => {
    const counts = new Map();
    tasks.forEach((t) => t.assignees?.forEach((a) => counts.set(a.user?.name, (counts.get(a.user?.name) || 0) + 1)));
    return [...counts.entries()].map(([name, count]) => ({ name, count })).slice(0, 8);
  }, [tasks]);

  if (isLoading) return <PageSpinner />;
  if (tasks.length === 0) return <EmptyState icon={BarChart3} title="No tasks to analyze yet" />;

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <ChartCard title="Status breakdown">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
              {statusData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          {statusData.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5 text-xs text-neutral-500">
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
            </span>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Priority breakdown">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={priorityData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
            <XAxis dataKey="priority" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 13 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {priorityData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {assigneeData.length > 0 && (
        <ChartCard title="Tasks per assignee" className="sm:col-span-2">
          <ResponsiveContainer width="100%" height={Math.max(160, assigneeData.length * 36)}>
            <BarChart data={assigneeData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 13 }} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function ChartCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 ${className}`}>
      <p className="text-sm font-semibold text-neutral-500 mb-3">{title}</p>
      {children}
    </div>
  );
}
