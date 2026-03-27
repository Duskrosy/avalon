import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// GET /api/announcements
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  const admin = createAdminClient();

  let query = admin
    .from("announcements")
    .select(`
      *,
      author:profiles!announcements_created_by_fkey(first_name, last_name),
      department:departments(id, name, slug)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Filter: show global (department_id is null) + user's department
  if (!isOps(currentUser)) {
    query = query.or(`department_id.is.null,department_id.eq.${currentUser.department_id}`);
  }

  // Filter out expired announcements
  query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ announcements: data });
}

// POST /api/announcements
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, priority, department_id, expires_at } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  // Only OPS can post global announcements (department_id = null)
  if (!department_id && !isOps(currentUser)) {
    return NextResponse.json(
      { error: "Only OPS can post global announcements" },
      { status: 403 }
    );
  }

  // Managers can only post to their own department
  if (department_id && !isOps(currentUser) && department_id !== currentUser.department_id) {
    return NextResponse.json(
      { error: "You can only post to your own department" },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("announcements")
    .insert({
      title,
      content,
      priority: priority || "normal",
      department_id: department_id || null,
      expires_at: expires_at || null,
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify relevant users
  const notifQuery = admin
    .from("profiles")
    .select("id")
    .eq("is_active", true)
    .neq("id", currentUser.id);

  // If department-specific, only notify that department
  if (department_id) {
    notifQuery.eq("department_id", department_id);
  }

  const { data: targets } = await notifQuery;

  if (targets && targets.length > 0) {
    const notifications = targets.map((t) => ({
      user_id: t.id,
      type: "announcement",
      title: `New announcement: ${title}`,
      body: content.length > 100 ? content.substring(0, 100) + "..." : content,
      link: "/communications/announcements",
    }));

    await admin.from("notifications").insert(notifications);
  }

  return NextResponse.json({ announcement: data });
}

// DELETE /api/announcements?id=xxx
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

  // Check ownership — only author or OPS can delete
  const { data: announcement } = await admin
    .from("announcements")
    .select("created_by, department_id")
    .eq("id", id)
    .single();

  if (!announcement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isOps(currentUser) && announcement.created_by !== currentUser.id) {
    return NextResponse.json(
      { error: "You can only delete your own announcements" },
      { status: 403 }
    );
  }

  const { error } = await admin.from("announcements").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Announcement deleted" });
}