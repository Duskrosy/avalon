import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { LeaveRequestForm } from "./leave-request-form";
import { LeavesList } from "./leaves-list";

export default async function LeavesPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  const userIsOps = isOps(currentUser);
  const userIsManager = isManagerOrAbove(currentUser);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Leaves and absences
        </h1>
        <p className="text-gray-500 mt-1">
          {userIsOps
            ? "View and approve leave requests across all departments."
            : userIsManager
            ? "Manage leave requests for your department."
            : "Submit and track your leave requests."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LeavesList
            currentUserId={currentUser.id}
            isOps={userIsOps}
            isManager={userIsManager}
          />
        </div>
        <div>
          <LeaveRequestForm />
        </div>
      </div>
    </div>
  );
}