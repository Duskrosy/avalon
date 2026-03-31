"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { SalesAgent } from "@/lib/sales/types";

type DowntimeEntry = {
  id: string;
  date: string;
  agent_id: string | null;
  downtime_type: string;
  affected_tool: string | null;
  start_time: string;
  end_time: string | null;
  duration_hours: number | null;
  ticket_ref: string | null;
  description: string;
  verified: boolean;
  agent: { id: string; first_name: string; last_name: string } | null;
  verifier: { first_name: string; last_name: string } | null;
};

type Props = { isManager: boolean; currentUserId: string };

const TYPES = [
  { value: "system", label: "System" },
  { value: "internet", label: "Internet" },
  { value: "power", label: "Power" },
  { value: "tool", label: "Tool" },
  { value: "other", label: "Other" },
];

const TYPE_BADGE: Record<string, string> = {
  system: "bg-red-50 text-red-700",
  internet: "bg-blue-50 text-blue-700",
  power: "bg-amber-50 text-amber-700",
  tool: "bg-purple-50 text-purple-700",
  other: "bg-gray-100 text-gray-600",
};

export function DowntimeView({ isManager, currentUserId }: Props) {
  const [entries, setEntries] = useState<DowntimeEntry[]>([]);
  const [agents, setAgents] = useState<SalesAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    agent_id: "",
    downtime_type: "system",
    affected_tool: "",
    start_time: "",
    end_time: "",
    duration_hours: "",
    ticket_ref: "",
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [entriesRes, agentsRes] = await Promise.all([
      fetch(`/api/sales/downtime?month=${month}`),
      fetch("/api/sales/agents"),
    ]);
    const eData = await entriesRes.json();
    const aData = await agentsRes.json();
    setEntries(eData.entries ?? []);
    setAgents(aData.agents ?? []);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || !form.start_time) {
      setFormError("Description and start time are required");
      return;
    }
    setFormError(null);
    setSaving(true);

    const res = await fetch("/api/sales/downtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error);
      setSaving(false);
      return;
    }

    setForm({ date: new Date().toISOString().split("T")[0], agent_id: "", downtime_type: "system", affected_tool: "", start_time: "", end_time: "", duration_hours: "", ticket_ref: "", description: "" });
    setShowForm(false);
    setSaving(false);
    fetchData();
  }

  async function toggleVerify(id: string, current: boolean) {
    await fetch("/api/sales/downtime", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, verified: !current }),
    });
    fetchData();
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this downtime entry?")) return;
    await fetch(`/api/sales/downtime?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
  }

  function formatTime(t: string) {
    return new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  const totalHours = entries.reduce((s, e) => s + (e.duration_hours || 0), 0);
  const verifiedCount = entries.filter(e => e.verified).length;

  return (
    <div>
      {/* Filter + action */}
      <div className="bg-amber-50/30 p-3 rounded-lg mb-4 flex gap-3 items-end flex-wrap border border-gray-200">
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] font-medium text-gray-500">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm bg-white" />
        </div>
        <div className="flex-1" />
        {isManager && (
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
            {showForm ? "Cancel" : "+ Log downtime"}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500">Total incidents</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{entries.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500">Total downtime hours</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500">Verified</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{verifiedCount}/{entries.length}</p>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type *</label>
                <select value={form.downtime_type} onChange={e => setForm(f => ({ ...f, downtime_type: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm">
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Affected agent</label>
                <select value={form.agent_id} onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm">
                  <option value="">All agents</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start time *</label>
                <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End time</label>
                <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Duration (hrs)</label>
                <input type="number" step="0.1" value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm" placeholder="1.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Affected tool</label>
                <input value={form.affected_tool} onChange={e => setForm(f => ({ ...f, affected_tool: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm" placeholder="Pancake, Shopify..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ticket reference</label>
                <input value={form.ticket_ref} onChange={e => setForm(f => ({ ...f, ticket_ref: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm" placeholder="#4821" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm" placeholder="What happened?" />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button type="submit" disabled={saving}
              className="px-5 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Saving..." : "Log downtime"}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6"><p className="text-sm text-gray-500">Loading...</p></div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><p className="text-sm text-gray-500">No downtime logged this month.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Date", "Type", "Agent", "Tool", "Start", "End", "Duration", "Ticket", "Description", "Verified", ""].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((row, ri) => (
                <tr key={row.id} className={cn("border-b border-gray-50 hover:bg-amber-50/20", ri % 2 !== 0 && "bg-gray-50/50")}>
                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{formatDate(row.date)}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("px-2 py-0.5 text-[10px] font-semibold uppercase rounded", TYPE_BADGE[row.downtime_type] || TYPE_BADGE.other)}>
                      {row.downtime_type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">
                    {row.agent ? `${row.agent.first_name} ${row.agent.last_name}` : <span className="text-gray-400">All agents</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{row.affected_tool || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{formatTime(row.start_time)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{row.end_time ? formatTime(row.end_time) : "—"}</td>
                  <td className="px-3 py-2.5 text-gray-700">{row.duration_hours ? `${row.duration_hours}h` : "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{row.ticket_ref || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[200px] truncate">{row.description}</td>
                  <td className="px-3 py-2.5">
                    {isManager ? (
                      <button onClick={() => toggleVerify(row.id, row.verified)}
                        className={cn("px-2 py-0.5 text-[10px] font-semibold rounded", row.verified ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>
                        {row.verified ? "Verified ✓" : "Verify"}
                      </button>
                    ) : row.verified ? (
                      <span className="text-[10px] text-green-600 font-medium">Verified</span>
                    ) : <span className="text-[10px] text-gray-400">Pending</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {isManager && (
                      <button onClick={() => deleteEntry(row.id)}
                        className="p-1 rounded text-gray-300 hover:text-red-500">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}