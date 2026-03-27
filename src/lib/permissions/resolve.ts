import { SupabaseClient } from "@supabase/supabase-js";
import type { ResolvedView, ResolvedNavigation } from "./types";

export async function resolveUserViews(
  supabase: SupabaseClient,
  userId: string,
  departmentId: string
): Promise<ResolvedView[]> {
  // Fetch all three layers in parallel
  const [viewsResult, deptViewsResult, overridesResult] = await Promise.all([
    supabase
      .from("views")
      .select("id, slug, name, route, sort_order, master_group:master_groups(name, slug, icon, sort_order)")
      .order("sort_order"),
    supabase
      .from("department_views")
      .select("view_id, ops_allowed, manager_enabled")
      .eq("department_id", departmentId),
    supabase
      .from("user_view_overrides")
      .select("view_id, enabled")
      .eq("user_id", userId),
  ]);

  if (viewsResult.error) throw viewsResult.error;
  if (deptViewsResult.error) throw deptViewsResult.error;
  if (overridesResult.error) throw overridesResult.error;

  // Index for fast lookup
  const deptViewMap = new Map(
    deptViewsResult.data.map((dv) => [dv.view_id, dv])
  );
  const overrideMap = new Map(
    overridesResult.data.map((ov) => [ov.view_id, ov])
  );

  return viewsResult.data.map((view) => {
    const mg = view.master_group as unknown as {
      name: string;
      slug: string;
      icon: string | null;
      sort_order: number;
    };

    const override = overrideMap.get(view.id);
    const deptView = deptViewMap.get(view.id);

    let enabled = false;
    let source: ResolvedView["source"] = "default";

    // Tier 1: Check user-level override
    if (override) {
      enabled = override.enabled;
      source = "user_override";
    }
    // Tier 2: Check department-level settings
    else if (deptView) {
      enabled = deptView.ops_allowed && deptView.manager_enabled;
      source = "department";
    }
    // Tier 3: Default — disabled
    // (already set above)

    return {
      viewId: view.id,
      viewSlug: view.slug,
      viewName: view.name,
      route: view.route,
      masterGroupSlug: mg.slug,
      masterGroupName: mg.name,
      enabled,
      source,
    };
  });
}

export function buildNavigation(
  resolvedViews: ResolvedView[]
): ResolvedNavigation {
  const enabledViews = resolvedViews.filter((v) => v.enabled);

  const grouped = new Map<
    string,
    {
      masterGroup: { name: string; slug: string; icon: string | null };
      views: { name: string; slug: string; route: string }[];
    }
  >();

  for (const view of enabledViews) {
    if (!grouped.has(view.masterGroupSlug)) {
      grouped.set(view.masterGroupSlug, {
        masterGroup: {
          name: view.masterGroupName,
          slug: view.masterGroupSlug,
          icon: null,
        },
        views: [],
      });
    }
    grouped.get(view.masterGroupSlug)!.views.push({
      name: view.viewName,
      slug: view.viewSlug,
      route: view.route,
    });
  }

  return Array.from(grouped.values());
}

export async function canAccessView(
  supabase: SupabaseClient,
  userId: string,
  departmentId: string,
  viewSlug: string
): Promise<boolean> {
  const views = await resolveUserViews(supabase, userId, departmentId);
  const target = views.find((v) => v.viewSlug === viewSlug);
  return target?.enabled ?? false;
}