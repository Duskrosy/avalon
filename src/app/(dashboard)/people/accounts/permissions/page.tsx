import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PermissionsMatrix } from "./permissions-matrix";

export default async function PermissionsPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isOps(currentUser)) {
    redirect("/");
  }

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
    </div>
  );
}