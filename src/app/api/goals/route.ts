import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// GET /api/goals
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("department_id");
  const status = searchParams.get("status");

  const admin = createAdminClient();

  let query = admin
    .from("goals")
    .select(`
      *,
      creator:profiles!goals_created_by_fkey(first_name, last_name),
      department:departments(id, name, slug)
    `)
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!isOps(currentUser)) {
    query = query.or(`department_id.is.null,department_id.eq.${currentUser.department_id}`);
  } else if (departmentId && departmentId !== "all") {
    if (departmentId === "company") {
      query = query.is("department_id", null);
    } else {
      query = query.eq("department_id", departmentId);
    }
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goals: data });
}

// POST /api/goals
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, target_value, target_unit, metric_name, deadline, department_id } = body;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!department_id && !isOps(currentUser)) {
    return NextResponse.json({ error: "Only OPS can create company-wide goals" }, { status: 403 });
  }

  if (department_id && !isOps(currentUser) && department_id !== currentUser.department_id) {
    return NextResponse.json({ error: "You can only create goals for your department" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("goals")
    .insert({
      title,
      description: description || null,
      target_value: target_value ? Number(target_value) : null,
      target_unit: target_unit || null,
      metric_name: metric_name || null,
      deadline: deadline || null,
      department_id: department_id || null,
      status: "active",
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal: data });
}

// PATCH /api/goals — update status
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, status, title, description, target_value, target_unit, deadline } = body;

  if (!id) {
    return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updateData.status = status;
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (target_value !== undefined) updateData.target_value = target_value ? Number(target_value) : null;
  if (target_unit !== undefined) updateData.target_unit = target_unit;
  if (deadline !== undefined) updateData.deadline = deadline || null;

  const { error } = await admin.from("goals").update(updateData).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Goal updated" });
}

// DELETE /api/goals?id=xxx
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
  const { error } = await admin.from("goals").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Goal deleted" });
}