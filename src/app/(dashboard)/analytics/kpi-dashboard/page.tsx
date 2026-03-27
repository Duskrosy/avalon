import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { KpiOverview } from "./kpi-overview";
import { KpiEntryForm } from "./kpi-entry-form";
import { KpiEntriesTable } from "./kpi-entries-table";

export default async function KpiDashboardPage() {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            KPI dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            {userIsOps
              ? "Company-wide performance metrics across all departments."
              : `Performance metrics for ${currentUser.department.name}.`}
          </p>
        </div>
      </div>

      <KpiOverview
        isOps={userIsOps}
        currentDepartmentId={currentUser.department_id}
        departments={departments ?? []}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <KpiEntriesTable
            isOps={userIsOps}
            currentDepartmentId={currentUser.department_id}
            departments={departments ?? []}
          />
        </div>
        <div>
          <KpiEntryForm
            isOps={userIsOps}
            currentDepartmentId={currentUser.department_id}
            departments={departments ?? []}
          />
        </div>
      </div>
    </div>
  );
}