import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps } from "@/lib/permissions";

// GET /api/permissions/users?department_id=xxx
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("department_id");

  if (!departmentId) {
    return NextResponse.json({ error: "department_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get users in department
  const { data: users } = await admin
    .from("profiles")
    .select("id, first_name, last_name, role:roles(id, name, slug, tier)")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .order("first_name");

  // Get all overrides for these users
  const userIds = (users ?? []).map(u => u.id);
  let overrides: { user_id: string; view_id: string; enabled: boolean }[] = [];

  if (userIds.length > 0) {
    const { data } = await admin
      .from("user_view_overrides")
      .select("user_id, view_id, enabled")
      .in("user_id", userIds);
    overrides = data ?? [];
  }

  return NextResponse.json({ users: users ?? [], overrides });
}

// PATCH /api/permissions/users — set a user override
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { user_id, view_id, enabled } = body;

  if (!user_id || !view_id || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert the override
  const { error } = await admin
    .from("user_view_overrides")
    .upsert(
      { user_id, view_id, enabled, set_by: currentUser.id },
      { onConflict: "user_id,view_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Override set" });
}

// DELETE /api/permissions/users — remove override (revert to department default)
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");
  const viewId = searchParams.get("view_id");

  if (!userId || !viewId) {
    return NextResponse.json({ error: "user_id and view_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  await admin
    .from("user_view_overrides")
    .delete()
    .eq("user_id", userId)
    .eq("view_id", viewId);

  return NextResponse.json({ message: "Override removed" });
}

// POST /api/permissions/users — bulk set overrides (by role)
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { user_ids, view_id, enabled } = body;

  if (!user_ids || !Array.isArray(user_ids) || !view_id || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  const records = user_ids.map((uid: string) => ({
    user_id: uid,
    view_id,
    enabled,
    set_by: currentUser.id,
  }));

  const { error } = await admin
    .from("user_view_overrides")
    .upsert(records, { onConflict: "user_id,view_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `${user_ids.length} overrides set` });
}