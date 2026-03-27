"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  created_by: string;
  created_at: string;
  expires_at: string | null;
  department: { id: string; name: string; slug: string } | null;
  author: { first_name: string; last_name: string };
};

type AnnouncementsFeedProps = {
  currentUserId: string;
  isOps: boolean;
  isManager: boolean;
};

const PRIORITY_STYLES = {
  normal: "border-gray-200",
  important: "border-amber-300 bg-amber-50/30",
  urgent: "border-red-300 bg-red-50/30",
};

const PRIORITY_BADGE = {
  normal: "",
  important: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export function AnnouncementsFeed({
  currentUserId,
  isOps,
  isManager,
}: AnnouncementsFeedProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/announcements");
    const data = await res.json();
    setAnnouncements(data.announcements ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchAnnouncements();
  }

  function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading announcements...</p>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">No announcements yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((a) => {
        const canDelete = isOps || a.created_by === currentUserId;

        return (
          <div
            key={a.id}
            className={cn(
              "bg-white rounded-xl border p-5",
              PRIORITY_STYLES[a.priority]
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900">
                  {a.title}
                </h3>
                {a.priority !== "normal" && (
                  <span
                    className={cn(
                      "inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wide",
                      PRIORITY_BADGE[a.priority]
                    )}
                  >
                    {a.priority}
                  </span>
                )}
                <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                  {a.department ? a.department.name : "Global"}
                </span>
              </div>
              {canDelete && (
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>

            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {a.content}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                {a.author.first_name[0]}
                {a.author.last_name[0]}
              </div>
              <p className="text-xs text-gray-400">
                {a.author.first_name} {a.author.last_name} · {timeAgo(a.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}