import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isManagerOrAbove } from "@/lib/permissions";

// GET /api/sales/downtime?month=YYYY-MM
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const admin = createAdminClient();

  let query = admin
    .from("sales_downtime_log")
    .select(`*, agent:profiles!sales_downtime_log_agent_id_fkey(id, first_name, last_name), verifier:profiles!sales_downtime_log_verified_by_fkey(first_name, last_name)`)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (month) {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    query = query.gte("date", `${month}-01`).lte("date", `${month}-${String(lastDay).padStart(2, "0")}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data });
}

// POST /api/sales/downtime
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, agent_id, downtime_type, affected_tool, start_time, end_time, duration_hours, ticket_ref, description } = body;

  if (!date || !downtime_type || !start_time || !description) {
    return NextResponse.json({ error: "Date, type, start time, and description are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sales_downtime_log")
    .insert({
      date,
      agent_id: agent_id || null,
      downtime_type,
      affected_tool: affected_tool || null,
      start_time,
      end_time: end_time || null,
      duration_hours: duration_hours ? Number(duration_hours) : null,
      ticket_ref: ticket_ref || null,
      description: description.trim(),
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

// PATCH /api/sales/downtime — verify or update
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, verified, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: "Entry ID required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const updateData: Record<string, unknown> = {};

  if (verified !== undefined) {
    updateData.verified = verified;
    updateData.verified_by = verified ? currentUser.id : null;
  }

  const allowed = ["date", "agent_id", "downtime_type", "affected_tool", "start_time", "end_time", "duration_hours", "ticket_ref", "description"];
  for (const key of allowed) {
    if (fields[key] !== undefined) updateData[key] = fields[key];
  }

  const { error } = await admin.from("sales_downtime_log").update(updateData).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

// DELETE /api/sales/downtime?id=xxx
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
  const { error } = await admin.from("sales_downtime_log").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted" });
}