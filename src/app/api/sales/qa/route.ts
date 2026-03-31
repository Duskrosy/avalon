import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isManagerOrAbove } from "@/lib/permissions";

// GET /api/sales/qa?agent_id=&month=YYYY-MM&tier=
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");
  const month = searchParams.get("month");
  const tier = searchParams.get("tier");

  const admin = createAdminClient();

  let query = admin
    .from("sales_qa_log")
    .select(`*, agent:profiles!sales_qa_log_agent_id_fkey(id, first_name, last_name, email)`)
    .order("qa_date", { ascending: false })
    .order("agent_id");

  if (agentId && agentId !== "all") query = query.eq("agent_id", agentId);
  if (month) {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    query = query.gte("qa_date", `${month}-01`).lte("qa_date", `${month}-${String(lastDay).padStart(2, "0")}`);
  }
  if (tier && tier !== "all") query = query.eq("qa_tier", tier);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data });
}

// POST /api/sales/qa
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { agent_id, qa_date, message_link, qa_tier, qa_reason, evaluator, notes } = body;

  if (!agent_id || !qa_date || !message_link || !qa_tier || !qa_reason || !evaluator) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate URL
  try {
    const url = new URL(message_link.trim());
    if (!url.hostname) throw new Error();
  } catch {
    return NextResponse.json({ error: "Please enter a valid URL for the message link" }, { status: 400 });
  }

  // Validate tier
  if (!["Tier 3", "Tier 2", "Tier 1", "Fail"].includes(qa_tier)) {
    return NextResponse.json({ error: "Invalid QA tier" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sales_qa_log")
    .insert({
      agent_id,
      qa_date,
      message_link: message_link.trim(),
      qa_tier,
      qa_reason: qa_reason.trim(),
      evaluator: evaluator.trim(),
      notes: notes?.trim() || null,
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return NextResponse.json({ error: "A QA entry already exists for this agent on this date. One check per agent per day." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

// PATCH /api/sales/qa
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
  const allowed = ["agent_id", "qa_date", "message_link", "qa_tier", "qa_reason", "evaluator", "notes"];

  for (const key of allowed) {
    if (fields[key] !== undefined) updateData[key] = typeof fields[key] === "string" ? fields[key].trim() : fields[key];
  }

  const { error } = await admin.from("sales_qa_log").update(updateData).eq("id", id);

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return NextResponse.json({ error: "A QA entry already exists for this agent on this date." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Updated" });
}

// DELETE /api/sales/qa?id=xxx
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
  const { error } = await admin.from("sales_qa_log").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted" });
}