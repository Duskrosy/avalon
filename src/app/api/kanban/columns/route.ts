import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isManagerOrAbove } from "@/lib/permissions";

// POST /api/kanban/columns — add a column
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { board_id, name } = body;

  if (!board_id || !name) {
    return NextResponse.json({ error: "Board ID and name are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: lastCol } = await admin
    .from("kanban_columns")
    .select("sort_order")
    .eq("board_id", board_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = lastCol ? lastCol.sort_order + 1 : 0;

  const { data, error } = await admin
    .from("kanban_columns")
    .insert({ board_id, name, sort_order: sortOrder })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ column: data });
}

// DELETE /api/kanban/columns?id=xxx
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

  const { error } = await admin.from("kanban_columns").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Column deleted" });
}