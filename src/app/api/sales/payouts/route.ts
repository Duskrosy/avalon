import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";
import {
  computeMtdConfirmedRegular,
  computeMonthlyFps,
  computeDailyFps,
  computeMonthlyFpsWithConsistency,
  computeTotalPayout,
  computeGateStatus,
} from "@/lib/sales/scoring";
import type { DailyVolume, QaLog } from "@/lib/sales/types";

// GET /api/sales/payouts?month=YYYY-MM
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month) {
    return NextResponse.json({ error: "Month parameter required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check for existing payout records
  const { data: existingPayouts } = await admin
    .from("sales_incentive_payouts")
    .select(`*, agent:profiles!sales_incentive_payouts_agent_id_fkey(id, first_name, last_name)`)
    .eq("month", month)
    .order("total_payout", { ascending: false });

  if (existingPayouts && existingPayouts.length > 0) {
    return NextResponse.json({ payouts: existingPayouts, source: "saved" });
  }

  // No saved payouts — compute from live data
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  // Get all sales agents
  const { data: salesDept } = await admin.from("departments").select("id").eq("slug", "sales").single();
  if (!salesDept) return NextResponse.json({ error: "Sales dept not found" }, { status: 500 });

  const { data: agents } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("department_id", salesDept.id)
    .eq("is_active", true);

  if (!agents || agents.length === 0) {
    return NextResponse.json({ payouts: [], source: "computed" });
  }

  // Fetch volume, QA, consistency
  const { data: volumes } = await admin
    .from("sales_daily_volume")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate);

  const { data: qaLogs } = await admin
    .from("sales_qa_log")
    .select("*")
    .gte("qa_date", startDate)
    .lte("qa_date", endDate);

  const { data: consistencyRecords } = await admin
    .from("sales_consistency")
    .select("*")
    .eq("month", month);

  const volData = (volumes ?? []) as DailyVolume[];
  const qaData = (qaLogs ?? []) as QaLog[];

  // QA lookup
  const qaMap = new Map<string, QaLog>();
  for (const qa of qaData) {
    qaMap.set(`${qa.agent_id}-${qa.qa_date}`, qa);
  }

  // Consistency lookup
  const conMap = new Map<string, number>();
  for (const c of consistencyRecords ?? []) {
    conMap.set(c.agent_id, c.consistency_score);
  }

  // Compute per agent
  const payouts = agents.map(agent => {
    const agentVols = volData.filter(v => v.agent_id === agent.id);
    const mtdConfReg = computeMtdConfirmedRegular(agentVols);
    const gate = computeGateStatus(mtdConfReg);

    // Compute daily FPS
    const dailyRows = agentVols.map(vol => {
      const qa = qaMap.get(`${vol.agent_id}-${vol.date}`) || null;
      return computeDailyFps(vol, qa);
    });

    const monthlyFpsResult = computeMonthlyFps(dailyRows);
    const consistencyScore = conMap.get(agent.id) ?? 0;
    const { monthlyFps, bracket } = computeMonthlyFpsWithConsistency(monthlyFpsResult.avg, consistencyScore);

    // For now, use manual pair counts (0 until delivery verification is built)
    // These will be editable in the payout record
    const paidPairs = 0;
    const deliveredAbandonedPairs = 0;
    const deliveredOnhandPairs = 0;
    const totalDeliveredPairs = 0;

    const payout = computeTotalPayout(
      gate.passed, monthlyFps, bracket,
      paidPairs, deliveredAbandonedPairs, deliveredOnhandPairs, totalDeliveredPairs
    );

    return {
      agent_id: agent.id,
      agent: { id: agent.id, first_name: agent.first_name, last_name: agent.last_name },
      month,
      gate_passed: gate.passed,
      mtd_confirmed_regular: mtdConfReg,
      gate_threshold: 180,
      avg_fps: monthlyFpsResult.avg,
      scored_days: monthlyFpsResult.scoredDays,
      consistency_score: consistencyScore,
      final_fps: monthlyFps,
      bracket,
      main_tier_payout: payout.mainTier.amount,
      abandoned_payout: payout.abandoned.amount,
      onhand_payout: payout.onhand.amount,
      total_payout: payout.total,
      payout_tier: bracket,
      status: "draft" as const,
      eligible: payout.eligible,
      reason: payout.reason,
      // Editable pair counts
      paid_pairs: paidPairs,
      abandoned_pairs: deliveredAbandonedPairs,
      onhand_pairs: deliveredOnhandPairs,
      total_delivered: totalDeliveredPairs,
    };
  });

  // Sort by total payout desc
  payouts.sort((a, b) => b.total_payout - a.total_payout);

  return NextResponse.json({ payouts, source: "computed" });
}

// POST /api/sales/payouts — save/finalize payout records
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { payouts, month } = body;

  if (!payouts || !month) {
    return NextResponse.json({ error: "Payouts and month required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Delete existing records for this month
  await admin.from("sales_incentive_payouts").delete().eq("month", month);

  // Insert new records
  const records = payouts.map((p: Record<string, unknown>) => ({
    agent_id: p.agent_id,
    month,
    gate_passed: p.gate_passed,
    mtd_confirmed_regular: p.mtd_confirmed_regular,
    gate_threshold: 180,
    avg_fps: p.avg_fps,
    scored_days: p.scored_days,
    consistency_score: p.consistency_score,
    final_fps: p.final_fps,
    main_tier_payout: p.main_tier_payout,
    abandoned_payout: p.abandoned_payout,
    onhand_payout: p.onhand_payout,
    total_payout: p.total_payout,
    payout_tier: p.payout_tier,
    status: "draft",
    created_by: currentUser.id,
  }));

  const { error } = await admin.from("sales_incentive_payouts").insert(records);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Payouts saved" });
}

// PATCH /api/sales/payouts — update status (approve/pay)
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    return NextResponse.json({ error: "Only OPS can approve payouts" }, { status: 403 });
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "ID and status required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "approved") {
    updateData.approved_by = currentUser.id;
    updateData.approved_at = new Date().toISOString();
  }
  if (status === "paid") {
    updateData.paid_at = new Date().toISOString();
  }

  const { error } = await admin.from("sales_incentive_payouts").update(updateData).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `Payout ${status}` });
}