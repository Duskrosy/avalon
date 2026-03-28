"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Department = { id: string; name: string; slug: string };

type CreateGoalFormProps = {
  isOps: boolean;
  currentDepartmentId: string;
  departments: Department[];
};

export function CreateGoalForm({
  isOps,
  currentDepartmentId,
  departments,
}: CreateGoalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    target_value: "",
    target_unit: "",
    metric_name: "",
    deadline: "",
    scope: isOps ? "company" : "department",
    department_id: isOps ? "" : currentDepartmentId,
  });

  function updateField(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const department_id =
      form.scope === "company" ? null : form.department_id || currentDepartmentId;

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        target_value: form.target_value,
        target_unit: form.target_unit,
        metric_name: form.metric_name,
        deadline: form.deadline,
        department_id,
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
      title: "",
      description: "",
      target_value: "",
      target_unit: "",
      metric_name: "",
      deadline: "",
      scope: isOps ? "company" : "department",
      department_id: isOps ? "" : currentDepartmentId,
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-medium text-gray-900 mb-4">
        Create goal
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Goal title *
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="e.g. Increase Q2 revenue by 20%"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Details about this goal"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Target value
            </label>
            <input
              type="number"
              step="any"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.target_value}
              onChange={(e) => updateField("target_value", e.target.value)}
              placeholder="100000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Unit
            </label>
            <input
              type="text"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.target_unit}
              onChange={(e) => updateField("target_unit", e.target.value)}
              placeholder="$, %, orders..."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Linked metric
          </label>
          <input
            type="text"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={form.metric_name}
            onChange={(e) => updateField("metric_name", e.target.value)}
            placeholder="e.g. Revenue, Conversion rate"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">
            Links to KPI entries for auto-tracking (future)
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Deadline
          </label>
          <input
            type="date"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={form.deadline}
            onChange={(e) => updateField("deadline", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Scope
          </label>
          <select
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={form.scope}
            onChange={(e) => {
              updateField("scope", e.target.value);
              if (e.target.value === "company") updateField("department_id", "");
            }}
          >
            {isOps && <option value="company">Company-wide</option>}
            <option value="department">Department</option>
          </select>
        </div>

        {form.scope === "department" && isOps && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Department
            </label>
            <select
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.department_id}
              onChange={(e) => updateField("department_id", e.target.value)}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">Goal created!</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Creating..." : "Create goal"}
        </button>
      </form>
    </div>
  );
}