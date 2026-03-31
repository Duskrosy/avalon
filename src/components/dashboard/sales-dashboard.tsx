"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type DashboardData = {
  month: string;
  currentDay: number;
  totalDays: number;
  agentCount: number;
  volume: { confirmedTotal: number; confirmedRegular: number; confirmedAbandoned: number; dailyAvg: number; projectedEom: number };
  performance: { teamAvgFps: number | null; gatePassed: number; gateNotPassed: number; below70: number; qaFails: number };
  rankings: {
    topByConfReg: { name: string; value: number }[];
    topByFps: { name: string; value: string }[];
    attentionNeeded: { name: string; reason: string }[];
  };
  downtime: { incidents: number; totalHours: number };
  agents: { id: string; name: string; mtdConfRegular: number; avgFps: number | null; monthlyFps: number | null; bracket: string; gatePassed: boolean; qaFails: number }[];
};

export function SalesDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sales/dashboard");
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !data) {
    return <div className="text-sm text-gray-500">Loading sales dashboard...</div>;
  }

  const pct = Math.round((data.currentDay / data.totalDays) * 100);
  const monthLabel = new Date(data.month + "-15").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      {/* Month context bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-lg font-semibold text-gray-900">{monthLabel}</p>
            <p className="text-xs text-gray-500">{data.agentCount} agents</p>
          </div>
          <div className="h-8 w-px bg-gray-200" />
          <div>
            <p className="text-sm font-medium text-gray-700">{data.currentDay} of {data.totalDays} days</p>
            <div className="w-28 h-1 bg-gray-200 rounded-full mt-1">
              <div className="h-1 bg-gray-900 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">All metrics are actual MTD unless labeled otherwise.</p>
      </div>

      {/* Volume section */}
      <SectionHeader title="Volume" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <BigCard label="Confirmed total (MTD)" value={data.volume.confirmedTotal.toLocaleString()} subtitle="All confirmed" />
        <BigCard label="Confirmed regular (MTD)" value={data.volume.confirmedRegular.toLocaleString()} subtitle="Gate-relevant" />
        <BigCard label="Confirmed abandoned (MTD)" value={data.volume.confirmedAbandoned.toLocaleString()} subtitle="Recovered carts" />
        <BigCard label="Daily average" value={data.volume.dailyAvg.toLocaleString()} subtitle="Conf. regular per day" />
        <BigCard label="Projected EOM" value={data.volume.projectedEom.toLocaleString()} subtitle="Est. at current pace" projected />
      </div>

      {/* Performance section */}
      <SectionHeader title="Performance" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <SmallCard label="Team avg FPS" value={data.performance.teamAvgFps?.toFixed(1) ?? "—"} />
        <SmallCard label="Passed gate" value={`${data.performance.gatePassed} / ${data.agentCount}`} />
        <SmallCard label="Not passed" value={data.performance.gateNotPassed} />
        <SmallCard label="Below 70 FPS" value={data.performance.below70} />
        <SmallCard label="QA fails" value={data.performance.qaFails} />
      </div>

      {/* Downtime */}
      {data.downtime.incidents > 0 && (
        <>
          <SectionHeader title="Downtime" />
          <div className="grid grid-cols-2 gap-3 mb-6">
            <SmallCard label="Incidents this month" value={data.downtime.incidents} />
            <SmallCard label="Total downtime hours" value={`${data.downtime.totalHours.toFixed(1)}h`} />
          </div>
        </>
      )}

      {/* Rankings */}
      <SectionHeader title="Rankings" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <RankedPanel title="Top 5 — confirmed regular" items={data.rankings.topByConfReg.map(r => ({ label: r.name, value: r.value.toLocaleString() }))} />
        <RankedPanel title="Top 5 — avg FPS" items={data.rankings.topByFps.map(r => ({ label: r.name, value: String(r.value) }))} />
        <RankedPanel title="Attention needed" items={data.rankings.attentionNeeded.map(r => ({ label: r.name, value: r.reason, warn: true }))} />
      </div>

      {/* Agent summary table */}
      <SectionHeader title="Agent summary" />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Agent", "MTD reg", "Gate", "Avg FPS", "Monthly FPS", "Bracket", "QA fails"].map(h => (
                <th key={h} className={cn("px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap",
                  ["MTD reg", "Avg FPS", "Monthly FPS", "QA fails"].includes(h) ? "text-right" : "text-left",
                  ["Gate", "Bracket"].includes(h) && "text-center"
                )}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.agents.map((a, i) => (
              <tr key={a.id} className={cn("border-b border-gray-50 hover:bg-amber-50/20", i % 2 !== 0 && "bg-gray-50/50")}>
                <td className="px-4 py-2.5 font-medium text-green-800">{a.name}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{a.mtdConfRegular}</td>
                <td className="px-4 py-2.5 text-center">
                  {a.gatePassed ? (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 rounded">Passed</span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 rounded">Not passed</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">{a.avgFps?.toFixed(1) ?? "—"}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{a.monthlyFps?.toFixed(1) ?? "—"}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded",
                    a.bracket === "Elite" ? "bg-purple-50 text-purple-700" :
                    a.bracket === "Strong" ? "bg-blue-50 text-blue-700" :
                    a.bracket === "Pass" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  )}>{a.bracket}</span>
                </td>
                <td className={cn("px-4 py-2.5 text-right", a.qaFails > 0 ? "text-red-600 font-semibold" : "text-gray-700")}>{a.qaFails}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 pb-2 border-b border-gray-200">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
    </div>
  );
}

function BigCard({ label, value, subtitle, projected }: { label: string; value: string; subtitle: string; projected?: boolean }) {
  return (
    <div className={cn("bg-white rounded-lg border p-4", projected ? "border-l-2 border-l-amber-400 border-dashed" : "border-gray-200 border-l-2 border-l-gray-800")}>
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", projected ? "text-amber-700" : "text-gray-900")}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
      {projected && <span className="text-[9px] font-semibold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">Projected</span>}
    </div>
  );
}

function SmallCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function RankedPanel({ title, items }: { title: string; items: { label: string; value: string; warn?: boolean }[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-700 mb-3">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">No data</p>
      ) : items.map((item, i) => (
        <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-400 w-4 text-center">{i + 1}</span>
            <span className="text-sm text-gray-900">{item.label}</span>
          </div>
          <span className={cn("text-sm font-semibold", item.warn ? "text-red-600" : "text-gray-700")}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}