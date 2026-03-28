import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";

// GET /api/learning
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("department_id");
  const type = searchParams.get("type");

  const admin = createAdminClient();

  let query = admin
    .from("learning_materials")
    .select(`
      *,
      author:profiles!learning_materials_created_by_fkey(first_name, last_name),
      department:departments(id, name, slug)
    `)
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (!isOps(currentUser)) {
    query = query.or(`department_id.is.null,department_id.eq.${currentUser.department_id}`);
  } else if (departmentId && departmentId !== "all") {
    if (departmentId === "global") {
      query = query.is("department_id", null);
    } else {
      query = query.eq("department_id", departmentId);
    }
  }

  if (type && type !== "all") {
    query = query.eq("material_type", type);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ materials: data });
}

// POST /api/learning
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const materialType = formData.get("material_type") as string;
  const departmentId = formData.get("department_id") as string;
  const externalLink = formData.get("external_link") as string;
  const file = formData.get("file") as File | null;

  if (!title || !materialType) {
    return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
  }

  if (materialType === "link" && !externalLink) {
    return NextResponse.json({ error: "External link is required for link type" }, { status: 400 });
  }

  if (materialType !== "link" && !file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (!departmentId && !isOps(currentUser)) {
    return NextResponse.json({ error: "Only OPS can create global materials" }, { status: 403 });
  }

  const admin = createAdminClient();

  let fileUrl = null;

  if (file) {
    const ext = file.name.split(".").pop();
    const timestamp = Date.now();
    const path = `${departmentId || "global"}/${timestamp}-${file.name}`;

    const { error: uploadError } = await admin.storage
      .from("learning")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    fileUrl = path;
  }

  const { data, error } = await admin
    .from("learning_materials")
    .insert({
      title,
      description: description || null,
      material_type: materialType,
      department_id: departmentId || null,
      file_url: fileUrl,
      external_link: externalLink || null,
      created_by: currentUser.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ material: data });
}

// DELETE /api/learning?id=xxx
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

  // Delete file from storage if exists
  const { data: material } = await admin
    .from("learning_materials")
    .select("file_url")
    .eq("id", id)
    .single();

  if (material?.file_url) {
    await admin.storage.from("learning").remove([material.file_url]);
  }

  const { error } = await admin.from("learning_materials").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Material deleted" });
}