import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// GET /api/kops — list KOPs or get single KOP with versions
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const departmentId = searchParams.get("department_id");
  const category = searchParams.get("category");

  const admin = createAdminClient();

  // Single KOP with versions
  if (id) {
    const { data: kop, error } = await admin
      .from("kops")
      .select(`
        *,
        author:profiles!kops_created_by_fkey(first_name, last_name),
        department:departments(id, name, slug),
        versions:kop_versions(
          *,
          uploader:profiles!kop_versions_uploaded_by_fkey(first_name, last_name)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (kop.department_id && !isOps(currentUser) && kop.department_id !== currentUser.department_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Sort versions descending
    if (kop.versions) {
      (kop.versions as unknown[]).sort(
        (a: unknown, b: unknown) =>
          ((b as { version_number: number }).version_number) -
          ((a as { version_number: number }).version_number)
      );
    }

    return NextResponse.json({ kop });
  }

  // List KOPs
  let query = admin
    .from("kops")
    .select(`
      *,
      author:profiles!kops_created_by_fkey(first_name, last_name),
      department:departments(id, name, slug)
    `)
    .order("updated_at", { ascending: false });

  if (!isOps(currentUser)) {
    query = query.or(`department_id.is.null,department_id.eq.${currentUser.department_id}`);
  } else if (departmentId && departmentId !== "all") {
    if (departmentId === "global") {
      query = query.is("department_id", null);
    } else {
      query = query.eq("department_id", departmentId);
    }
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kops: data });
}

// POST /api/kops — create a new KOP
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const departmentId = formData.get("department_id") as string;
  const file = formData.get("file") as File | null;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!departmentId && !isOps(currentUser)) {
    return NextResponse.json({ error: "Only OPS can create global KOPs" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Create the KOP entry
  const { data: kop, error: kopError } = await admin
    .from("kops")
    .insert({
      title,
      description: description || null,
      category: category || null,
      department_id: departmentId || null,
      created_by: currentUser.id,
      current_version: 1,
    })
    .select()
    .single();

  if (kopError) {
    return NextResponse.json({ error: kopError.message }, { status: 500 });
  }

  // Upload file if provided
  let fileUrl = "";
  let fileType = "";

  if (file) {
    const ext = file.name.split(".").pop();
    const path = `${kop.id}/v1/${file.name}`;

    const { error: uploadError } = await admin.storage
      .from("kops")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    fileUrl = path;
    fileType = ext || file.type;
  }

  // Create version 1
  if (fileUrl) {
    await admin.from("kop_versions").insert({
      kop_id: kop.id,
      version_number: 1,
      file_url: fileUrl,
      file_type: fileType,
      change_notes: "Initial version",
      uploaded_by: currentUser.id,
    });
  }

  return NextResponse.json({ kop });
}