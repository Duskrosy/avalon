"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { QA_TIER_KEYS, QA_TIERS } from "@/lib/sales/constants";
import type { QaLog, SalesAgent } from "@/lib/sales/types";
import { QaDrawer } from "./qa-drawer";

type Props = { isManager: boolean };

export function QaLogView({ isManager }: Props) {
  const [entries, setEntries] = useState<QaLog[]>([]);
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (agentFilter !== "all") params.set("agent_id", agentFilter);
    if (tierFilter !== "all") params.set("tier", tierFilter);

    const [entriesRes, agentsRes] = await Promise.all([
      fetch(`/api/sales/qa?${params}`),
      fetch("/api/sales/agents"),
    ]);
    const eData = await entriesRes.json();
    const aData = await agentsRes.json();
    setEntries(eData.entries ?? []);
    setAgents(aData.agents ?? []);
    setLoading(false);
  }, [month, agentFilter, tierFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function agentName(id: string) {
    const a = agents.find(x => x.id === id);
    return a ? `${a.first_name} ${a.last_name}` : "Unknown";
  }

  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", weekday: "short" });
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this QA entry? This may affect FPS calculations.")) return;
    await fetch(`/api/sales/qa?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  // KPIs
  const isSpecific = agentFilter !== "all";
  const failCount = entries.filter(e => e.qa_fail).length;
  const totalPoints = entries.reduce((s, e) => s + e.qa_points, 0);
  const avgPoints = entries.length > 0 ? (totalPoints / entries.length).toFixed(1) : "—";

  const tierBadgeStyle = (tier: string) => {
    const t = QA_TIERS[tier as keyof typeof QA_TIERS];
    if (!t) return "bg-gray-100 text-gray-500";
    if (tier === "Fail") return "bg-red-50 text-red-700";
    if (tier === "Tier 3") return "bg-green-50 text-green-700";
    if (tier === "Tier 1") return "bg-amber-50 text-amber-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div>
      {/* Filter Bar */}
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
          <label className="text-[11px] font-medium text-gray-500">QA tier</label>
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm bg-white">
            <option value="all">All tiers</option>
            {QA_TIER_KEYS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        {isManager && (
          <button onClick={() => { setEditingId(null); setDrawerOpen(true); }}
            className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
            + Add QA entry
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {!isSpecific ? (
          <>
            <KpiCard label="Total QA reviews" value={entries.length} />
            <KpiCard label="QA fail count" value={failCount} subtitle={failCount > 0 ? "FPS cap at 60 will apply" : undefined} />
            <KpiCard label="Avg QA points" value={avgPoints} />
            <KpiCard label="Total QA points" value={totalPoints} />
          </>
        ) : (
          <>
            <KpiCard label="Total QA reviews (MTD)" value={entries.length} />
            <KpiCard label="Total QA points (MTD)" value={totalPoints} />
            <KpiCard label="QA fail count" value={failCount} />
            <KpiCard label="Avg QA points" value={avgPoints} />
          </>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Loading QA data...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No QA entries match the current filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm" style={{ minWidth: 1000 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Date", "Agent", "Message link", "QA tier", "QA points", "QA fail", "Reason", "Evaluator", "Notes", ""].map(h => (
                  <th key={h} className={cn("px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-left",
                    ["QA points"].includes(h) && "text-right",
                    ["QA tier", "QA fail"].includes(h) && "text-center"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((row, ri) => (
                <tr key={row.id} className={cn("border-b border-gray-50 hover:bg-amber-50/20 transition-colors", ri % 2 !== 0 && "bg-gray-50/50")}>
                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{formatDate(row.qa_date)}</td>
                  <td className="px-3 py-2.5 font-medium text-green-800">{agentName(row.agent_id)}</td>
                  <td className="px-3 py-2.5 max-w-[160px] truncate">
                    <a href={row.message_link} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs">
                      {row.message_link.replace(/^https?:\/\//, "").substring(0, 35)}...
                    </a>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn("px-2 py-0.5 text-[10px] font-semibold uppercase rounded", tierBadgeStyle(row.qa_tier))}>
                      {row.qa_tier}
                    </span>
                  </td>
                  <td className={cn("px-3 py-2.5 text-right font-semibold", row.qa_fail ? "text-red-600" : "text-gray-900")}>
                    {row.qa_points}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {row.qa_fail && <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-red-50 text-red-700 rounded">Fail</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[160px] truncate">{row.qa_reason}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{row.evaluator}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[150px] truncate">{row.notes || "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    {isManager && (
                      <div className="flex gap-0.5 justify-center">
                        <button onClick={() => { setEditingId(row.id); setDrawerOpen(true); }}
                          className="p-1 rounded text-gray-400 hover:text-gray-900" title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                        <button onClick={() => deleteEntry(row.id)}
                          className="p-1 rounded text-gray-300 hover:text-red-500" title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <QaDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingId(null); }}
        editingId={editingId}
        agents={agents}
        entries={entries}
        onSaved={fetchData}
      />
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