"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Department = { id: string; name: string; slug: string };
type MasterGroup = { id: string; name: string; slug: string; sort_order: number };
type View = { id: string; master_group_id: string; name: string; slug: string; sort_order: number };
type DeptMasterGroup = { department_id: string; master_group_id: string; enabled: boolean };
type DeptView = { department_id: string; view_id: string; ops_allowed: boolean; manager_enabled: boolean };

export function PermissionsMatrix() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [masterGroups, setMasterGroups] = useState<MasterGroup[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [deptMasterGroups, setDeptMasterGroups] = useState<DeptMasterGroup[]>([]);
  const [deptViews, setDeptViews] = useState<DeptView[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    const [permRes, groupsRes] = await Promise.all([
      fetch("/api/permissions"),
      fetch("/api/permissions/groups"),
    ]);
    const permData = await permRes.json();
    const groupsData = await groupsRes.json();
    setDepartments(permData.departments ?? []);
    setMasterGroups(permData.masterGroups ?? []);
    setViews(permData.views ?? []);
    setDeptViews(permData.departmentViews ?? []);
    setDeptMasterGroups(groupsData.deptMasterGroups ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function isGroupEnabled(deptId: string, mgId: string): boolean {
    return deptMasterGroups.find(d => d.department_id === deptId && d.master_group_id === mgId)?.enabled ?? false;
  }

  function isViewEnabled(deptId: string, viewId: string): boolean {
    const dv = deptViews.find(d => d.department_id === deptId && d.view_id === viewId);
    return dv ? dv.ops_allowed && dv.manager_enabled : false;
  }

  async function toggleGroup(deptId: string, mgId: string, currentValue: boolean) {
    setUpdating(`g-${deptId}-${mgId}`);
    setDeptMasterGroups(prev =>
      prev.map(d => d.department_id === deptId && d.master_group_id === mgId ? { ...d, enabled: !currentValue } : d)
    );

    // Also sync views optimistically
    const groupViews = views.filter(v => v.master_group_id === mgId);
    if (!currentValue) {
      // Turning on — enable all views in group
      setDeptViews(prev =>
        prev.map(d =>
          d.department_id === deptId && groupViews.some(v => v.id === d.view_id)
            ? { ...d, ops_allowed: true, manager_enabled: true }
            : d
        )
      );
    } else {
      // Turning off — disable all views in group
      setDeptViews(prev =>
        prev.map(d =>
          d.department_id === deptId && groupViews.some(v => v.id === d.view_id)
            ? { ...d, ops_allowed: false, manager_enabled: false }
            : d
        )
      );
    }

    const res = await fetch("/api/permissions/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department_id: deptId, master_group_id: mgId, enabled: !currentValue }),
    });

    if (!res.ok) fetchData(); // revert on failure
    setUpdating(null);
  }

  async function toggleView(deptId: string, viewId: string, currentValue: boolean) {
    setUpdating(`v-${deptId}-${viewId}`);
    setDeptViews(prev =>
      prev.map(d =>
        d.department_id === deptId && d.view_id === viewId
          ? { ...d, ops_allowed: !currentValue, manager_enabled: !currentValue }
          : d
      )
    );

    const res = await fetch("/api/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department_id: deptId, view_id: viewId, field: "ops_allowed", value: !currentValue }),
    });

    if (res.ok) {
      // Also sync manager_enabled
      await fetch("/api/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department_id: deptId, view_id: viewId, field: "manager_enabled", value: !currentValue }),
      });
    } else {
      fetchData();
    }

    setUpdating(null);
  }

  function toggleExpand(mgId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(mgId)) next.delete(mgId);
      else next.add(mgId);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading permissions...</p>
      </div>
    );
  }

  const nonOpsDepts = departments.filter(d => d.slug !== "ops");

  return (
    <div className="space-y-4">
      {masterGroups.sort((a, b) => a.sort_order - b.sort_order).map(mg => {
        const groupViews = views.filter(v => v.master_group_id === mg.id).sort((a, b) => a.sort_order - b.sort_order);
        const isExpanded = expandedGroups.has(mg.id);

        return (
          <div key={mg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Master group header row */}
            <div className="border-b border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-5 py-3 w-72">
                      <button onClick={() => toggleExpand(mg.id)} className="flex items-center gap-2 group">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={cn("text-gray-400 transition-transform", isExpanded && "rotate-180")}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">{mg.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal">{groupViews.length} views</span>
                      </button>
                    </th>
                    {nonOpsDepts.map(dept => (
                      <th key={dept.id} className="text-center px-3 py-3 min-w-[90px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-medium text-gray-500">{dept.name}</span>
                          <button
                            onClick={() => toggleGroup(dept.id, mg.id, isGroupEnabled(dept.id, mg.id))}
                            disabled={updating !== null}
                            className={cn(
                              "w-10 h-5 rounded-full relative transition-colors",
                              isGroupEnabled(dept.id, mg.id) ? "bg-green-500" : "bg-gray-300"
                            )}
                          >
                            <span className={cn(
                              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                              isGroupEnabled(dept.id, mg.id) ? "left-[22px]" : "left-0.5"
                            )} />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
              </table>
            </div>

            {/* Expanded per-view toggles */}
            {isExpanded && (
              <div>
                <table className="w-full text-sm">
                  <tbody>
                    {groupViews.map((view, vi) => (
                      <tr key={view.id} className={cn("border-b border-gray-50 last:border-0", vi % 2 !== 0 && "bg-gray-50/30")}>
                        <td className="pl-12 pr-5 py-2.5 w-72">
                          <span className="text-sm text-gray-700">{view.name}</span>
                        </td>
                        {nonOpsDepts.map(dept => {
                          const groupOn = isGroupEnabled(dept.id, mg.id);
                          const viewOn = isViewEnabled(dept.id, view.id);

                          return (
                            <td key={dept.id} className="text-center px-3 py-2.5 min-w-[90px]">
                              {groupOn ? (
                                <button
                                  onClick={() => toggleView(dept.id, view.id, viewOn)}
                                  disabled={updating !== null}
                                  className={cn(
                                    "w-8 h-4 rounded-full relative transition-colors",
                                    viewOn ? "bg-blue-500" : "bg-gray-300"
                                  )}
                                >
                                  <span className={cn(
                                    "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                                    viewOn ? "left-[17px]" : "left-0.5"
                                  )} />
                                </button>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <div className="px-2 py-2">
        <p className="text-[11px] text-gray-400">
          OPS always has full access. Green toggles control master group access. Blue toggles fine-tune individual views within an enabled group. Disabled views show &quot;—&quot; when the parent group is off.
        </p>
      </div>
    </div>
  );
}