import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isManagerOrAbove } from "@/lib/permissions";

// GET /api/sales/volume?agent_id=&month=YYYY-MM&buffer=
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");
  const month = searchParams.get("month");
  const buffer = searchParams.get("buffer");

  const admin = createAdminClient();

  let query = admin
    .from("sales_daily_volume")
    .select(`*, agent:profiles!sales_daily_volume_agent_id_fkey(id, first_name, last_name, email)`)
    .order("date", { ascending: false })
    .order("agent_id");

  if (agentId && agentId !== "all") query = query.eq("agent_id", agentId);
  if (month) {
    query = query.gte("date", `${month}-01`);
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    query = query.lte("date", `${month}-${String(lastDay).padStart(2, "0")}`);
  }
  if (buffer === "buffered") query = query.eq("buffer_approved", true);
  if (buffer === "not-buffered") query = query.eq("buffer_approved", false);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data });
}

// POST /api/sales/volume
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    agent_id, date, follow_ups, confirmed_total, confirmed_abandoned,
    buffer_approved, buffer_reason, buffer_proof_link, buffer_approved_by,
    on_leave, excluded_hours, notes
  } = body;

  if (!agent_id || !date) {
    return NextResponse.json({ error: "Agent and date are required" }, { status: 400 });
  }

  const fu = Number(follow_ups) || 0;
  const ct = Number(confirmed_total) || 0;
  const ca = Math.min(Number(confirmed_abandoned) || 0, ct);

  // Guard: buffer not needed if follow-ups >= 380
  const bufferForced = fu >= 380 ? false : !!buffer_approved;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sales_daily_volume")
    .insert({
      agent_id,
      date,
      follow_ups: fu,
      confirmed_total: ct,
      confirmed_abandoned: ca,
      buffer_approved: bufferForced,
      buffer_reason: bufferForced ? buffer_reason || null : null,
      buffer_proof_link: bufferForced ? buffer_proof_link || null : null,
      buffer_approved_by: bufferForced ? (buffer_approved_by || currentUser.id) : null,
      buffer_approved_at: bufferForced ? new Date().toISOString() : null,
      on_leave: !!on_leave,
      excluded_hours: Number(excluded_hours) || 0,
      notes: notes || null,
      source: "manual",
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return NextResponse.json({ error: "Entry already exists for this agent on this date." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

// PATCH /api/sales/volume — inline edit or full update
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: "Entry ID required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Map allowed fields
  const allowed = [
    "follow_ups", "confirmed_total", "confirmed_abandoned",
    "buffer_approved", "buffer_reason", "buffer_proof_link", "buffer_approved_by",
    "on_leave", "excluded_hours", "notes"
  ];

  for (const key of allowed) {
    if (fields[key] !== undefined) updateData[key] = fields[key];
  }

  // Clamp abandoned to confirmed_total
  if (updateData.confirmed_total !== undefined || updateData.confirmed_abandoned !== undefined) {
    const { data: current } = await admin.from("sales_daily_volume").select("confirmed_total, confirmed_abandoned").eq("id", id).single();
    if (current) {
      const ct = Number(updateData.confirmed_total ?? current.confirmed_total);
      const ca = Number(updateData.confirmed_abandoned ?? current.confirmed_abandoned);
      updateData.confirmed_abandoned = Math.min(ca, ct);
    }
  }

  // Buffer guard: reset if follow_ups >= 380
  if (updateData.follow_ups !== undefined && Number(updateData.follow_ups) >= 380) {
    updateData.buffer_approved = false;
    updateData.buffer_reason = null;
    updateData.buffer_proof_link = null;
    updateData.buffer_approved_by = null;
    updateData.buffer_approved_at = null;
  }

  const { error } = await admin.from("sales_daily_volume").update(updateData).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

// DELETE /api/sales/volume?id=xxx
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
  const { error } = await admin.from("sales_daily_volume").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted" });
}