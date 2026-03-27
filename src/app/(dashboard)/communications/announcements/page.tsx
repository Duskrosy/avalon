import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AnnouncementsFeed } from "./announcements-feed";
import { AnnouncementComposer } from "./announcement-composer";

export default async function AnnouncementsPage() {
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
        <h1 className="text-2xl font-semibold text-gray-900">Announcements</h1>
        <p className="text-gray-500 mt-1">
          {userIsOps
            ? "Company-wide and department announcements."
            : "Announcements for your team and company."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnnouncementsFeed
            currentUserId={currentUser.id}
            isOps={userIsOps}
            isManager={userIsManager}
          />
        </div>
        {userIsManager && (
          <div>
            <AnnouncementComposer
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