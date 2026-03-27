import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions/get-user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  if (!user) redirect("/login");

  const greeting = getGreeting();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {greeting}, {user.first_name}
        </h1>
        <p className="text-gray-500 mt-1">
          {isOps(user)
            ? "Here's an overview of all departments."
            : `Here's your ${user.department.name} dashboard.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending leaves" value="—" />
        <StatCard label="Active tasks" value="—" />
        <StatCard label="Open goals" value="—" />
        <StatCard label="Unread notifications" value="—" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Dashboard widgets will populate here as views are enabled and data flows in.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}