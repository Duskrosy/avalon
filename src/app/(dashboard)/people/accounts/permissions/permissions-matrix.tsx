"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Department = { id: string; name: string; slug: string };
type MasterGroup = { id: string; name: string; slug: string; sort_order: number };
type View = {
  id: string;
  master_group_id: string;
  name: string;
  slug: string;
  sort_order: number;
};
type DepartmentView = {
  id: string;
  department_id: string;
  view_id: string;
  ops_allowed: boolean;
  manager_enabled: boolean;
};

export function PermissionsMatrix() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [masterGroups, setMasterGroups] = useState<MasterGroup[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [departmentViews, setDepartmentViews] = useState<DepartmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/permissions");
    const data = await res.json();
    setDepartments(data.departments ?? []);
    setMasterGroups(data.masterGroups ?? []);
    setViews(data.views ?? []);
    setDepartmentViews(data.departmentViews ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getDV(deptId: string, viewId: string): DepartmentView | undefined {
    return departmentViews.find(
      (dv) => dv.department_id === deptId && dv.view_id === viewId
    );
  }

  async function togglePermission(
    deptId: string,
    viewId: string,
    field: "ops_allowed" | "manager_enabled",
    currentValue: boolean
  ) {
    const key = `${deptId}-${viewId}-${field}`;
    setUpdating(key);

    // Optimistic update
    setDepartmentViews((prev) =>
      prev.map((dv) =>
        dv.department_id === deptId && dv.view_id === viewId
          ? { ...dv, [field]: !currentValue }
          : dv
      )
    );

    const res = await fetch("/api/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        department_id: deptId,
        view_id: viewId,
        field,
        value: !currentValue,
      }),
    });

    if (!res.ok) {
      // Revert on failure
      setDepartmentViews((prev) =>
        prev.map((dv) =>
          dv.department_id === deptId && dv.view_id === viewId
            ? { ...dv, [field]: currentValue }
            : dv
        )
      );
    }

    setUpdating(null);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading permissions matrix...</p>
      </div>
    );
  }

  // Filter out OPS since they always have everything
  const nonOpsDepts = departments.filter((d) => d.slug !== "ops");

  return (
    <div className="space-y-6">
      {masterGroups.map((mg) => {
        const groupViews = views
          .filter((v) => v.master_group_id === mg.id)
          .sort((a, b) => a.sort_order - b.sort_order);

        return (
          <div
            key={mg.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">{mg.name}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-48">
                      View
                    </th>
                    {nonOpsDepts.map((dept) => (
                      <th
                        key={dept.id}
                        className="text-center px-3 py-3 text-xs font-medium text-gray-500"
                        colSpan={2}
                      >
                        {dept.name}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-50">
                    <th />
                    {nonOpsDepts.map((dept) => (
                      <th key={dept.id} colSpan={2} className="px-1 pb-2">
                        <div className="flex justify-center gap-2 text-[10px] text-gray-400">
                          <span className="w-12 text-center">Allow</span>
                          <span className="w-12 text-center">Enable</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupViews.map((view) => (
                    <tr
                      key={view.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-5 py-3 text-gray-700">{view.name}</td>
                      {nonOpsDepts.map((dept) => {
                        const dv = getDV(dept.id, view.id);
                        const allowed = dv?.ops_allowed ?? false;
                        const enabled = dv?.manager_enabled ?? false;

                        return (
                          <td
                            key={dept.id}
                            colSpan={2}
                            className="px-1 py-3"
                          >
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() =>
                                  togglePermission(
                                    dept.id,
                                    view.id,
                                    "ops_allowed",
                                    allowed
                                  )
                                }
                                disabled={updating !== null}
                                className={cn(
                                  "w-12 h-7 rounded-md text-xs font-medium transition-colors",
                                  allowed
                                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                )}
                              >
                                {allowed ? "On" : "Off"}
                              </button>
                              <button
                                onClick={() =>
                                  togglePermission(
                                    dept.id,
                                    view.id,
                                    "manager_enabled",
                                    enabled
                                  )
                                }
                                disabled={updating !== null || !allowed}
                                className={cn(
                                  "w-12 h-7 rounded-md text-xs font-medium transition-colors",
                                  !allowed
                                    ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                    : enabled
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                )}
                              >
                                {enabled ? "On" : "Off"}
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}