import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/permissions";

// POST /api/kanban/cards — create a card
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { column_id, title, description, assigned_to, due_date, priority } = body;

  if (!column_id || !title) {
    return NextResponse.json({ error: "Column and title are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get max sort_order in this column
  const { data: lastCard } = await admin
    .from("kanban_cards")
    .select("sort_order")
    .eq("column_id", column_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = lastCard ? lastCard.sort_order + 1 : 0;

  const { data, error } = await admin
    .from("kanban_cards")
    .insert({
      column_id,
      title,
      description: description || null,
      assigned_to: assigned_to || null,
      due_date: due_date || null,
      priority: priority || "medium",
      sort_order: sortOrder,
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify assignee if different from creator
  if (assigned_to && assigned_to !== currentUser.id) {
    await admin.from("notifications").insert({
      user_id: assigned_to,
      type: "task_assigned",
      title: `New task: ${title}`,
      body: `${currentUser.first_name} ${currentUser.last_name} assigned you a task.`,
      link: "/productivity/kanban",
    });
  }

  return NextResponse.json({ card: data });
}

// PATCH /api/kanban/cards — update a card (move, edit)
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, column_id, title, description, assigned_to, due_date, priority, sort_order } = body;

  if (!id) {
    return NextResponse.json({ error: "Card id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (column_id !== undefined) updateData.column_id = column_id;
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (assigned_to !== undefined) updateData.assigned_to = assigned_to || null;
  if (due_date !== undefined) updateData.due_date = due_date || null;
  if (priority !== undefined) updateData.priority = priority;
  if (sort_order !== undefined) updateData.sort_order = sort_order;

  const { error } = await admin
    .from("kanban_cards")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Card updated" });
}

// DELETE /api/kanban/cards?id=xxx
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin.from("kanban_cards").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Card deleted" });
}