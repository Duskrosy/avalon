import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// GET /api/memos
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const admin = createAdminClient();

  // Single memo with signatures
  if (id) {
    const { data: memo, error } = await admin
      .from("memos")
      .select(`
        *,
        author:profiles!memos_created_by_fkey(first_name, last_name),
        department:departments(id, name, slug),
        signatures:memo_signatures(
          id,
          signed_at,
          signer:profiles!memo_signatures_user_id_fkey(id, first_name, last_name)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check access: global memos or user's department
    if (memo.department_id && !isOps(currentUser) && memo.department_id !== currentUser.department_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get list of people who should sign (same department or all if global)
    let targetQuery = admin
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("is_active", true);

    if (memo.department_id) {
      targetQuery = targetQuery.eq("department_id", memo.department_id);
    }

    const { data: targets } = await targetQuery;

    return NextResponse.json({ memo, targets: targets ?? [] });
  }

  // List memos
  let query = admin
    .from("memos")
    .select(`
      *,
      author:profiles!memos_created_by_fkey(first_name, last_name),
      department:departments(id, name, slug),
      signatures:memo_signatures(id)
    `)
    .order("created_at", { ascending: false });

  if (!isOps(currentUser)) {
    query = query.or(`department_id.is.null,department_id.eq.${currentUser.department_id}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ memos: data });
}

// POST /api/memos — create a memo
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, department_id } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  if (!department_id && !isOps(currentUser)) {
    return NextResponse.json({ error: "Only OPS can create global memos" }, { status: 403 });
  }

  if (department_id && !isOps(currentUser) && department_id !== currentUser.department_id) {
    return NextResponse.json({ error: "You can only create memos for your department" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("memos")
    .insert({
      title,
      content,
      department_id: department_id || null,
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify relevant users
  let notifQuery = admin
    .from("profiles")
    .select("id")
    .eq("is_active", true)
    .neq("id", currentUser.id);

  if (department_id) {
    notifQuery = notifQuery.eq("department_id", department_id);
  }

  const { data: targets } = await notifQuery;

  if (targets && targets.length > 0) {
    await admin.from("notifications").insert(
      targets.map((t) => ({
        user_id: t.id,
        type: "memo",
        title: `New memo: ${title}`,
        body: "Please review and sign.",
        link: `/knowledgebase/memos/${data.id}`,
      }))
    );
  }

  return NextResponse.json({ memo: data });
}