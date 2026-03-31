import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { DowntimeView } from "./downtime-view";

export default async function DowntimeLogPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Downtime log</h1>
        <p className="text-gray-500 mt-1">
          Operational downtime records affecting agent performance.
        </p>
      </div>
      <DowntimeView isManager={isManagerOrAbove(currentUser)} currentUserId={currentUser.id} />
    </div>
  );
}