"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LearningList } from "./learning-list";
import { AddMaterialForm } from "./add-material-form";
import { LearningProgress } from "./learning-progress";

type Department = { id: string; name: string; slug: string };

type LearningTabsProps = {
  isOps: boolean;
  isManager: boolean;
  currentDepartmentId: string;
  departments: Department[];
};

export function LearningTabs({
  isOps,
  isManager,
  currentDepartmentId,
  departments,
}: LearningTabsProps) {
  const [tab, setTab] = useState<"materials" | "progress">("materials");

  return (
    <div>
      {isManager && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("materials")}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-colors",
              tab === "materials"
                ? "bg-gray-900 text-white"
                : "border border-gray-300 hover:bg-gray-50"
            )}
          >
            Materials
          </button>
          <button
            onClick={() => setTab("progress")}
            className={cn(
              "px-4 py-2 text-sm rounded-lg transition-colors",
              tab === "progress"
                ? "bg-gray-900 text-white"
                : "border border-gray-300 hover:bg-gray-50"
            )}
          >
            Team progress
          </button>
        </div>
      )}

      {tab === "materials" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LearningList
              isOps={isOps}
              isManager={isManager}
              departments={departments}
            />
          </div>
          {isManager && (
            <div>
              <AddMaterialForm
                isOps={isOps}
                currentDepartmentId={currentDepartmentId}
                departments={departments}
              />
            </div>
          )}
        </div>
      ) : (
        <LearningProgress
          isOps={isOps}
          currentDepartmentId={currentDepartmentId}
          departments={departments}
        />
      )}
    </div>
  );
}