import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps } from "@/lib/permissions";

// GET /api/permissions/groups — get master group level permissions
export async function GET() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("department_master_groups")
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deptMasterGroups: data });
}

// PATCH /api/permissions/groups — toggle a master group for a department
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    return NextResponse.json({ error: "Only OPS can manage permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { department_id, master_group_id, enabled } = body;

  if (!department_id || !master_group_id || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Update the master group toggle
  const { error: mgError } = await admin
    .from("department_master_groups")
    .update({ enabled })
    .eq("department_id", department_id)
    .eq("master_group_id", master_group_id);

  if (mgError) {
    return NextResponse.json({ error: mgError.message }, { status: 500 });
  }

  // Sync all views in this group to match
  // Get all view IDs in this master group
  const { data: views } = await admin
    .from("views")
    .select("id")
    .eq("master_group_id", master_group_id);

  if (views && views.length > 0) {
    for (const view of views) {
      await admin
        .from("department_views")
        .update({ ops_allowed: enabled, manager_enabled: enabled })
        .eq("department_id", department_id)
        .eq("view_id", view.id);
    }
  }

  return NextResponse.json({ message: "Permission updated" });
}