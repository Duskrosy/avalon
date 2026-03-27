import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { DirectoryList } from "./directory-list";

export default async function DirectoryPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  const userIsOps = isOps(currentUser);

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, slug")
    .order("name");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Employee directory
        </h1>
        <p className="text-gray-500 mt-1">
          {userIsOps
            ? "All active employees across departments."
            : `Your ${currentUser.department.name} team.`}
        </p>
      </div>

      <DirectoryList
        isOps={userIsOps}
        departments={departments ?? []}
      />
    </div>
  );
}