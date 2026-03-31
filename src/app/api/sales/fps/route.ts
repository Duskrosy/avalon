import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/permissions";
import { computeDailyFps, computeMonthlyFps } from "@/lib/sales/scoring";
import type { DailyVolume, QaLog, DailyFpsRow } from "@/lib/sales/types";

// GET /api/sales/fps?month=YYYY-MM&agent_id=
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const agentId = searchParams.get("agent_id");

  if (!month) {
    return NextResponse.json({ error: "Month parameter required (YYYY-MM)" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const admin = createAdminClient();

  // Fetch volume and QA data for the month
  let volQuery = admin
    .from("sales_daily_volume")
    .select("*, agent:profiles!sales_daily_volume_agent_id_fkey(id, first_name, last_name)")
    .gte("date", startDate)
    .lte("date", endDate);

  let qaQuery = admin
    .from("sales_qa_log")
    .select("*")
    .gte("qa_date", startDate)
    .lte("qa_date", endDate);

  if (agentId && agentId !== "all") {
    volQuery = volQuery.eq("agent_id", agentId);
    qaQuery = qaQuery.eq("agent_id", agentId);
  }

  const [volResult, qaResult] = await Promise.all([volQuery, qaQuery]);

  if (volResult.error || qaResult.error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  const volumes = (volResult.data ?? []) as DailyVolume[];
  const qaLogs = (qaResult.data ?? []) as QaLog[];

  // Build QA lookup: agent_id + date → QaLog
  const qaMap = new Map<string, QaLog>();
  for (const qa of qaLogs) {
    qaMap.set(`${qa.agent_id}-${qa.qa_date}`, qa);
  }

  // Compute FPS for each volume entry
  const rows: (DailyFpsRow & { agentName: string })[] = [];

  for (const vol of volumes) {
    const qa = qaMap.get(`${vol.agent_id}-${vol.date}`) || null;
    const fps = computeDailyFps(vol, qa);
    const agent = vol.agent as unknown as { first_name: string; last_name: string } | null;
    rows.push({
      ...fps,
      agentId: vol.agent_id,
      date: vol.date,
      agentName: agent ? `${agent.first_name} ${agent.last_name}` : "Unknown",
    });
  }

  // Sort by date desc, then agent
  rows.sort((a, b) => {
    const dc = b.date.localeCompare(a.date);
    return dc !== 0 ? dc : a.agentName.localeCompare(b.agentName);
  });

  // Compute monthly averages per agent
  const agentIds = [...new Set(rows.map(r => r.agentId))];
  const monthlyAverages: Record<string, { avg: number | null; scoredDays: number }> = {};

  for (const aid of agentIds) {
    const agentRows = rows.filter(r => r.agentId === aid);
    const monthly = computeMonthlyFps(agentRows);
    monthlyAverages[aid] = { avg: monthly.avg, scoredDays: monthly.scoredDays };
  }

  return NextResponse.json({ rows, monthlyAverages });
}