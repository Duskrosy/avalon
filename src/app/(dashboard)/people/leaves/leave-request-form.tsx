"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LEAVE_TYPES = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick leave" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

export function LeaveRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  function updateField(field: string, value: string) {
    setForm({ ...form, [field]: value });
  }

  function getDayCount(): number | null {
    if (!form.start_date || !form.end_date) return null;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
    setLoading(false);
    router.refresh();
  }

  const dayCount = getDayCount();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-medium text-gray-900 mb-4">
        Request leave
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Leave type *
          </label>
          <select
            required
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={form.leave_type}
            onChange={(e) => updateField("leave_type", e.target.value)}
          >
            <option value="">Select type</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start date *
            </label>
            <input
              type="date"
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End date *
            </label>
            <input
              type="date"
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.end_date}
              onChange={(e) => updateField("end_date", e.target.value)}
            />
          </div>
        </div>

        {dayCount && (
          <p className="text-xs text-gray-500">
            {dayCount} day{dayCount !== 1 ? "s" : ""} requested
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Reason
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            value={form.reason}
            onChange={(e) => updateField("reason", e.target.value)}
            placeholder="Optional — why you're requesting leave"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            Leave request submitted!
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </div>
  );
}