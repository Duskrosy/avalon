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
      <div className="flex items-center justify-between mb-6">
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
<p className="text-red-500 text-xs">Debug: isOps = {String(userIsOps)}</p>
      {userIsOps && (
        <div className="flex gap-2 mb-6">
          <a
            href="/people/accounts"
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg"
          >
            Users
          </a>
          <a
            href="/people/accounts/permissions"
            className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            View permissions
          </a>
        </div>
      )}

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