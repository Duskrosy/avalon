import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/permissions";

// GET /api/learning/complete — get user's completions
export async function GET() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("learning_completions")
    .select("material_id, completed_at")
    .eq("user_id", currentUser.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ completions: data });
}

// POST /api/learning/complete — toggle completion
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { material_id } = body;

  if (!material_id) {
    return NextResponse.json({ error: "Missing material_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if already completed
  const { data: existing } = await admin
    .from("learning_completions")
    .select("id")
    .eq("user_id", currentUser.id)
    .eq("material_id", material_id)
    .single();

  if (existing) {
    // Uncomplete — remove it
    await admin
      .from("learning_completions")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("material_id", material_id);

    return NextResponse.json({ completed: false });
  }

  // Mark complete
  const { error } = await admin.from("learning_completions").insert({
    user_id: currentUser.id,
    material_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ completed: true });
}