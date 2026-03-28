import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { KanbanBoard } from "./kanban-board";

export default async function KanbanPage() {
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
        <h1 className="text-2xl font-semibold text-gray-900">Kanban board</h1>
        <p className="text-gray-500 mt-1">
          {userIsOps
            ? "Manage tasks across all departments."
            : "Manage your team's tasks."}
        </p>
      </div>

      <KanbanBoard
        isOps={userIsOps}
        currentUserId={currentUser.id}
        currentDepartmentId={currentUser.department_id}
        departments={departments ?? []}
      />
    </div>
  );
}