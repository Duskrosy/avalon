"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Payout = {
  id?: string;
  agent_id: string;
  agent: { id: string; first_name: string; last_name: string };
  month: string;
  gate_passed: boolean;
  mtd_confirmed_regular: number;
  gate_threshold: number;
  avg_fps: number | null;
  scored_days: number;
  consistency_score: number;
  final_fps: number | null;
  bracket?: string;
  payout_tier: string | null;
  main_tier_payout: number;
  abandoned_payout: number;
  onhand_payout: number;
  total_payout: number;
  status?: string;
  eligible?: boolean;
  reason?: string | null;
};

type Props = { isManager: boolean; isOps: boolean };

const BRACKET_STYLE: Record<string, string> = {
  Elite: "bg-purple-50 text-purple-700",
  Strong: "bg-blue-50 text-blue-700",
  Pass: "bg-green-50 text-green-700",
  Fail: "bg-red-50 text-red-700",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  approved: "bg-blue-50 text-blue-700",
  paid: "bg-green-50 text-green-700",
  disputed: "bg-red-50 text-red-700",
};

export function PayoutsView({ isManager, isOps }: Props) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [drawerAgent, setDrawerAgent] = useState<Payout | null>(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sales/payouts?month=${month}`);
    const data = await res.json();
    setPayouts(data.payouts ?? []);
    setSource(data.source ?? "");
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/sales/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payouts, month }),
    });
    setSaving(false);
    fetchPayouts();
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch("/api/sales/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchPayouts();
  }

  function formatPeso(amount: number) {
    return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const monthLabel = new Date(month + "-15").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Summary KPIs
  const totalPayout = payouts.reduce((s, p) => s + p.total_payout, 0);
  const totalMain = payouts.reduce((s, p) => s + p.main_tier_payout, 0);
  const totalAbandoned = payouts.reduce((s, p) => s + p.abandoned_payout, 0);
  const totalOnhand = payouts.reduce((s, p) => s + p.onhand_payout, 0);
  const eligibleCount = payouts.filter(p => p.gate_passed).length;

  return (
    <div>
      {/* Filter */}
      <div className="bg-amber-50/30 p-3 rounded-lg mb-4 flex gap-3 items-end flex-wrap border border-gray-200">
        <div className="flex flex-col gap-0.5">
          <label className="text-[11px] font-medium text-gray-500">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-gray-200 text-sm bg-white" />
        </div>
        <div className="flex-1" />
        {source === "computed" && isManager && (
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50">
            {saving ? "Saving..." : "Save payouts"}
          </button>
        )}
        {source === "saved" && (
          <span className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-full font-medium">Saved</span>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 border-l-2 border-l-green-600">
          <p className="text-[11px] font-semibold text-gray-500">Total payout</p>
          <p className="text-xl font-bold text-green-800 mt-0.5">{formatPeso(totalPayout)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500">Main tier</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{formatPeso(totalMain)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500">Abandoned</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{formatPeso(totalAbandoned)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500">Onhand</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{formatPeso(totalOnhand)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[11px] font-semibold text-gray-500">Gate passed</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{eligibleCount}/{payouts.length}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6"><p className="text-sm text-gray-500">Computing payouts...</p></div>
      ) : payouts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><p className="text-sm text-gray-500">No agents found. Add sales agents first.</p></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm" style={{ minWidth: 1050 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Agent", "Gate", "MTD reg", "Avg FPS", "Consistency", "Final FPS", "Bracket", "Main tier", "Abandoned", "Onhand", "Total", "Status", ""].map(h => (
                  <th key={h} className={cn("px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap",
                    ["MTD reg", "Avg FPS", "Consistency", "Final FPS", "Main tier", "Abandoned", "Onhand", "Total"].includes(h) ? "text-right" : "text-left",
                    ["Gate", "Bracket", "Status"].includes(h) && "text-center"
                  )}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map((p, ri) => {
                const bracket = p.bracket || p.payout_tier || "Fail";
                return (
                  <tr key={p.agent_id} className={cn("border-b border-gray-50 hover:bg-amber-50/20", ri % 2 !== 0 && "bg-gray-50/50")}>
                    <td className="px-3 py-2.5 font-medium text-green-800 cursor-pointer" onClick={() => setDrawerAgent(p)}>
                      {p.agent.first_name} {p.agent.last_name}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {p.gate_passed ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 rounded">Passed</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 rounded">Not passed</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{p.mtd_confirmed_regular}</td>
                    <td className="px-3 py-2.5 text-right">{p.avg_fps !== null ? p.avg_fps.toFixed(1) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">{p.consistency_score}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">{p.final_fps !== null ? p.final_fps.toFixed(1) : "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded", BRACKET_STYLE[bracket] || "bg-gray-100 text-gray-500")}>
                        {bracket}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">{p.main_tier_payout > 0 ? formatPeso(p.main_tier_payout) : <span className="text-gray-300">₱0</span>}</td>
                    <td className="px-3 py-2.5 text-right">{p.abandoned_payout > 0 ? formatPeso(p.abandoned_payout) : <span className="text-gray-300">₱0</span>}</td>
                    <td className="px-3 py-2.5 text-right">{p.onhand_payout > 0 ? formatPeso(p.onhand_payout) : <span className="text-gray-300">₱0</span>}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-green-800">{formatPeso(p.total_payout)}</td>
                    <td className="px-3 py-2.5 text-center">
                      {p.status && (
                        <span className={cn("px-2 py-0.5 text-[10px] font-semibold rounded", STATUS_STYLE[p.status] || STATUS_STYLE.draft)}>
                          {p.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.id && isOps && p.status === "draft" && (
                        <button onClick={() => handleStatusChange(p.id!, "approved")}
                          className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                          Approve
                        </button>
                      )}
                      {p.id && isOps && p.status === "approved" && (
                        <button onClick={() => handleStatusChange(p.id!, "paid")}
                          className="px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 rounded hover:bg-green-100">
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Drawer */}
      {drawerAgent && (
        <>
          <div onClick={() => setDrawerAgent(null)} className="fixed inset-0 bg-black/40 z-[1000]" />
          <div className="fixed top-0 right-0 bottom-0 w-[500px] bg-white z-[1001] shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">
                {drawerAgent.agent.first_name} {drawerAgent.agent.last_name} — {monthLabel}
              </h3>
              <button onClick={() => setDrawerAgent(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {/* Gate */}
              <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200 mb-4">Gate check</div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500">MTD confirmed regular</p>
                  <p className="text-lg font-semibold text-gray-900">{drawerAgent.mtd_confirmed_regular}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Threshold</p>
                  <p className="text-lg font-semibold text-gray-900">{drawerAgent.gate_threshold}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  {drawerAgent.gate_passed ? (
                    <span className="text-sm font-semibold text-green-600">Passed ✓</span>
                  ) : (
                    <span className="text-sm font-semibold text-red-600">Not passed ({drawerAgent.gate_threshold - drawerAgent.mtd_confirmed_regular} remaining)</span>
                  )}
                </div>
              </div>

              {/* FPS */}
              <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200 mb-4">Performance</div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500">Avg daily FPS</p>
                  <p className="text-lg font-semibold">{drawerAgent.avg_fps !== null ? drawerAgent.avg_fps.toFixed(1) : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Scored days</p>
                  <p className="text-lg font-semibold">{drawerAgent.scored_days}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Consistency bonus</p>
                  <p className="text-lg font-semibold">+{drawerAgent.consistency_score}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Final monthly FPS</p>
                  <p className="text-lg font-bold">{drawerAgent.final_fps !== null ? drawerAgent.final_fps.toFixed(1) : "—"}</p>
                </div>
              </div>

              {/* Bracket */}
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 mb-6 text-center">
                <p className="text-xs text-gray-500 mb-1">Bracket</p>
                <span className={cn("px-4 py-1 text-sm font-bold rounded", BRACKET_STYLE[drawerAgent.bracket || drawerAgent.payout_tier || "Fail"])}>
                  {drawerAgent.bracket || drawerAgent.payout_tier || "Fail"}
                </span>
              </div>

              {/* Payout breakdown */}
              <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200 mb-4">Payout breakdown</div>

              {!drawerAgent.gate_passed ? (
                <div className="p-4 rounded-lg bg-red-50 text-sm text-red-600 text-center">
                  Not eligible — gate not passed. All incentives require ≥ 180 confirmed regular.
                </div>
              ) : (
                <div className="space-y-3">
                  <PayoutRow label="Main tier" sublabel={`${drawerAgent.bracket || drawerAgent.payout_tier} rate applied`}
                    amount={drawerAgent.main_tier_payout}
                    note={drawerAgent.main_tier_payout === 0 && (drawerAgent.final_fps === null || drawerAgent.final_fps <= 70) ? "FPS ≤ 70, not eligible" : undefined} />
                  <PayoutRow label="Abandoned incentive" sublabel="₱100 per delivered abandoned pair"
                    amount={drawerAgent.abandoned_payout} />
                  <PayoutRow label="Onhand incentive" sublabel="₱20 per delivered onhand pair (≥50% util.)"
                    amount={drawerAgent.onhand_payout} />
                  <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-gray-300">
                    <span className="text-sm font-bold text-gray-900">Total payout</span>
                    <span className="text-2xl font-bold text-green-800">{formatPeso(drawerAgent.total_payout)}</span>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-400 mt-4">
                Pair counts currently at 0 — will be populated when delivery verification is connected.
                Payouts will recalculate automatically.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PayoutRow({ label, sublabel, amount, note }: { label: string; sublabel: string; amount: number; note?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        <p className="text-[11px] text-gray-400">{sublabel}</p>
        {note && <p className="text-[11px] text-red-500 mt-0.5">{note}</p>}
      </div>
      <span className={cn("text-lg font-semibold", amount > 0 ? "text-gray-900" : "text-gray-300")}>
        ₱{amount.toLocaleString()}
      </span>
    </div>
  );
}

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}