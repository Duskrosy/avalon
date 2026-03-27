"use client";

import { useState, useEffect, useCallback } from "react";

type Department = { id: string; name: string; slug: string };

type KpiEntry = {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  source: string;
  period_start: string;
  period_end: string;
  created_at: string;
  department: { id: string; name: string; slug: string };
};

type KpiEntriesTableProps = {
  isOps: boolean;
  currentDepartmentId: string;
  departments: Department[];
};

export function KpiEntriesTable({
  isOps,
  currentDepartmentId,
  departments,
}: KpiEntriesTableProps) {
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<string>(
    isOps ? "all" : currentDepartmentId
  );

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDept !== "all") params.set("department_id", filterDept);

    const res = await fetch(`/api/kpi?${params}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, [filterDept]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function deleteEntry(id: string) {
    if (!confirm("Delete this KPI entry?")) return;
    const res = await fetch(`/api/kpi?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchEntries();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-900">
          Recent entries ({entries.length})
        </h2>
        {isOps && (
          <select
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="p-5">
          <p className="text-sm text-gray-500">Loading entries...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500">
            No entries yet. Add your first KPI using the form.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {isOps && (
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">
                    Dept
                  </th>
                )}
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">
                  Metric
                </th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-gray-500">
                  Value
                </th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">
                  Period
                </th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">
                  Source
                </th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                >
                  {isOps && (
                    <td className="px-5 py-3 text-gray-600">
                      {entry.department.name}
                    </td>
                  )}
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {entry.metric_name}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-900">
                    {entry.metric_value.toLocaleString()}
                    {entry.metric_unit && (
                      <span className="text-gray-400 ml-1">
                        {entry.metric_unit}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {formatDate(entry.period_start)} –{" "}
                    {formatDate(entry.period_end)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                        entry.source === "manual"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {entry.source}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}