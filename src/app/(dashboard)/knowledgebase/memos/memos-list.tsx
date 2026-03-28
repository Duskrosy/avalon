"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Memo = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  department: { id: string; name: string; slug: string } | null;
  author: { first_name: string; last_name: string };
  signatures: { id: string }[];
};

export function MemosList({ currentUserId }: { currentUserId: string }) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemos = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/memos");
    const data = await res.json();
    setMemos(data.memos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMemos();
  }, [fetchMemos]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading memos...</p>
      </div>
    );
  }

  if (memos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">No memos yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {memos.map((memo) => {
        const sigCount = memo.signatures?.length ?? 0;

        return (
          <Link
            key={memo.id}
            href={`/knowledgebase/memos/${memo.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {memo.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {memo.author.first_name} {memo.author.last_name} ·{" "}
                  {formatDate(memo.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                  {memo.department ? memo.department.name : "Global"}
                </span>
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 text-[10px] rounded-full font-medium",
                    sigCount > 0
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-400"
                  )}
                >
                  {sigCount} signed
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">
              {memo.content}
            </p>
          </Link>
        );
      })}
    </div>
  );
}