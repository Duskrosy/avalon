import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { GoalsList } from "./goals-list";
import { CreateGoalForm } from "./create-goal-form";

export default async function GoalsPage() {
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
          Goals and deadlines
        </h1>
        <p className="text-gray-500 mt-1">
          {userIsOps
            ? "Track company-wide and department goals."
            : "Track your department's goals and deadlines."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GoalsList
            isOps={userIsOps}
            isManager={userIsManager}
            departments={departments ?? []}
          />
        </div>
        {userIsManager && (
          <div>
            <CreateGoalForm
              isOps={userIsOps}
              currentDepartmentId={currentUser.department_id}
              departments={departments ?? []}
            />
          </div>
        )}
      </div>
    </div>
  );
}