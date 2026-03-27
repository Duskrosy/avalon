import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { UserList } from "./user-list";
import { CreateUserForm } from "./create-user-form";

export default async function AccountsPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser || !isManagerOrAbove(currentUser)) {
    redirect("/");
  }

  const userIsOps = isOps(currentUser);

  // Fetch departments and roles for the create form
  const [deptResult, rolesResult] = await Promise.all([
    supabase.from("departments").select("id, name, slug").order("name"),
    supabase.from("roles").select("id, name, slug, tier").order("tier"),
  ]);

  const departments = deptResult.data ?? [];
  const roles = userIsOps
    ? rolesResult.data ?? []
    : (rolesResult.data ?? []).filter((r) => r.tier > 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            User accounts
          </h1>
          <p className="text-gray-500 mt-1">
            {userIsOps
              ? "Manage all users across departments."
              : `Manage users in ${currentUser.department.name}.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UserList
            currentUserId={currentUser.id}
            isOps={userIsOps}
            departments={departments}
            roles={roles}
          />
        </div>
        <div>
          <CreateUserForm
            departments={departments}
            roles={roles}
            isOps={userIsOps}
            currentDepartmentId={currentUser.department_id}
          />
        </div>
      </div>
    </div>
  );
}