import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { LearningTabs } from "./learning-tabs";

export default async function LearningPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  const userIsOps = isOps(currentUser);
  const userIsManager = isManagerOrAbove(currentUser);

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, slug")
    .order("name");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Learning materials
        </h1>
        <p className="text-gray-500 mt-1">
          Videos, documents, and resources for training and development.
        </p>
      </div>

      <LearningTabs
        isOps={userIsOps}
        isManager={userIsManager}
        currentDepartmentId={currentUser.department_id}
        departments={departments ?? []}
      />
    </div>
  );
}