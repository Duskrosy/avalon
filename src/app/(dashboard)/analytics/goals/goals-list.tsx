"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  target_unit: string | null;
  metric_name: string | null;
  deadline: string | null;
  status: "active" | "completed" | "missed" | "cancelled";
  created_at: string;
  department: { id: string; name: string; slug: string } | null;
  creator: { first_name: string; last_name: string };
};

type Department = { id: string; name: string; slug: string };

type GoalsListProps = {
  isOps: boolean;
  isManager: boolean;
  departments: Department[];
};

const STATUS_STYLES = {
  active: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  missed: "bg-red-50 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const CARD_BORDER = {
  active: "border-gray-200",
  completed: "border-green-200",
  missed: "border-red-200",
  cancelled: "border-gray-200 opacity-60",
};

export function GoalsList({ isOps, isManager, departments }: GoalsListProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDept !== "all") params.set("department_id", filterDept);
    if (filterStatus !== "all") params.set("status", filterStatus);

    const res = await fetch(`/api/goals?${params}`);
    const data = await res.json();
    setGoals(data.goals ?? []);
    setLoading(false);
  }, [filterDept, filterStatus]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  async function updateStatus(goalId: string, status: string) {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: goalId, status }),
    });
    fetchGoals();
  }

  async function deleteGoal(goalId: string) {
    if (!confirm("Delete this goal?")) return;
    await fetch(`/api/goals?id=${goalId}`, { method: "DELETE" });
    fetchGoals();
  }

  function getDaysUntilDeadline(deadline: string): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dl = new Date(deadline + "T00:00:00");
    return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getDeadlineLabel(deadline: string, status: string) {
    if (status !== "active") return null;
    const days = getDaysUntilDeadline(deadline);
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: "text-red-600" };
    if (days === 0) return { text: "Due today", color: "text-amber-600" };
    if (days <= 3) return { text: `${days}d left`, color: "text-amber-600" };
    if (days <= 7) return { text: `${days}d left`, color: "text-blue-600" };
    return { text: `${days}d left`, color: "text-gray-500" };
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {isOps && (
          <select
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="all">All</option>
            <option value="company">Company-wide</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
        <div className="flex gap-1">
          {["all", "active", "completed", "missed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                filterStatus === s
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Loading goals...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No goals found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const deadlineLabel = goal.deadline
              ? getDeadlineLabel(goal.deadline, goal.status)
              : null;

            return (
              <div
                key={goal.id}
                className={cn(
                  "bg-white rounded-xl border p-5 transition-colors",
                  CARD_BORDER[goal.status]
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "text-sm font-medium",
                        goal.status === "cancelled" ? "text-gray-400 line-through" : "text-gray-900"
                      )}>
                        {goal.title}
                      </h3>
                      <span className={cn(
                        "inline-flex px-2 py-0.5 text-[10px] rounded-full font-medium",
                        STATUS_STYLES[goal.status]
                      )}>
                        {goal.status}
                      </span>
                      <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                        {goal.department ? goal.department.name : "Company-wide"}
                      </span>
                    </div>

                    {goal.description && (
                      <p className="text-xs text-gray-500 mb-2">{goal.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {goal.target_value && (
                        <span>
                          Target: {goal.target_value.toLocaleString()}
                          {goal.target_unit && ` ${goal.target_unit}`}
                          {goal.metric_name && ` (${goal.metric_name})`}
                        </span>
                      )}
                      {goal.deadline && (
                        <span>
                          Deadline: {formatDate(goal.deadline)}
                          {deadlineLabel && (
                            <span className={cn("ml-1 font-medium", deadlineLabel.color)}>
                              · {deadlineLabel.text}
                            </span>
                          )}
                        </span>
                      )}
                      <span>By {goal.creator.first_name} {goal.creator.last_name}</span>
                    </div>
                  </div>

                  {isManager && goal.status === "active" && (
                    <div className="flex gap-1 ml-3">
                      <button
                        onClick={() => updateStatus(goal.id, "completed")}
                        className="px-2.5 py-1 text-[10px] font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => updateStatus(goal.id, "missed")}
                        className="px-2.5 py-1 text-[10px] font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                      >
                        Missed
                      </button>
                      <button
                        onClick={() => updateStatus(goal.id, "cancelled")}
                        className="px-2.5 py-1 text-[10px] font-medium bg-gray-100 text-gray-500 rounded-md hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="px-2.5 py-1 text-[10px] text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}