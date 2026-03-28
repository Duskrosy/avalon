import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// GET /api/learning/progress?department_id=xxx
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("department_id") || currentUser.department_id;

  if (!isOps(currentUser) && departmentId !== currentUser.department_id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Get employees in department
  const { data: employees } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .order("first_name");

  // Get materials visible to this department
  const { data: materials } = await admin
    .from("learning_materials")
    .select("id, title, material_type")
    .or(`department_id.is.null,department_id.eq.${departmentId}`)
    .order("sort_order")
    .order("created_at", { ascending: false });

  // Get all completions for these employees
  const employeeIds = (employees ?? []).map((e) => e.id);

  let completions: { user_id: string; material_id: string; completed_at: string }[] = [];

  if (employeeIds.length > 0) {
    const { data } = await admin
      .from("learning_completions")
      .select("user_id, material_id, completed_at")
      .in("user_id", employeeIds);

    completions = data ?? [];
  }

  return NextResponse.json({
    employees: employees ?? [],
    materials: materials ?? [],
    completions,
  });
}