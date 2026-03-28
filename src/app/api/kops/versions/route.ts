import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, isManagerOrAbove } from "@/lib/permissions";

// POST /api/kops/versions — upload a new version
export async function POST(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const kopId = formData.get("kop_id") as string;
  const changeNotes = formData.get("change_notes") as string;
  const file = formData.get("file") as File | null;

  if (!kopId || !file) {
    return NextResponse.json({ error: "KOP ID and file are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get current KOP
  const { data: kop } = await admin
    .from("kops")
    .select("id, current_version")
    .eq("id", kopId)
    .single();

  if (!kop) {
    return NextResponse.json({ error: "KOP not found" }, { status: 404 });
  }

  const newVersion = kop.current_version + 1;
  const ext = file.name.split(".").pop();
  const path = `${kopId}/v${newVersion}/${file.name}`;

  // Upload file
  const { error: uploadError } = await admin.storage
    .from("kops")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Create version record
  const { error: versionError } = await admin.from("kop_versions").insert({
    kop_id: kopId,
    version_number: newVersion,
    file_url: path,
    file_type: ext || file.type,
    change_notes: changeNotes || null,
    uploaded_by: currentUser.id,
  });

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 });
  }

  // Update current_version on KOP
  await admin
    .from("kops")
    .update({ current_version: newVersion, updated_at: new Date().toISOString() })
    .eq("id", kopId);

  return NextResponse.json({ message: "Version uploaded", version: newVersion });
}

// GET /api/kops/versions?path=xxx — get a signed download URL
export async function GET(request: Request) {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from("kops")
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}