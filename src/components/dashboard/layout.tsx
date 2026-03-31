import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions/get-user";
import { resolveUserViews, buildNavigation } from "@/lib/permissions/resolve";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

async function getBirthdayBanner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  currentUserId: string
) {
  const today = new Date();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, birthday")
    .eq("is_active", true)
    .not("birthday", "is", null);

  if (!profiles) return null;

  let closest: { name: string; daysUntil: number } | null = null;

  for (const p of profiles) {
    if (p.id === currentUserId || !p.birthday) continue;

    const bday = new Date(p.birthday);
    const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

    if (thisYear < today) {
      thisYear.setFullYear(today.getFullYear() + 1);
    }

    const diffDays = Math.ceil(
      (thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays <= 7 && (!closest || diffDays < closest.daysUntil)) {
      closest = { name: p.first_name, daysUntil: diffDays };
    }
  }

  return closest;
}

async function getUnreadCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return count ?? 0;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login");
  }

  const [resolvedViews, unreadCount, birthdayBanner] = await Promise.all([
    resolveUserViews(supabase, user.id, user.department_id),
    getUnreadCount(supabase, user.id),
    getBirthdayBanner(supabase, user.id),
  ]);

  const navigation = buildNavigation(resolvedViews);
  const userName = `${user.first_name} ${user.last_name}`;
  const userIsOps = user.role.tier === 1;

  // Get all departments for OPS sidebar sub-items
  let departments: { name: string; slug: string }[] = [];
  if (userIsOps) {
    const { data: depts } = await supabase
      .from("departments")
      .select("name, slug")
      .neq("slug", "ops")
      .order("name");
    departments = depts ?? [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        navigation={navigation}
        userName={userName}
        departmentName={user.department.name}
        isOps={userIsOps}
        departments={departments}
      />
      <div className="ml-64">
        <Topbar unreadCount={unreadCount} birthdayBanner={birthdayBanner} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}