"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Employee = { id: string; first_name: string; last_name: string };
type Material = { id: string; title: string; material_type: string };
type Completion = { user_id: string; material_id: string; completed_at: string };
type Department = { id: string; name: string; slug: string };

type LearningProgressProps = {
  isOps: boolean;
  currentDepartmentId: string;
  departments: Department[];
};

const TYPE_BADGE: Record<string, string> = {
  video: "bg-purple-50 text-purple-600",
  pdf: "bg-red-50 text-red-600",
  presentation: "bg-amber-50 text-amber-600",
  document: "bg-blue-50 text-blue-600",
  link: "bg-green-50 text-green-600",
};

export function LearningProgress({
  isOps,
  currentDepartmentId,
  departments,
}: LearningProgressProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState(currentDepartmentId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/learning/progress?department_id=${selectedDept}`);
    const data = await res.json();
    setEmployees(data.employees ?? []);
    setMaterials(data.materials ?? []);
    setCompletions(data.completions ?? []);
    setLoading(false);
  }, [selectedDept]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  function getEmployeeCompletions(userId: string) {
    const completedIds = new Set(
      completions.filter((c) => c.user_id === userId).map((c) => c.material_id)
    );
    return {
      done: completedIds.size,
      total: materials.length,
      percent: materials.length > 0 ? Math.round((completedIds.size / materials.length) * 100) : 0,
      completedIds,
    };
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading progress...</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No learning materials assigned to this department.</p>
      </div>
    );
  }

  const overallCompletion =
    employees.length > 0 && materials.length > 0
      ? Math.round((completions.length / (employees.length * materials.length)) * 100)
      : 0;

  const fullyComplete = employees.filter(
    (e) => getEmployeeCompletions(e.id).percent === 100
  ).length;

  // Sort employees: incomplete first, then by progress ascending
  const sorted = [...employees].sort((a, b) => {
    const pa = getEmployeeCompletions(a.id).percent;
    const pb = getEmployeeCompletions(b.id).percent;
    return pa - pb;
  });

  return (
    <div>
      {isOps && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDept(d.id)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                selectedDept === d.id
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 hover:bg-gray-50"
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Materials</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{materials.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Team members</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{employees.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Overall completion</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{overallCompletion}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Fully complete</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {fullyComplete}/{employees.length}
          </p>
        </div>
      </div>

      {/* Employee progress cards */}
      <div className="space-y-3">
        {sorted.map((emp) => {
          const { done, total, percent, completedIds } = getEmployeeCompletions(emp.id);
          const isExpanded = expandedId === emp.id;
          const isComplete = percent === 100;

          return (
            <div
              key={emp.id}
              className={cn(
                "bg-white rounded-xl border overflow-hidden transition-colors",
                isComplete ? "border-green-200" : "border-gray-200"
              )}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
                  isComplete ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                )}>
                  {emp.first_name[0]}{emp.last_name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-900">
                      {emp.first_name} {emp.last_name}
                    </span>
                    <span className={cn(
                      "text-xs font-medium",
                      isComplete ? "text-green-600" : percent > 0 ? "text-blue-600" : "text-gray-400"
                    )}>
                      {done}/{total} completed
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        isComplete ? "bg-green-500" : percent > 0 ? "bg-blue-500" : "bg-gray-200"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <span className={cn(
                  "text-lg font-semibold w-12 text-right flex-shrink-0",
                  isComplete ? "text-green-600" : percent > 0 ? "text-blue-600" : "text-gray-300"
                )}>
                  {percent}%
                </span>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={cn(
                    "text-gray-400 transition-transform flex-shrink-0",
                    isExpanded && "rotate-180"
                  )}
                >
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                    {materials.map((m) => {
                      const isDone = completedIds.has(m.id);
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm",
                            isDone ? "bg-green-50" : "bg-gray-50"
                          )}
                        >
                          <span className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                            isDone ? "bg-green-500" : "border-2 border-gray-300"
                          )}>
                            {isDone && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M8 3L3.75 7.25L2 5.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          <span className={cn(
                            "flex-1 truncate",
                            isDone ? "text-green-800" : "text-gray-600"
                          )}>
                            {m.title}
                          </span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                            TYPE_BADGE[m.material_type] || "bg-gray-100 text-gray-500"
                          )}>
                            {m.material_type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}