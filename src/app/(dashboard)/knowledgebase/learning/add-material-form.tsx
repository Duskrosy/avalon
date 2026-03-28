"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Department = { id: string; name: string; slug: string };

type AddMaterialFormProps = {
  isOps: boolean;
  currentDepartmentId: string;
  departments: Department[];
};

export function AddMaterialForm({
  isOps,
  currentDepartmentId,
  departments,
}: AddMaterialFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialType, setMaterialType] = useState("pdf");
  const [scope, setScope] = useState(isOps ? "global" : "department");
  const [departmentId, setDepartmentId] = useState(isOps ? "" : currentDepartmentId);
  const [externalLink, setExternalLink] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("material_type", materialType);
    if (description) formData.append("description", description);
    if (scope === "department") {
      formData.append("department_id", departmentId || currentDepartmentId);
    }
    if (materialType === "link") {
      formData.append("external_link", externalLink);
    } else if (file) {
      formData.append("file", file);
    }

    const res = await fetch("/api/learning", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTitle("");
    setDescription("");
    setExternalLink("");
    setFile(null);
    setLoading(false);
    router.refresh();
  }

  const ACCEPT_MAP: Record<string, string> = {
    video: ".mp4,.mov,.avi,.webm",
    pdf: ".pdf",
    presentation: ".ppt,.pptx",
    document: ".doc,.docx,.txt",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-medium text-gray-900 mb-4">
        Add material
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Material title"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this material about?"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Type *
          </label>
          <select
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value)}
          >
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
            <option value="presentation">Presentation</option>
            <option value="document">Document</option>
            <option value="link">External link</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Audience
          </label>
          <select
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            {isOps && <option value="global">Global (all departments)</option>}
            <option value="department">Department</option>
          </select>
        </div>

        {scope === "department" && isOps && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Department
            </label>
            <select
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {materialType === "link" ? (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              URL *
            </label>
            <input
              type="url"
              required
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              File *
            </label>
            <input
              type="file"
              required
              className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept={ACCEPT_MAP[materialType] || "*"}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">Material added!</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Adding..." : "Add material"}
        </button>
      </form>
    </div>
  );
}