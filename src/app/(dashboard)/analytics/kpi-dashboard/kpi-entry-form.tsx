"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Department = { id: string; name: string; slug: string };

type KpiEntryFormProps = {
  isOps: boolean;
  currentDepartmentId: string;
  departments: Department[];
};

const COMMON_METRICS = [
  "Revenue",
  "Orders",
  "Conversion rate",
  "Ad spend",
  "ROAS",
  "Impressions",
  "Clicks",
  "CTR",
  "Followers",
  "Engagement rate",
  "AOV",
  "Delivery success rate",
  "Return rate",
  "Response time",
  "CSAT score",
  "CRR",
];

export function KpiEntryForm({
  isOps,
  currentDepartmentId,
  departments,
}: KpiEntryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customMetric, setCustomMetric] = useState(false);

  const [form, setForm] = useState({
    department_id: isOps ? "" : currentDepartmentId,
    metric_name: "",
    custom_metric_name: "",
    metric_value: "",
    metric_unit: "",
    period_start: "",
    period_end: "",
  });

  function updateField(field: string, value: string) {
    setForm({ ...form, [field]: value });
    if (field === "metric_name" && value === "__custom") {
      setCustomMetric(true);
    } else if (field === "metric_name") {
      setCustomMetric(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const metricName = customMetric ? form.custom_metric_name : form.metric_name;

    const res = await fetch("/api/kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        department_id: form.department_id,
        metric_name: metricName,
        metric_value: form.metric_value,
        metric_unit: form.metric_unit,
        period_start: form.period_start,
        period_end: form.period_end,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setForm({
      ...form,
      metric_name: "",
      custom_metric_name: "",
      metric_value: "",
      metric_unit: "",
    });
    setCustomMetric(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-medium text-gray-900 mb-4">
        Add KPI entry
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {isOps && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Department *
            </label>
            <select
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.department_id}
              onChange={(e) => updateField("department_id", e.target.value)}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Metric *
          </label>
          <select
            required={!customMetric}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={customMetric ? "__custom" : form.metric_name}
            onChange={(e) => updateField("metric_name", e.target.value)}
          >
            <option value="">Select metric</option>
            {COMMON_METRICS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value="__custom">Custom metric...</option>
          </select>
        </div>

        {customMetric && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Custom metric name *
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.custom_metric_name}
              onChange={(e) => updateField("custom_metric_name", e.target.value)}
              placeholder="e.g. Email open rate"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Value *
            </label>
            <input
              type="number"
              step="any"
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.metric_value}
              onChange={(e) => updateField("metric_value", e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Unit
            </label>
            <input
              type="text"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.metric_unit}
              onChange={(e) => updateField("metric_unit", e.target.value)}
              placeholder="%, $, orders..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Period start *
            </label>
            <input
              type="date"
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.period_start}
              onChange={(e) => updateField("period_start", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Period end *
            </label>
            <input
              type="date"
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.period_end}
              onChange={(e) => updateField("period_end", e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            KPI entry added!
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Adding..." : "Add entry"}
        </button>
      </form>
    </div>
  );
}