import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isOps } from "@/lib/permissions/get-user";
import { redirect } from "next/navigation";
import { SalesDashboard } from "@/components/dashboard/sales-dashboard";

export default async function DepartmentDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  if (!user) redirect("/login");

  // Only OPS can view other department dashboards
  if (!isOps(user)) redirect("/");

  // Get department name
  const { data: dept } = await supabase
    .from("departments")
    .select("name, slug")
    .eq("slug", slug)
    .single();

  if (!dept) redirect("/");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {dept.name} dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Viewing {dept.name} department metrics as OPS.
        </p>
      </div>

      {slug === "sales" ? (
        <SalesDashboard />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">
            {dept.name} department dashboard will be available when their specific modules are built.
          </p>
        </div>
      )}
    </div>
  );
}