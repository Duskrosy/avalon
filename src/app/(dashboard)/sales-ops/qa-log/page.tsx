import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { QaLogView } from "./qa-log-view";

export default async function QaLogPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">QA log</h1>
        <p className="text-gray-500 mt-1">
          QA evaluations per agent per day — tier-based scoring with fail detection.
        </p>
      </div>

      <QaLogView isManager={isManagerOrAbove(currentUser)} />
    </div>
  );
}