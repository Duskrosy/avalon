import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/setup
// Creates the first OPS owner account
// Run this ONCE, then delete this file
export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, first_name, last_name } = body;

  if (!email || !password || !first_name || !last_name) {
    return NextResponse.json(
      { error: "Missing required fields: email, password, first_name, last_name" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // 1. Create the auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // 2. Get OPS department and Owner role IDs
  const { data: dept } = await supabase
    .from("departments")
    .select("id")
    .eq("slug", "ops")
    .single();

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("slug", "owner")
    .single();

  if (!dept || !role) {
    return NextResponse.json(
      { error: "Seed data missing — departments or roles table is empty" },
      { status: 500 }
    );
  }

  // 3. Create the profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    department_id: dept.id,
    role_id: role.id,
    first_name,
    last_name,
    email,
  });

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Owner account created successfully",
    user_id: authData.user.id,
  });
}