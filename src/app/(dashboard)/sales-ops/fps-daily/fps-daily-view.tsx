"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { DailyFpsRow } from "@/lib/sales/types";

type FpsRowExt = DailyFpsRow & { agentName: string };

type StatusFilter = "all" | "scored" | "qa-fail" | "leave" | "no-data";

export function FpsDailyView() {
  const [rows, setRows] = useState<FpsRowExt[]>([]);
  const [monthlyAvgs, setMonthlyAvgs] = useState<Record<string, { avg: number | null; scoredDays: number }>>({});
  const [agents, setAgents] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [drawerRow, setDrawerRow] = useState<FpsRowExt | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (agentFilter !== "all") params.set("agent_id", agentFilter);

    const [fpsRes, agentsRes] = await Promise.all([
      fetch(`/api/sales/fps?${params}`),
      fetch("/api/sales/agents"),
    ]);
    const fpsData = await fpsRes.json();
    const agData = await agentsRes.json();
    setRows(fpsData.rows ?? []);
    setMonthlyAvgs(fpsData.monthlyAverages ?? {});
    setAgents(agData.agents ?? []);
    setLoading(false);
  }, [month, agentFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Apply status filter
  const filtered = rows.filter(r => {
    if (statusFilter === "scored" && (r.isLeave || r.isNoData)) return false;
    if (statusFilter === "qa-fail" && !r.qaFail) return false;
    if (statusFilter === "leave" && !r.isLeave) return false;
    if (statusFilter === "no-data" && !r.isNoData) return false;
    return true;
  });

  // KPIs
  const isSpecific = agentFilter !== "all";
  const scoredRows = filtered.filter(r => r.finalFps !== null);
  const qaFailRows = filtered.filter(r => r.qaFail);
  const excludedRows = filtered.filter(r => r.isLeave || r.isNoData);
  const avgFps = scoredRows.length > 0 ? (scoredRows.reduce((s, r) => s + (r.finalFps || 0), 0) / scoredRows.length).toFixed(1) : "—";
  const agentMonthly = isSpecific ? monthlyAvgs[agentFilter] : null;

  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-amber-50/30 p-3 rounded-lg mb-4 flex gap-3 items-end flex-wrap border border-gray-200">
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] font-medium text-gray-500">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm bg-white" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] font-medium text-gray-500">Agent</label>
          <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm bg-white min-w-[140px]">
            <option value="all">All agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] font-medium text-gray-500">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm bg-white">
            <option value="all">All</option>
            <option value="scored">Scored</option>
            <option value="qa-fail">QA fail</option>
            <option value="leave">Leave</option>
            <option value="no-data">No data</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {!isSpecific ? (
          <>
            <KpiCard label="Scored days" value={scoredRows.length} />
            <KpiCard label="Avg daily FPS" value={avgFps} />
            <KpiCard label="QA fail days" value={qaFailRows.length} subtitle={qaFailRows.length > 0 ? "FPS capped at 60" : undefined} />
            <KpiCard label="Excluded days" value={excludedRows.length} subtitle="Leave + no data" />
          </>
        ) : (
          <>
            <KpiCard label="Avg daily FPS (MTD)" value={agentMonthly?.avg !== null && agentMonthly?.avg !== undefined ? agentMonthly.avg.toFixed(1) : "—"} />
            <KpiCard label="Scored days" value={agentMonthly?.scoredDays ?? 0} />
            <KpiCard label="QA fail count" value={qaFailRows.length} />
            <KpiCard label="Monthly FPS preview" value={agentMonthly?.avg !== null && agentMonthly?.avg !== undefined ? agentMonthly.avg.toFixed(1) : "—"} subtitle="Excl. consistency bonus" />
          </>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6"><p className="text-sm text-gray-500">Loading FPS data...</p></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><p className="text-sm text-gray-500">No FPS records match the current filters.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm" style={{ minWidth: 850 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Date", "Agent", "Status", "Vol. pts", "QA pts", "QA fail", "Base FPS", "Final FPS", ""].map(h => (
                  <th key={h} className={cn("px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-left",
                    ["Vol. pts", "QA pts", "Base FPS", "Final FPS"].includes(h) && "text-right",
                    ["QA fail", "Status"].includes(h) && "text-center"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, ri) => {
                const excluded = row.isLeave || row.isNoData;
                return (
                  <tr key={`${row.agentId}-${row.date}`}
                    className={cn("border-b border-gray-50 hover:bg-amber-50/20 transition-colors", ri % 2 !== 0 && "bg-gray-50/50", excluded && "opacity-60")}>
                    <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-2.5 font-medium text-green-800">{row.agentName}</td>
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge status={row.dayStatus} />
                    </td>
                    <td className={cn("px-3 py-2.5 text-right", excluded ? "text-gray-300" : "text-gray-700")}>
                      {excluded ? "—" : row.volPts !== null ? row.volPts : "—"}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right", excluded ? "text-gray-300" : "text-gray-700")}>
                      {excluded ? "—" : row.qaMissing ? <span className="text-gray-400" title="No QA — neutral">0</span> : row.qaPts}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {row.qaFail && <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 rounded">Fail</span>}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right", excluded ? "text-gray-300" : "text-gray-500")}>
                      {excluded ? "—" : row.baseFps !== null ? row.baseFps : "—"}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right font-semibold text-[15px]",
                      excluded ? "text-gray-300" : row.qaFail ? "text-red-600" : "text-gray-900")}>
                      {excluded ? "—" : row.finalFps !== null ? (
                        <>
                          {row.finalFps}
                          {row.capApplied && <span className="text-[10px] ml-0.5" title={`Capped from ${row.baseFps}`}>↓</span>}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => setDrawerRow(row)} title="View breakdown"
                        className="p-1 rounded text-gray-400 hover:text-gray-900">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {drawerRow && (
        <>
          <div onClick={() => setDrawerRow(null)} className="fixed inset-0 bg-black/40 z-[1000]" />
          <div className="fixed top-0 right-0 bottom-0 w-[540px] bg-white z-[1001] shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">
                FPS breakdown — {drawerRow.agentName}, {formatDate(drawerRow.date)}
              </h3>
              <button onClick={() => setDrawerRow(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {/* Day summary */}
              <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200 mb-4">Day summary</div>
              <div className="flex gap-6 mb-6">
                <div><p className="text-xs text-gray-500">Agent</p><p className="text-sm font-medium text-gray-900">{drawerRow.agentName}</p></div>
                <div><p className="text-xs text-gray-500">Date</p><p className="text-sm font-medium text-gray-900">{formatDate(drawerRow.date)}</p></div>
                <div><p className="text-xs text-gray-500">Status</p><StatusBadge status={drawerRow.dayStatus} /></div>
              </div>

              {(drawerRow.isLeave || drawerRow.isNoData) ? (
                <div className="p-4 rounded-lg bg-gray-50 text-sm text-gray-500 text-center">
                  {drawerRow.isLeave ? "Agent on leave. No FPS computed. Day excluded from averaging." : "No data recorded. Day excluded from averaging."}
                </div>
              ) : (
                <>
                  <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200 mb-4">FPS breakdown</div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-0">
                    <BreakdownRow label="Volume points" sublabel="From daily volume log" value={drawerRow.volPts ?? 0} />
                    <BreakdownRow label="QA points"
                      sublabel={drawerRow.qaMissing ? "No QA record — neutral (0 pts)" : `From QA log — ${drawerRow.qaTier}`}
                      value={drawerRow.qaPts ?? 0} error={drawerRow.qaFail} />
                    <BreakdownRow label="= Base FPS" value={drawerRow.baseFps ?? 0} muted />
                    <BreakdownRow label="QA fail cap"
                      sublabel={drawerRow.qaFail ? (drawerRow.capApplied ? `Capped from ${drawerRow.baseFps} to 60` : "QA fail but base ≤ 60") : "Not applied"}
                      value={drawerRow.capApplied ? "YES" : "NO"} error={drawerRow.capApplied} />
                    <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-900">= Final daily FPS</span>
                      <span className={cn("text-2xl font-bold", drawerRow.qaFail ? "text-red-600" : "text-gray-900")}>
                        {drawerRow.finalFps}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200 mt-6 mb-4">Source context</div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Volume source: Daily volume log → {drawerRow.agentName}, {formatDate(drawerRow.date)}</p>
                    <p>QA source: {drawerRow.qaMissing ? "No QA record (neutral)" : `QA log → ${drawerRow.qaTier} (${drawerRow.qaPts} pts)`}</p>
                    {drawerRow.qaFail && <p className="text-red-600 font-medium mt-2">QA fail detected — FPS capped at max 60.</p>}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "LEAVE") return <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 rounded">On leave</span>;
  if (status === "NO DATA") return <span className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-500 rounded">No data</span>;
  if (status === "QA CAPPED") return <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 rounded">QA capped</span>;
  return null;
}

function BreakdownRow({ label, sublabel, value, muted, error }: { label: string; sublabel?: string; value: number | string; muted?: boolean; error?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
      <div>
        <p className={cn("text-sm", muted ? "text-gray-500" : "text-gray-700")}>{label}</p>
        {sublabel && <p className={cn("text-[11px]", error ? "text-red-500" : "text-gray-400")}>{sublabel}</p>}
      </div>
      <span className={cn("text-lg font-semibold", error ? "text-red-600" : muted ? "text-gray-500" : "text-gray-900")}>{value}</span>
    </div>
  );
}

function KpiCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}