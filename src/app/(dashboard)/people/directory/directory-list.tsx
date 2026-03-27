"use client";

import { useState, useEffect, useCallback } from "react";

type Department = { id: string; name: string; slug: string };

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  avatar_url: string | null;
  department: { id: string; name: string; slug: string };
  role: { id: string; name: string; slug: string; tier: number };
};

type DirectoryListProps = {
  isOps: boolean;
  departments: Department[];
};

export function DirectoryList({ isOps, departments }: DirectoryListProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("all");
  const [search, setSearch] = useState("");

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDept !== "all") params.set("department_id", filterDept);

    const res = await fetch(`/api/directory?${params}`);
    const data = await res.json();
    setEmployees(data.employees ?? []);
    setLoading(false);
  }, [filterDept]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filtered = search
    ? employees.filter(
        (e) =>
          `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase()) ||
          e.role.name.toLowerCase().includes(search.toLowerCase())
      )
    : employees;

  // Group by department
  const grouped = new Map<string, Employee[]>();
  for (const emp of filtered) {
    const deptName = emp.department.name;
    if (!grouped.has(deptName)) grouped.set(deptName, []);
    grouped.get(deptName)!.push(emp);
  }

  function formatBirthday(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const tierColors: Record<number, string> = {
    1: "bg-purple-100 text-purple-700",
    2: "bg-blue-100 text-blue-700",
    3: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isOps && (
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Loading directory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No employees found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([deptName, emps]) => (
            <div key={deptName}>
              {isOps && filterDept === "all" && (
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
                  {deptName} ({emps.length})
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {emps.map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {emp.first_name[0]}
                        {emp.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded-full mt-0.5 ${
                            tierColors[emp.role.tier] || tierColors[3]
                          }`}
                        >
                          {emp.role.name}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-500 truncate">
                        {emp.email}
                      </p>
                      {emp.phone && (
                        <p className="text-xs text-gray-500">{emp.phone}</p>
                      )}
                      {emp.birthday && (
                        <p className="text-xs text-gray-400">
                          Birthday: {formatBirthday(emp.birthday)}
                        </p>
                      )}
                    </div>

                    {isOps && (
                      <p className="text-[10px] text-gray-400 mt-2">
                        {emp.department.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}