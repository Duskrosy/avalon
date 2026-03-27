"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ResolvedNavigation } from "@/lib/permissions/types";

const masterGroupIcons: Record<string, string> = {
  analytics: "📊",
  knowledgebase: "📚",
  people: "👥",
  productivity: "✅",
  scheduling: "📅",
  communications: "📢",
};

type SidebarProps = {
  navigation: ResolvedNavigation;
  userName: string;
  departmentName: string;
};

export function Sidebar({ navigation, userName, departmentName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      <div className="p-6 border-b border-gray-100">
        <Link href="/" className="text-xl font-semibold text-gray-900">
          Avalon
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1",
            pathname === "/"
              ? "bg-gray-100 text-gray-900 font-medium"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <span className="text-base">🏠</span>
          Dashboard
        </Link>

        {navigation.map((group) => (
          <div key={group.masterGroup.slug} className="mt-5">
            <p className="px-3 mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {group.masterGroup.name}
            </p>
            {group.views.map((view) => (
              <Link
                key={view.slug}
                href={view.route}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  pathname === view.route || pathname.startsWith(view.route + "/")
                    ? "bg-gray-100 text-gray-900 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className="text-base">
                  {masterGroupIcons[group.masterGroup.slug] || "•"}
                </span>
                {view.name}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-medium">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userName}
            </p>
            <p className="text-xs text-gray-500 truncate">{departmentName}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}