"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Material = {
  id: string;
  title: string;
  description: string | null;
  material_type: "video" | "pdf" | "presentation" | "document" | "link";
  file_url: string | null;
  external_link: string | null;
  created_at: string;
  department: { id: string; name: string; slug: string } | null;
  author: { first_name: string; last_name: string };
};

type Department = { id: string; name: string; slug: string };

type LearningListProps = {
  isOps: boolean;
  isManager: boolean;
  departments: Department[];
};

const TYPE_ICONS: Record<string, string> = {
  video: "🎬",
  pdf: "📄",
  presentation: "📊",
  document: "📝",
  link: "🔗",
};

const TYPE_BADGE: Record<string, string> = {
  video: "bg-purple-50 text-purple-600",
  pdf: "bg-red-50 text-red-600",
  presentation: "bg-amber-50 text-amber-600",
  document: "bg-blue-50 text-blue-600",
  link: "bg-green-50 text-green-600",
};

export function LearningList({ isOps, isManager, departments }: LearningListProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingType, setViewingType] = useState<string | null>(null);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDept !== "all") params.set("department_id", filterDept);
    if (filterType !== "all") params.set("type", filterType);

    const [matRes, compRes] = await Promise.all([
      fetch(`/api/learning?${params}`),
      fetch("/api/learning/complete"),
    ]);

    const matData = await matRes.json();
    const compData = await compRes.json();

    setMaterials(matData.materials ?? []);
    setCompletions(
      new Set((compData.completions ?? []).map((c: { material_id: string }) => c.material_id))
    );
    setLoading(false);
  }, [filterDept, filterType]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  async function handleOpen(material: Material) {
    if (material.material_type === "link" && material.external_link) {
      window.open(material.external_link, "_blank");
      return;
    }

    if (material.file_url) {
      const res = await fetch(`/api/kops/versions?path=${encodeURIComponent(material.file_url)}&bucket=learning`);
      const data = await res.json();
      if (data.url) {
        setViewingUrl(data.url);
        setViewingType(material.material_type);
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this material?")) return;
    const res = await fetch(`/api/learning?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchMaterials();
  }

  async function handleToggleComplete(materialId: string) {
    setTogglingId(materialId);
    const res = await fetch("/api/learning/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id: materialId }),
    });
    const data = await res.json();
    if (res.ok) {
      setCompletions((prev) => {
        const next = new Set(prev);
        if (data.completed) {
          next.add(materialId);
        } else {
          next.delete(materialId);
        }
        return next;
      });
    }
    setTogglingId(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
            <option value="all">All departments</option>
            <option value="global">Global</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="video">Video</option>
          <option value="pdf">PDF</option>
          <option value="presentation">Presentation</option>
          <option value="document">Document</option>
          <option value="link">Link</option>
        </select>
      </div>

      {/* In-app viewer */}
      {viewingUrl && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-medium text-gray-900">Preview</h2>
            <button
              onClick={() => { setViewingUrl(null); setViewingType(null); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close preview
            </button>
          </div>
          {viewingType === "pdf" ? (
            <iframe src={viewingUrl} className="w-full rounded-lg border border-gray-200" style={{ height: "600px" }} title="PDF Viewer" />
          ) : viewingType === "video" ? (
            <video
              src={viewingUrl}
              controls
              className="w-full rounded-lg border border-gray-200"
              style={{ maxHeight: "500px" }}
            >
              Your browser does not support video playback.
            </video>
          ) : viewingType === "presentation" ? (
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(viewingUrl)}&embedded=true`}
              className="w-full rounded-lg border border-gray-200"
              style={{ height: "600px" }}
              title="Presentation Viewer"
            />
          ) : viewingType === "document" ? (
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(viewingUrl)}&embedded=true`}
              className="w-full rounded-lg border border-gray-200"
              style={{ height: "600px" }}
              title="Document Viewer"
            />
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">Preview not available for this file type.</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Loading materials...</p>
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No learning materials found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => {
            const isDone = completions.has(m.id);

            return (
            <div
              key={m.id}
              className={cn(
                "bg-white rounded-xl border p-5 transition-colors",
                isDone ? "border-green-200 bg-green-50/30" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => handleToggleComplete(m.id)}
                    disabled={togglingId === m.id}
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      isDone
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-gray-400"
                    )}
                  >
                    {isDone && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn("text-sm font-medium", isDone ? "text-gray-500 line-through" : "text-gray-900")}>
                        {m.title}
                      </h3>
                      <span className={cn("inline-flex px-2 py-0.5 text-[10px] rounded-full font-medium", TYPE_BADGE[m.material_type])}>
                        {m.material_type}
                      </span>
                      <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                        {m.department ? m.department.name : "Global"}
                      </span>
                      {isDone && (
                        <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-600 font-medium">
                          Done
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-xs text-gray-500 mb-1">{m.description}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {m.author.first_name} {m.author.last_name} · {formatDate(m.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-3">
                  <button
                    onClick={() => handleOpen(m)}
                    className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800"
                  >
                    {m.material_type === "link" ? "Open" : "View"}
                  </button>
                  {isManager && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}