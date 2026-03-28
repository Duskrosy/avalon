"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
};

type Department = { id: string; name: string; slug: string };

type KopsListProps = {
  isOps: boolean;
  departments: Department[];
};

export function KopsList({ isOps, departments }: KopsListProps) {
  const [kops, setKops] = useState<Kop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("all");

  const fetchKops = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDept !== "all") params.set("department_id", filterDept);

    const res = await fetch(`/api/kops?${params}`);
    const data = await res.json();
    setKops(data.kops ?? []);
    setLoading(false);
  }, [filterDept]);

  useEffect(() => {
    fetchKops();
  }, [fetchKops]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div>
      {isOps && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterDept("all")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
              filterDept === "all"
                ? "bg-gray-900 text-white"
                : "border border-gray-300 hover:bg-gray-50"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilterDept("global")}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
              filterDept === "global"
                ? "bg-gray-900 text-white"
                : "border border-gray-300 hover:bg-gray-50"
            )}
          >
            Global
          </button>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setFilterDept(d.id)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                filterDept === d.id
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 hover:bg-gray-50"
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Loading KOPs...</p>
        </div>
      ) : kops.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No KOPs found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {kops.map((kop) => (
            <Link
              key={kop.id}
              href={`/knowledgebase/kops/${kop.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-sm font-medium text-gray-900">
                  {kop.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500">
                    {kop.department ? kop.department.name : "Global"}
                  </span>
                  <span className="inline-flex px-2 py-0.5 text-[10px] rounded-full bg-blue-50 text-blue-600 font-medium">
                    v{kop.current_version}
                  </span>
                </div>
              </div>
              {kop.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  {kop.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {kop.category && (
                  <span className="px-1.5 py-0.5 bg-gray-50 rounded text-gray-500">
                    {kop.category}
                  </span>
                )}
                <span>
                  {kop.author.first_name} {kop.author.last_name}
                </span>
                <span>Updated {formatDate(kop.updated_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}