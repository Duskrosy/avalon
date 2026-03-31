"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Department = { id: string; name: string; slug: string };
type MasterGroup = { id: string; name: string; slug: string; sort_order: number };
type View = { id: string; master_group_id: string; name: string; slug: string; sort_order: number };
type User = {
  id: string;
  first_name: string;
  last_name: string;
  role: { id: string; name: string; slug: string; tier: number };
};
type Override = { user_id: string; view_id: string; enabled: boolean };

type Props = {
  departments: Department[];
  masterGroups: MasterGroup[];
  views: View[];
};

export function UserOverrides({ departments, masterGroups, views }: Props) {
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const nonOpsDepts = departments.filter(d => d.slug !== "ops");

  const fetchUsers = useCallback(async () => {
    if (!selectedDept) return;
    setLoading(true);
    const res = await fetch(`/api/permissions/users?department_id=${selectedDept}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setOverrides(data.overrides ?? []);
    setLoading(false);
  }, [selectedDept]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function getOverride(userId: string, viewId: string): Override | undefined {
    return overrides.find(o => o.user_id === userId && o.view_id === viewId);
  }

  function hasOverride(userId: string, viewId: string): boolean {
    return overrides.some(o => o.user_id === userId && o.view_id === viewId);
  }

  async function toggleUserView(userId: string, viewId: string) {
    const existing = getOverride(userId, viewId);
    const key = `${userId}-${viewId}`;
    setUpdating(key);

    if (existing) {
      // Toggle existing override
      const newVal = !existing.enabled;
      setOverrides(prev => prev.map(o =>
        o.user_id === userId && o.view_id === viewId ? { ...o, enabled: newVal } : o
      ));
      await fetch("/api/permissions/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, view_id: viewId, enabled: newVal }),
      });
    } else {
      // Create new override (default to disabled since we're overriding)
      setOverrides(prev => [...prev, { user_id: userId, view_id: viewId, enabled: false }]);
      await fetch("/api/permissions/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, view_id: viewId, enabled: false }),
      });
    }
    setUpdating(null);
  }

  async function removeOverride(userId: string, viewId: string) {
    setOverrides(prev => prev.filter(o => !(o.user_id === userId && o.view_id === viewId)));
    await fetch(`/api/permissions/users?user_id=${userId}&view_id=${viewId}`, { method: "DELETE" });
  }

  async function bulkSetByRole(roleTier: number, viewId: string, enabled: boolean) {
    const roleUsers = users.filter(u => {
      const role = u.role as unknown as { tier: number };
      return role.tier === roleTier;
    });
    const userIds = roleUsers.map(u => u.id);
    if (userIds.length === 0) return;

    setUpdating(`bulk-${roleTier}-${viewId}`);

    // Optimistic
    const newOverrides = userIds.map(uid => ({ user_id: uid, view_id: viewId, enabled }));
    setOverrides(prev => {
      const filtered = prev.filter(o => !(o.view_id === viewId && userIds.includes(o.user_id)));
      return [...filtered, ...newOverrides];
    });

    await fetch("/api/permissions/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: userIds, view_id: viewId, enabled }),
    });

    setUpdating(null);
  }

  // Group users by role
  const roleGroups = new Map<string, { roleName: string; tier: number; users: User[] }>();
  for (const user of users) {
    const role = user.role as unknown as { id: string; name: string; tier: number };
    const key = role.id || role.name;
    if (!roleGroups.has(key)) {
      roleGroups.set(key, { roleName: role.name, tier: role.tier, users: [] });
    }
    roleGroups.get(key)!.users.push(user);
  }

  return (
    <div className="mt-8">
      <div className="mb-4 pb-2 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">User-level overrides</h2>
        <p className="text-xs text-gray-500 mt-1">Override department defaults for specific users. Select a department to manage.</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {nonOpsDepts.map(dept => (
          <button
            key={dept.id}
            onClick={() => { setSelectedDept(dept.id); setExpandedUser(null); }}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg transition-colors",
              selectedDept === dept.id ? "bg-gray-900 text-white" : "border border-gray-300 hover:bg-gray-50"
            )}
          >
            {dept.name}
          </button>
        ))}
      </div>

      {!selectedDept ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">Select a department above to manage user overrides.</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">No users in this department.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Bulk by role */}
          {Array.from(roleGroups.entries()).map(([key, group]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">{group.roleName} ({group.users.length})</p>
              </div>

              <div className="divide-y divide-gray-50">
                {group.users.map(user => {
                  const isExpanded = expandedUser === user.id;
                  const userOverrides = overrides.filter(o => o.user_id === user.id);
                  const overrideCount = userOverrides.length;

                  return (
                    <div key={user.id}>
                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                        className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-600">
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </span>
                          {overrideCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded">
                              {overrideCount} override{overrideCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={cn("text-gray-400 transition-transform", isExpanded && "rotate-180")}>
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1">
                          {masterGroups.sort((a, b) => a.sort_order - b.sort_order).map(mg => {
                            const groupViews = views.filter(v => v.master_group_id === mg.id).sort((a, b) => a.sort_order - b.sort_order);
                            if (groupViews.length === 0) return null;

                            return (
                              <div key={mg.id} className="mb-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{mg.name}</p>
                                <div className="space-y-1">
                                  {groupViews.map(view => {
                                    const ovr = getOverride(user.id, view.id);
                                    const has = hasOverride(user.id, view.id);

                                    return (
                                      <div key={view.id} className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-gray-50">
                                        <span className="text-sm text-gray-700">{view.name}</span>
                                        <div className="flex items-center gap-2">
                                          {has ? (
                                            <>
                                              <button
                                                onClick={() => toggleUserView(user.id, view.id)}
                                                disabled={updating !== null}
                                                className={cn(
                                                  "w-8 h-4 rounded-full relative transition-colors",
                                                  ovr?.enabled ? "bg-blue-500" : "bg-red-400"
                                                )}
                                              >
                                                <span className={cn(
                                                  "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                                                  ovr?.enabled ? "left-[17px]" : "left-0.5"
                                                )} />
                                              </button>
                                              <button
                                                onClick={() => removeOverride(user.id, view.id)}
                                                className="text-[10px] text-gray-400 hover:text-red-500"
                                                title="Remove override (use department default)"
                                              >
                                                ✕
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              onClick={() => toggleUserView(user.id, view.id)}
                                              disabled={updating !== null}
                                              className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-0.5 border border-dashed border-gray-300 rounded"
                                            >
                                              Add override
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}

                          {/* Bulk actions */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-[10px] font-medium text-gray-400 mb-2">Bulk: apply to all {group.roleName} users</p>
                            <div className="flex gap-2 flex-wrap">
                              {views.slice(0, 6).map(view => (
                                <div key={view.id} className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-500">{view.name}:</span>
                                  <button
                                    onClick={() => bulkSetByRole(group.tier, view.id, true)}
                                    disabled={updating !== null}
                                    className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded hover:bg-green-100"
                                  >On</button>
                                  <button
                                    onClick={() => bulkSetByRole(group.tier, view.id, false)}
                                    disabled={updating !== null}
                                    className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                  >Off</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}