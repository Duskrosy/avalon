"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Signature = {
  id: string;
  signed_at: string;
  signer: { id: string; first_name: string; last_name: string };
};

type Target = {
  id: string;
  first_name: string;
  last_name: string;
};

type Memo = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  department: { id: string; name: string; slug: string } | null;
  author: { first_name: string; last_name: string };
  signatures: Signature[];
};

type MemoDetailProps = {
  memoId: string;
  currentUserId: string;
};

export function MemoDetail({ memoId, currentUserId }: MemoDetailProps) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const fetchMemo = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/memos?id=${memoId}`);
    const data = await res.json();
    setMemo(data.memo ?? null);
    setTargets(data.targets ?? []);
    setLoading(false);
  }, [memoId]);

  useEffect(() => {
    fetchMemo();
  }, [fetchMemo]);

  async function handleSign() {
    setSigning(true);
    const res = await fetch("/api/memos/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo_id: memoId }),
    });

    if (res.ok) {
      fetchMemo();
    }
    setSigning(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading memo...</p>
      </div>
    );
  }

  if (!memo) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">Memo not found.</p>
        <Link href="/knowledgebase/memos" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          Back to memos
        </Link>
      </div>
    );
  }

  const signedIds = new Set(memo.signatures.map((s) => s.signer.id));
  const hasSigned = signedIds.has(currentUserId);
  const signedCount = memo.signatures.length;
  const totalCount = targets.length;
  const unsignedTargets = targets.filter((t) => !signedIds.has(t.id));

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div>
      <Link
        href="/knowledgebase/memos"
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        ← Back to memos
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Memo content */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {memo.title}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  By {memo.author.first_name} {memo.author.last_name} ·{" "}
                  {formatDate(memo.created_at)}
                </p>
              </div>
              <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                {memo.department ? memo.department.name : "Global"}
              </span>
            </div>

            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap border-t border-gray-100 pt-4">
              {memo.content}
            </div>

            {/* Sign button */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              {hasSigned ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13.3 4.3L6 11.6L2.7 8.3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  You have signed this memo
                </div>
              ) : (
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {signing ? "Signing..." : "Sign this memo"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Signature tracker */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-gray-900">
                Signatures
              </h2>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  signedCount === totalCount && totalCount > 0
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {signedCount}/{totalCount}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  signedCount === totalCount && totalCount > 0
                    ? "bg-green-500"
                    : "bg-blue-500"
                )}
                style={{
                  width: totalCount > 0 ? `${(signedCount / totalCount) * 100}%` : "0%",
                }}
              />
            </div>

            {/* Signed list */}
            {memo.signatures.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Signed</p>
                <div className="space-y-2">
                  {memo.signatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px] font-medium text-green-700">
                          {sig.signer.first_name[0]}
                          {sig.signer.last_name[0]}
                        </div>
                        <span className="text-sm text-gray-900">
                          {sig.signer.first_name} {sig.signer.last_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(sig.signed_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unsigned list */}
            {unsignedTargets.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Pending ({unsignedTargets.length})
                </p>
                <div className="space-y-2">
                  {unsignedTargets.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-400">
                        {t.first_name[0]}
                        {t.last_name[0]}
                      </div>
                      <span className="text-sm text-gray-400">
                        {t.first_name} {t.last_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}