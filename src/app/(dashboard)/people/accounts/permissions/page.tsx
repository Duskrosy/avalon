import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PermissionsMatrix } from "./permissions-matrix";
import { UserOverrides } from "./user-overrides";

export default async function PermissionsPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    redirect("/");
  }

  // Fetch static data server-side for UserOverrides
  const [deptResult, mgResult, viewsResult] = await Promise.all([
    supabase.from("departments").select("id, name, slug").order("name"),
    supabase.from("master_groups").select("id, name, slug, sort_order").order("sort_order"),
    supabase.from("views").select("id, master_group_id, name, slug, sort_order").order("sort_order"),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          View permissions
        </h1>
        <p className="text-gray-500 mt-1">
          Control which views each department can access. Toggle &quot;Allowed&quot; to
          make a view available to a department. Toggle &quot;Enabled&quot; to activate it.
        </p>
      </div>

      <PermissionsMatrix />

      <UserOverrides
        departments={deptResult.data ?? []}
        masterGroups={mgResult.data ?? []}
        views={viewsResult.data ?? []}
      />
    </div>
  );
}