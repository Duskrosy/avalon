import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { FpsDailyView } from "./fps-daily-view";

export default async function FpsDailyPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">FPS daily score</h1>
        <p className="text-gray-500 mt-1">
          Computed daily performance score — volume points + QA points. Read-only.
        </p>
      </div>
      <FpsDailyView />
    </div>
  );
}