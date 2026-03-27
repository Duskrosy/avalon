"use client";

import { useState, useEffect, useCallback } from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";

type Department = { id: string; name: string; slug: string };

type KpiOverviewProps = {
  isOps: boolean;
  currentDepartmentId: string;
  departments: Department[];
};

type KpiEntry = {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  department: { id: string; name: string; slug: string };
  period_start: string;
  period_end: string;
};

export function KpiOverview({
  isOps,
  currentDepartmentId,
  departments,
}: KpiOverviewProps) {
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(
    isOps ? "all" : currentDepartmentId
  );
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedDept !== "all") params.set("department_id", selectedDept);

    const res = await fetch(`/api/kpi?${params}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, [selectedDept]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Aggregate: group by metric_name, get the latest value for each
  const latestByMetric = new Map<
    string,
    { value: number; unit: string | null; prevValue: number | null }
  >();

  const sorted = [...entries].sort(
    (a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
  );

  for (const entry of sorted) {
    if (!latestByMetric.has(entry.metric_name)) {
      latestByMetric.set(entry.metric_name, {
        value: entry.metric_value,
        unit: entry.metric_unit,
        prevValue: null,
      });
    } else {
      const existing = latestByMetric.get(entry.metric_name)!;
      if (existing.prevValue === null) {
        existing.prevValue = entry.metric_value;
      }
    }
  }

  const metrics = Array.from(latestByMetric.entries()).slice(0, 8);

  return (
    <div>
      {isOps && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedDept("all")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              selectedDept === "all"
                ? "bg-gray-900 text-white"
                : "border border-gray-300 hover:bg-gray-50"
            }`}
          >
            All departments
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDept(d.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedDept === d.id
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      ) : metrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(([name, data]) => {
            const change =
              data.prevValue !== null && data.prevValue !== 0
                ? ((data.value - data.prevValue) / Math.abs(data.prevValue)) * 100
                : undefined;

            return (
              <KpiCard
                key={name}
                label={name}
                value={data.value}
                unit={data.unit ?? undefined}
                change={change}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm">
            No KPI data yet. Add entries using the form below.
          </p>
        </div>
      )}
    </div>
  );
}