import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps, isManagerOrAbove } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PayoutsView } from "./payouts-view";

export default async function IncentivePayoutsPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Incentive payouts</h1>
        <p className="text-gray-500 mt-1">
          Final payout calculations — gate check, FPS brackets, stacked incentives.
        </p>
      </div>
      <PayoutsView isManager={isManagerOrAbove(currentUser)} isOps={isOps(currentUser)} />
    </div>
  );
}