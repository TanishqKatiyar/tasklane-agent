"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Layers,
  ShieldAlert,
  Timer,
  TrendingUp,
} from "lucide-react";
import React, { memo, useRef, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AnalyticsSkeleton } from "@/components/ui/skeletons";
import { StatCard } from "@/components/ui/stat-card";
import { analyticsApi, type TeamAnalyticsResponse } from "@/lib/analytics";

// ── Design tokens for charts ──

const CHART_COLORS = {
  primary: "#6366f1",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  muted: "hsl(var(--muted-foreground))",
  border: "hsl(var(--border))",
};

const STATUS_COLOR_MAP: Record<string, string> = {
  BACKLOG: "#6B7280",
  TODO: "#6366F1",
  IN_PROGRESS: "#F59E0B",
  IN_REVIEW: "#8B5CF6",
  DONE: "#22C55E",
  CANCELLED: "#EF4444",
};

const PRIORITY_COLOR_MAP: Record<string, string> = {
  URGENT: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#94A3B8",
};

// ── Chart Card wrapper ──

function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}
    >
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

// ── Custom Tooltip ──

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name ?? p.dataKey}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Workload Heatmap ──

const WorkloadHeatmap = memo(function WorkloadHeatmap({
  members,
}: {
  members: TeamAnalyticsResponse["workload"]["members"];
}) {
  if (members.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No workload data available.
      </div>
    );
  }

  // Calculate team average for red-threshold
  const allDays = members.flatMap((m) => m.days);
  const teamAvg =
    allDays.length > 0
      ? allDays.reduce((a, b) => a + b, 0) / allDays.length
      : 1;

  return (
    <div className="space-y-2 overflow-x-auto">
      {members.map((member) => (
        <div key={member.userId} className="flex items-center gap-3">
          <div
            className="w-24 shrink-0 truncate text-xs font-medium"
            title={member.name}
          >
            {member.name}
          </div>
          <div className="flex flex-1 gap-0.5">
            {member.days.map((val, i) => {
              let bg = "bg-muted/50";
              if (val > 0) {
                if (val > teamAvg * 1.5) bg = "bg-red-500";
                else if (val > teamAvg) bg = "bg-amber-400";
                else bg = "bg-emerald-400";
              }
              return (
                <div
                  key={i}
                  className={`h-6 flex-1 rounded-sm transition-colors hover:ring-2 hover:ring-primary ${bg}`}
                  title={`${val} open tasks`}
                />
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-emerald-400" /> Low
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-amber-400" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-red-500" /> Overloaded
        </span>
      </div>
    </div>
  );
});

// ── Main Component ──

export default function AnalyticsContent({ teamId }: { teamId: string }) {
  const [period, setPeriod] = useState("30d");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["teamAnalytics", teamId, period],
    queryFn: () => analyticsApi.getTeamAnalytics(teamId, period),
    staleTime: 30_000,
    retry: false,
  });

  // ── Export PDF ──

  const exportPDF = async () => {
    if (!containerRef.current) return;
    const id = toast.loading("Generating PDF…");
    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`analytics-${teamId}-${period}.pdf`);
      toast.success("PDF exported!", { id });
    } catch {
      toast.error("PDF export failed", { id });
    }
  };

  // ── Export CSV ──

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      "Metric,Value",
      `Total Tasks,${data.kpis.totalTasks}`,
      `Done,${data.kpis.done}`,
      `In Progress,${data.kpis.inProgress}`,
      `Overdue,${data.kpis.overdue}`,
      `Avg Cycle Time (hrs),${data.kpis.avgCycleTimeHours?.toFixed(1) ?? "N/A"}`,
      `Throughput This Week,${data.kpis.throughputThisWeek}`,
    ].join("\n");

    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${teamId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Permission denied ──

  if (error) {
    const status = (error as any)?.response?.status;
    if (status === 403) {
      return (
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <ShieldAlert className="mb-4 h-16 w-16 text-red-400" />
          <h2 className="mb-2 text-2xl font-bold">
            You don't have permission
          </h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Team analytics are only available to team administrators.
          </p>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Request access
          </button>
        </div>
      );
    }
    return (
      <div className="flex h-full items-center justify-center gap-2 text-red-500">
        <AlertTriangle className="h-5 w-5" /> Failed to load analytics.
      </div>
    );
  }

  // ── Loading ──

  if (isLoading || !data) {
    return <AnalyticsSkeleton />;
  }

  // ── Chart data ──

  const burndownData = data.burndown.dates.map((d, i) => ({
    date: format(new Date(d + "T00:00:00"), "MMM d"),
    remaining: data.burndown.remaining[i],
    ideal: data.burndown.ideal[i],
  }));

  const throughputData = data.throughput.weeks.map((w, i) => ({
    week: format(new Date(w + "T00:00:00"), "MMM d"),
    completed: data.throughput.completed[i],
  }));

  return (
    <div
      ref={containerRef}
      className="mx-auto h-full w-full max-w-7xl overflow-y-auto p-6 pb-24"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Performance insights and metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={exportCSV}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-accent"
            title="Export CSV"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI Strip — color-block tiles, asymmetric */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <StatCard
          refCode="#TLN-2026"
          index={1}
          total={5}
          label="Total Tasks"
          count={data.kpis.totalTasks}
          tone="accent"
          Icon={Layers}
          className="lg:col-span-5"
        />
        <StatCard
          refCode="#TLN-2026"
          index={2}
          total={5}
          label="Done"
          count={data.kpis.done}
          tone="dark"
          Icon={CheckCircle2}
          className="lg:col-span-3"
        />
        <StatCard
          refCode="#TLN-2026"
          index={3}
          total={5}
          label="In Progress"
          count={data.kpis.inProgress}
          tone="muted"
          Icon={TrendingUp}
          className="lg:col-span-2"
        />
        <StatCard
          refCode="#TLN-2026"
          index={4}
          total={5}
          label="Overdue"
          count={data.kpis.overdue}
          tone="paper"
          Icon={Clock}
          className="lg:col-span-2"
        />
        <StatCard
          refCode="#TLN-2026"
          index={5}
          total={5}
          label="Avg Cycle"
          count={data.kpis.avgCycleTimeHours ?? 0}
          decimals={1}
          suffix="h"
          tone="muted"
          Icon={Timer}
          className="lg:col-span-12"
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Burndown — full width */}
        <ChartCard title="Burndown Chart" className="lg:col-span-2">
          <div className="h-[320px]">
            {burndownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={burndownData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={CHART_COLORS.border}
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <defs>
                    <linearGradient id="burndownGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="remaining"
                    name="Remaining"
                    fill="url(#burndownGrad)"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    animationBegin={200}
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    name="Ideal"
                    stroke={CHART_COLORS.muted}
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    dot={false}
                    animationBegin={400}
                    animationDuration={600}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </ChartCard>

        {/* Throughput */}
        <ChartCard title="Throughput (Completed / Week)">
          <div className="h-[240px]">
            {throughputData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={throughputData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={CHART_COLORS.border}
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill={CHART_COLORS.emerald}
                    radius={[4, 4, 0, 0]}
                    animationBegin={300}
                    animationDuration={600}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </ChartCard>

        {/* Workload Heatmap */}
        <ChartCard title="Workload Heatmap (Last 14 days)">
          <WorkloadHeatmap members={data.workload.members} />
        </ChartCard>

        {/* Cycle Time Distribution */}
        <ChartCard title="Cycle Time Distribution">
          <div className="h-[220px]">
            {data.cycleTimeDistribution.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.cycleTimeDistribution}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={CHART_COLORS.border}
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Tasks"
                    fill={CHART_COLORS.violet}
                    radius={[4, 4, 0, 0]}
                    animationBegin={500}
                    animationDuration={600}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No completed tasks yet" />
            )}
          </div>
        </ChartCard>

        {/* Priority + Status donuts */}
        <ChartCard title="Task Breakdown">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1">
              <p className="mb-1 text-center text-xs font-medium text-muted-foreground">
                By Priority
              </p>
              <div className="h-[180px]">
                {data.byPriority.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byPriority}
                        dataKey="count"
                        nameKey="priority"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={3}
                        animationBegin={600}
                        animationDuration={500}
                      >
                        {data.byPriority.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              PRIORITY_COLOR_MAP[entry.priority] ??
                              CHART_COLORS.muted
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </div>
            <div className="flex-1">
              <p className="mb-1 text-center text-xs font-medium text-muted-foreground">
                By Status
              </p>
              <div className="h-[180px]">
                {data.byStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={3}
                        animationBegin={700}
                        animationDuration={500}
                      >
                        {data.byStatus.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              STATUS_COLOR_MAP[entry.status] ??
                              CHART_COLORS.muted
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart />
                )}
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyChart({ message = "No data available" }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
