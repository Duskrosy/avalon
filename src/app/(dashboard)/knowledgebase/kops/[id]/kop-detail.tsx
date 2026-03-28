"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Version = {
  id: string;
  version_number: number;
  file_url: string;
  file_type: string | null;
  change_notes: string | null;
  created_at: string;
  uploader: { first_name: string; last_name: string };
};

type Kop = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  current_version: number;
  created_at: string;
  updated_at: string;
  department: { id: string; name: string; slug: string } | null;
  author: { first_name: string; last_name: string };
  versions: Version[];
};

type KopDetailProps = {
  kopId: string;
  isManager: boolean;
};

function FileViewer({ url, fileType }: { url: string; fileType: string | null }) {
  const type = (fileType || "").toLowerCase();
  const isPdf = type === "pdf";
  const isWord = ["doc", "docx"].includes(type);

  if (isPdf) {
    return (
      <iframe
        src={url}
        className="w-full rounded-lg border border-gray-200"
        style={{ height: "700px" }}
        title="PDF Viewer"
      />
    );
  }

  if (isWord) {
    const encodedUrl = encodeURIComponent(url);
    return (
      <iframe
        src={`https://docs.google.com/gview?url=${encodedUrl}&embedded=true`}
        className="w-full rounded-lg border border-gray-200"
        style={{ height: "700px" }}
        title="Document Viewer"
      />
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
      <p className="text-sm text-gray-500">
        Preview not available for .{type} files.
      </p>
      <p className="text-xs text-gray-400 mt-1">Use the download button to view this file.</p>
    </div>
  );
}

export function KopDetail({ kopId, isManager }: KopDetailProps) {
  const [kop, setKop] = useState<Kop | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingType, setViewingType] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [changeNotes, setChangeNotes] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchKop = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/kops?id=${kopId}`);
    const data = await res.json();
    setKop(data.kop ?? null);
    setLoading(false);
  }, [kopId]);

  useEffect(() => {
    fetchKop();
  }, [fetchKop]);

  async function handleDownload(fileUrl: string) {
    const res = await fetch(`/api/kops/versions?path=${encodeURIComponent(fileUrl)}`);
    const data = await res.json();
    if (data.url) {
      window.open(data.url, "_blank");
    }
  }

  async function handleView(fileUrl: string, fileType: string | null) {
    const res = await fetch(`/api/kops/versions?path=${encodeURIComponent(fileUrl)}`);
    const data = await res.json();
    if (data.url) {
      setViewingUrl(data.url);
      setViewingType(fileType);
    }
  }

  async function handleUploadVersion(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("kop_id", kopId);
    formData.append("file", file);
    if (changeNotes) formData.append("change_notes", changeNotes);

    const res = await fetch("/api/kops/versions", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      setUploadError(data.error);
      setUploading(false);
      return;
    }

    setFile(null);
    setChangeNotes("");
    setShowUpload(false);
    setUploading(false);
    fetchKop();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading KOP...</p>
      </div>
    );
  }

  if (!kop) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">KOP not found.</p>
        <Link href="/knowledgebase/kops" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to KOP library
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/knowledgebase/kops"
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        ← Back to KOP library
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* KOP info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {kop.title}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Created by {kop.author.first_name} {kop.author.last_name} ·{" "}
                  {formatDate(kop.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                  {kop.department ? kop.department.name : "Global"}
                </span>
                <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 font-medium">
                  v{kop.current_version}
                </span>
              </div>
            </div>

            {kop.description && (
              <p className="text-sm text-gray-600 mb-3">{kop.description}</p>
            )}

            {kop.category && (
              <span className="text-xs px-2 py-0.5 bg-gray-50 rounded text-gray-500">
                {kop.category}
              </span>
            )}
          </div>

          {/* Document viewer */}
          {viewingUrl && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-medium text-gray-900">
                  Document preview
                </h2>
                <button
                  onClick={() => {
                    setViewingUrl(null);
                    setViewingType(null);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Close preview
                </button>
              </div>
              <FileViewer url={viewingUrl} fileType={viewingType} />
            </div>
          )}

          {/* Version history */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-medium text-gray-900">
                Version history ({kop.versions.length})
              </h2>
              {isManager && (
                <button
                  onClick={() => setShowUpload(!showUpload)}
                  className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800"
                >
                  + Upload new version
                </button>
              )}
            </div>

            {showUpload && (
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <form onSubmit={handleUploadVersion} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      File *
                    </label>
                    <input
                      type="file"
                      required
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Change notes
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      value={changeNotes}
                      onChange={(e) => setChangeNotes(e.target.value)}
                      placeholder="What changed in this version?"
                    />
                  </div>
                  {uploadError && (
                    <p className="text-sm text-red-600">{uploadError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={uploading || !file}
                      className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "Upload"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUpload(false)}
                      className="px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {kop.versions.map((version) => (
                <div
                  key={version.id}
                  className="px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        Version {version.version_number}
                      </span>
                      {version.version_number === kop.current_version && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
                          Current
                        </span>
                      )}
                      {version.file_type && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase">
                          {version.file_type}
                        </span>
                      )}
                    </div>
                    {version.change_notes && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {version.change_notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {version.uploader.first_name} {version.uploader.last_name} ·{" "}
                      {formatDate(version.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {version.file_type &&
                      ["pdf", "doc", "docx"].includes(
                        (version.file_type || "").toLowerCase()
                      ) && (
                        <button
                          onClick={() =>
                            handleView(version.file_url, version.file_type)
                          }
                          className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-800"
                        >
                          View
                        </button>
                      )}
                    <button
                      onClick={() => handleDownload(version.file_url)}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}

              {kop.versions.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-gray-500">
                    No files uploaded yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}