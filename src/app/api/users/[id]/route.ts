import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// PATCH /api/users/[id] — update a user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { first_name, last_name, department_id, role_id, birthday, phone } =
    body;

  // Check the target user exists and get their department
  const admin = createAdminClient();
  const { data: targetUser } = await admin
    .from("profiles")
    .select("department_id")
    .eq("id", id)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Managers can only edit users in their own department
  if (!isOps(currentUser) && targetUser.department_id !== currentUser.department_id) {
    return NextResponse.json(
      { error: "You can only edit users in your own department" },
      { status: 403 }
    );
  }

  // Managers cannot assign OPS-tier roles
  if (!isOps(currentUser) && role_id) {
    const { data: targetRole } = await supabase
      .from("roles")
      .select("tier")
      .eq("id", role_id)
      .single();

    if (targetRole && targetRole.tier === 1) {
      return NextResponse.json(
        { error: "You cannot assign OPS-level roles" },
        { status: 403 }
      );
    }
  }

  // Only OPS can change someone's department
  if (!isOps(currentUser) && department_id && department_id !== currentUser.department_id) {
    return NextResponse.json(
      { error: "Only OPS can transfer users between departments" },
      { status: 403 }
    );
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (first_name !== undefined) updateData.first_name = first_name;
  if (last_name !== undefined) updateData.last_name = last_name;
  if (department_id !== undefined) updateData.department_id = department_id;
  if (role_id !== undefined) updateData.role_id = role_id;
  if (birthday !== undefined) updateData.birthday = birthday;
  if (phone !== undefined) updateData.phone = phone;

  const { error } = await admin
    .from("profiles")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "User updated successfully" });
}

// DELETE /api/users/[id] — deactivate a user (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    return NextResponse.json(
      { error: "Only OPS can deactivate users" },
      { status: 403 }
    );
  }

  // Don't let OPS deactivate themselves
  if (id === currentUser.id) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "User deactivated successfully" });
}