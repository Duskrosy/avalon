"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Department = { id: string; name: string; slug: string };

type AnnouncementComposerProps = {
  isOps: boolean;
  currentDepartmentId: string;
  departments: Department[];
};

export function AnnouncementComposer({
  isOps,
  currentDepartmentId,
  departments,
}: AnnouncementComposerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    priority: "normal",
    scope: isOps ? "global" : "department",
    department_id: isOps ? "" : currentDepartmentId,
    expires_at: "",
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
      form.scope === "global" ? null : form.department_id || currentDepartmentId;

    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        content: form.content,
        priority: form.priority,
        department_id,
        expires_at: form.expires_at || null,
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
      content: "",
      priority: "normal",
      scope: isOps ? "global" : "department",
      department_id: isOps ? "" : currentDepartmentId,
      expires_at: "",
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-medium text-gray-900 mb-4">
        Post announcement
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Title *
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Announcement title"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Content *
          </label>
          <textarea
            required
            rows={4}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            value={form.content}
            onChange={(e) => updateField("content", e.target.value)}
            placeholder="Write your announcement..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Priority
            </label>
            <select
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.priority}
              onChange={(e) => updateField("priority", e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Audience
            </label>
            <select
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={form.scope}
              onChange={(e) => {
                updateField("scope", e.target.value);
                if (e.target.value === "global") updateField("department_id", "");
              }}
            >
              {isOps && <option value="global">Global (everyone)</option>}
              <option value="department">Department</option>
            </select>
          </div>
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
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Expires on (optional)
          </label>
          <input
            type="date"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={form.expires_at}
            onChange={(e) => updateField("expires_at", e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
            Announcement posted!
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Posting..." : "Post announcement"}
        </button>
      </form>
    </div>
  );
}