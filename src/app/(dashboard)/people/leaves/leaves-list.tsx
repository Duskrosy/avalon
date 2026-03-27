"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Leave = {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    department_id: string;
    department: { id: string; name: string };
  };
  reviewer: { first_name: string; last_name: string } | null;
};

type LeavesListProps = {
  currentUserId: string;
  isOps: boolean;
  isManager: boolean;
};

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
};

export function LeavesList({ currentUserId, isOps, isManager }: LeavesListProps) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (!isOps && !isManager) params.set("scope", "mine");

    const res = await fetch(`/api/leaves?${params}`);
    const data = await res.json();
    setLeaves(data.leaves ?? []);
    setLoading(false);
  }, [filter, isOps, isManager]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  async function handleAction(leaveId: string, action: "approved" | "rejected") {
    setProcessing(leaveId);

    const res = await fetch("/api/leaves", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leave_id: leaveId, action }),
    });

    if (res.ok) {
      fetchLeaves();
    }
    setProcessing(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatLeaveType(type: string) {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function getDayCount(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-900">
          Leave requests ({leaves.length})
        </h2>
        <div className="flex gap-1">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                filter === s
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
        <div className="p-5">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      ) : leaves.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">No leave requests found.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {leaves.map((leave) => {
            const isOwn = leave.user_id === currentUserId;
            const canAction =
              leave.status === "pending" && !isOwn && (isOps || isManager);
            const days = getDayCount(leave.start_date, leave.end_date);

            return (
              <div key={leave.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {leave.profile.first_name} {leave.profile.last_name}
                      </p>
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 text-xs rounded-full font-medium",
                          STATUS_STYLES[leave.status]
                        )}
                      >
                        {leave.status}
                      </span>
                      {isOwn && (
                        <span className="text-xs text-gray-400">(you)</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatLeaveType(leave.leave_type)} · {days} day
                      {days !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(leave.start_date)} –{" "}
                      {formatDate(leave.end_date)}
                      {(isOps || isManager) && (
                        <span> · {leave.profile.department.name}</span>
                      )}
                    </p>
                    {leave.reason && (
                      <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 px-2.5 py-1.5 rounded-md">
                        {leave.reason}
                      </p>
                    )}
                    {leave.reviewer && leave.status !== "pending" && (
                      <p className="text-xs text-gray-400 mt-1">
                        {leave.status === "approved" ? "Approved" : "Rejected"}{" "}
                        by {leave.reviewer.first_name}{" "}
                        {leave.reviewer.last_name}
                      </p>
                    )}
                  </div>

                  {canAction && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleAction(leave.id, "approved")}
                        disabled={processing === leave.id}
                        className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(leave.id, "rejected")}
                        disabled={processing === leave.id}
                        className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50"
                      >
                        Reject
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