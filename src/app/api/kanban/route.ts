import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps } from "@/lib/permissions";

// GET /api/kanban?department_id=xxx
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("department_id") || currentUser.department_id;

  // Non-OPS can only see their own department
  if (!isOps(currentUser) && departmentId !== currentUser.department_id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Get or create a board for this department
  let { data: board } = await admin
    .from("kanban_boards")
    .select("id")
    .eq("department_id", departmentId)
    .limit(1)
    .single();

  if (!board) {
    // Auto-create a board with default columns
    const { data: newBoard } = await admin
      .from("kanban_boards")
      .insert({
        department_id: departmentId,
        name: "Main Board",
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (!newBoard) {
      return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
    }

    // Create default columns
    await admin.from("kanban_columns").insert([
      { board_id: newBoard.id, name: "To do", sort_order: 0 },
      { board_id: newBoard.id, name: "In progress", sort_order: 1 },
      { board_id: newBoard.id, name: "Review", sort_order: 2 },
      { board_id: newBoard.id, name: "Done", sort_order: 3 },
    ]);

    board = newBoard;
  }

  // Fetch columns and cards
  const { data: columns } = await admin
    .from("kanban_columns")
    .select(`
      *,
      cards:kanban_cards(
        *,
        assignee:profiles!kanban_cards_assigned_to_fkey(id, first_name, last_name)
      )
    `)
    .eq("board_id", board.id)
    .order("sort_order");

  // Sort cards within each column
  const sortedColumns = (columns ?? []).map((col) => ({
    ...col,
    cards: ((col.cards as unknown[]) ?? []).sort(
      (a: unknown, b: unknown) => ((a as { sort_order: number }).sort_order) - ((b as { sort_order: number }).sort_order)
    ),
  }));

  // Get department members for assignment
  const { data: members } = await admin
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .order("first_name");

  return NextResponse.json({
    board_id: board.id,
    columns: sortedColumns,
    members: members ?? [],
  });
}