import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/permissions";
import {
  computeMtdConfirmedRegular,
  computeMonthlyFps,
  computeDailyFps,
  computeMonthlyFpsWithConsistency,
  computeGateStatus,
  computeTotalPayout,
} from "@/lib/sales/scoring";
import type { DailyVolume, QaLog } from "@/lib/sales/types";

// GET /api/sales/dashboard?month=YYYY-MM
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = searchParams.get("month") || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [y, m] = month.split("-").map(Number);
  const totalDays = new Date(y, m, 0).getDate();
  const currentDay = (now.getFullYear() === y && now.getMonth() + 1 === m) ? now.getDate() : totalDays;
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(totalDays).padStart(2, "0")}`;

  const admin = createAdminClient();

  // Get sales dept + agents
  const { data: salesDept } = await admin.from("departments").select("id").eq("slug", "sales").single();
  if (!salesDept) return NextResponse.json({ error: "Sales dept not found" }, { status: 500 });

  const { data: agents } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("department_id", salesDept.id)
    .eq("is_active", true)
    .order("first_name");

  // Fetch all data
  const [volRes, qaRes, conRes, dtRes] = await Promise.all([
    admin.from("sales_daily_volume").select("*").gte("date", startDate).lte("date", endDate),
    admin.from("sales_qa_log").select("*").gte("qa_date", startDate).lte("qa_date", endDate),
    admin.from("sales_consistency").select("*").eq("month", month),
    admin.from("sales_downtime_log").select("*").gte("date", startDate).lte("date", endDate),
  ]);

  const volumes = (volRes.data ?? []) as DailyVolume[];
  const qaLogs = (qaRes.data ?? []) as QaLog[];
  const consistencyRecords = conRes.data ?? [];
  const downtimeRecords = dtRes.data ?? [];

  // QA + consistency lookups
  const qaMap = new Map<string, QaLog>();
  for (const qa of qaLogs) qaMap.set(`${qa.agent_id}-${qa.qa_date}`, qa);
  const conMap = new Map<string, number>();
  for (const c of consistencyRecords) conMap.set(c.agent_id, c.consistency_score);

  // === VOLUME SECTION ===
  const totalConfTotal = volumes.reduce((s, v) => s + v.confirmed_total, 0);
  const totalConfAbandoned = volumes.reduce((s, v) => s + v.confirmed_abandoned, 0);
  const totalConfRegular = totalConfTotal - totalConfAbandoned;
  const dailyAvgConfReg = currentDay > 0 ? Math.round(totalConfRegular / currentDay) : 0;
  const projectedEom = Math.round((totalConfRegular / currentDay) * totalDays);

  // === PERFORMANCE SECTION ===
  const agentStats = (agents ?? []).map(agent => {
    const agentVols = volumes.filter(v => v.agent_id === agent.id);
    const mtdConfReg = computeMtdConfirmedRegular(agentVols);
    const gate = computeGateStatus(mtdConfReg);

    const dailyRows = agentVols.map(vol => {
      const qa = qaMap.get(`${vol.agent_id}-${vol.date}`) || null;
      return computeDailyFps(vol, qa);
    });

    const monthlyResult = computeMonthlyFps(dailyRows);
    const consistency = conMap.get(agent.id) ?? 0;
    const { monthlyFps, bracket } = computeMonthlyFpsWithConsistency(monthlyResult.avg, consistency);
    const qaFails = dailyRows.filter(r => r.qaFail).length;

    return {
      id: agent.id,
      name: `${agent.first_name} ${agent.last_name}`,
      mtdConfRegular: mtdConfReg,
      mtdConfTotal: agentVols.reduce((s, v) => s + v.confirmed_total, 0),
      gatePassed: gate.passed,
      gateRemaining: gate.remaining,
      avgFps: monthlyResult.avg,
      scoredDays: monthlyResult.scoredDays,
      consistency,
      monthlyFps,
      bracket,
      qaFails,
    };
  });

  const teamAvgFps = (() => {
    const scored = agentStats.filter(a => a.avgFps !== null);
    if (scored.length === 0) return null;
    return Math.round((scored.reduce((s, a) => s + (a.avgFps || 0), 0) / scored.length) * 10) / 10;
  })();

  const gatePassed = agentStats.filter(a => a.gatePassed).length;
  const gateNotPassed = agentStats.filter(a => !a.gatePassed).length;
  const below70 = agentStats.filter(a => a.monthlyFps !== null && a.monthlyFps < 70).length;
  const totalQaFails = agentStats.reduce((s, a) => s + a.qaFails, 0);

  // === RANKINGS ===
  const topByConfReg = [...agentStats].sort((a, b) => b.mtdConfRegular - a.mtdConfRegular).slice(0, 5);
  const topByFps = [...agentStats].filter(a => a.avgFps !== null).sort((a, b) => (b.avgFps || 0) - (a.avgFps || 0)).slice(0, 5);
  const attentionNeeded = agentStats.filter(a =>
    !a.gatePassed || (a.monthlyFps !== null && a.monthlyFps < 70) || a.qaFails >= 2
  ).slice(0, 5);

  // === DOWNTIME ===
  const totalDowntimeHours = downtimeRecords.reduce((s, d) => s + (d.duration_hours || 0), 0);

  return NextResponse.json({
    month,
    currentDay,
    totalDays,
    agentCount: (agents ?? []).length,
    volume: {
      confirmedTotal: totalConfTotal,
      confirmedRegular: totalConfRegular,
      confirmedAbandoned: totalConfAbandoned,
      dailyAvg: dailyAvgConfReg,
      projectedEom,
    },
    performance: {
      teamAvgFps,
      gatePassed,
      gateNotPassed,
      below70,
      qaFails: totalQaFails,
    },
    rankings: {
      topByConfReg: topByConfReg.map(a => ({ name: a.name, value: a.mtdConfRegular })),
      topByFps: topByFps.map(a => ({ name: a.name, value: a.avgFps?.toFixed(1) || "—" })),
      attentionNeeded: attentionNeeded.map(a => ({
        name: a.name,
        reason: !a.gatePassed ? `${a.gateRemaining} remaining` :
          a.qaFails >= 2 ? `${a.qaFails} QA fails` :
          a.monthlyFps !== null && a.monthlyFps < 70 ? `FPS: ${a.monthlyFps.toFixed(0)}` : "—",
      })),
    },
    downtime: {
      incidents: downtimeRecords.length,
      totalHours: totalDowntimeHours,
    },
    agents: agentStats,
  });
}