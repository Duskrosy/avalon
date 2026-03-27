import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// GET /api/permissions — get the full permission matrix
export async function GET() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [deptResult, mgResult, viewsResult, dvResult] = await Promise.all([
    supabase.from("departments").select("*").order("name"),
    supabase.from("master_groups").select("*").order("sort_order"),
    supabase.from("views").select("*").order("sort_order"),
    supabase.from("department_views").select("*"),
  ]);

  if (deptResult.error || mgResult.error || viewsResult.error || dvResult.error) {
    return NextResponse.json({ error: "Failed to load permissions" }, { status: 500 });
  }

  return NextResponse.json({
    departments: deptResult.data,
    masterGroups: mgResult.data,
    views: viewsResult.data,
    departmentViews: dvResult.data,
  });
}

// PATCH /api/permissions — update a department_view toggle
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { department_id, view_id, field, value } = body;

  if (!department_id || !view_id || !field || typeof value !== "boolean") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // OPS can toggle ops_allowed and manager_enabled
  // Managers can only toggle manager_enabled for their own department
  if (field === "ops_allowed" && !isOps(currentUser)) {
    return NextResponse.json(
      { error: "Only OPS can change allowed views" },
      { status: 403 }
    );
  }

  if (field === "manager_enabled") {
    if (!isManagerOrAbove(currentUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (!isOps(currentUser) && department_id !== currentUser.department_id) {
      return NextResponse.json(
        { error: "You can only configure your own department" },
        { status: 403 }
      );
    }
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("department_views")
    .update({ [field]: value })
    .eq("department_id", department_id)
    .eq("view_id", view_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Permission updated" });
}