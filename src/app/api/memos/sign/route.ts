import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/permissions";

// POST /api/memos/sign — sign a memo
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { memo_id } = body;

  if (!memo_id) {
    return NextResponse.json({ error: "Missing memo_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if already signed
  const { data: existing } = await admin
    .from("memo_signatures")
    .select("id")
    .eq("memo_id", memo_id)
    .eq("user_id", currentUser.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "You have already signed this memo" }, { status: 409 });
  }

  const { data, error } = await admin
    .from("memo_signatures")
    .insert({
      memo_id,
      user_id: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ signature: data });
}