import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions";

// GET /api/directory
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("department_id");

  let query = supabase
    .from("profiles")
    .select(`
      id, first_name, last_name, email, phone, birthday, avatar_url,
      department:departments(id, name, slug),
      role:roles(id, name, slug, tier)
    `)
    .eq("is_active", true)
    .order("first_name");

  if (!isOps(currentUser)) {
    query = query.eq("department_id", currentUser.department_id);
  } else if (departmentId && departmentId !== "all") {
    query = query.eq("department_id", departmentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ employees: data });
}