import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/permissions";

// GET /api/sales/agents — list all active Sales department users
export async function GET() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: salesDept } = await admin
    .from("departments")
    .select("id")
    .eq("slug", "sales")
    .single();

  if (!salesDept) {
    return NextResponse.json({ error: "Sales department not found" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("department_id", salesDept.id)
    .eq("is_active", true)
    .order("first_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agents: data });
}