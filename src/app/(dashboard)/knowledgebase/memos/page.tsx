import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { MemosList } from "./memos-list";
import { CreateMemoForm } from "./create-memo-form";

export default async function MemosPage() {
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
        <h1 className="text-2xl font-semibold text-gray-900">Memos</h1>
        <p className="text-gray-500 mt-1">
          Official memos with signature tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MemosList currentUserId={currentUser.id} />
        </div>
        {userIsManager && (
          <div>
            <CreateMemoForm
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