import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { BirthdayList } from "./birthday-list";

export default async function BirthdaysPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser(supabase);

  if (!currentUser) redirect("/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Birthday tracker
        </h1>
        <p className="text-gray-500 mt-1">
          Upcoming birthdays across the company.
        </p>
      </div>

      <BirthdayList currentUserId={currentUser.id} />
    </div>
  );
}