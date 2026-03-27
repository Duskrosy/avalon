import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// GET /api/kpi — fetch KPI entries with optional filters
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("department_id");
  const metricName = searchParams.get("metric_name");
  const periodStart = searchParams.get("period_start");
  const periodEnd = searchParams.get("period_end");

  let query = supabase
    .from("kpi_entries")
    .select(`
      *,
      department:departments(id, name, slug)
    `)
    .order("period_end", { ascending: false })
    .limit(200);

  // Non-OPS can only see their own department
  if (!isOps(currentUser)) {
    query = query.eq("department_id", currentUser.department_id);
  } else if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  if (metricName) query = query.eq("metric_name", metricName);
  if (periodStart) query = query.gte("period_start", periodStart);
  if (periodEnd) query = query.lte("period_end", periodEnd);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data });
}

// POST /api/kpi — create a new KPI entry (manual)
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { department_id, metric_name, metric_value, metric_unit, period_start, period_end } = body;

  if (!department_id || !metric_name || metric_value === undefined || !period_start || !period_end) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isOps(currentUser) && department_id !== currentUser.department_id) {
    return NextResponse.json(
      { error: "You can only add KPIs for your own department" },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin.from("kpi_entries").insert({
    department_id,
    metric_name,
    metric_value: Number(metric_value),
    metric_unit: metric_unit || null,
    period_start,
    period_end,
    source: "manual",
    created_by: currentUser.id,
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

// DELETE /api/kpi?id=xxx — delete a KPI entry
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin.from("kpi_entries").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Entry deleted" });
}