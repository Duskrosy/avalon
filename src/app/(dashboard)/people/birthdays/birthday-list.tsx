"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  birthday: string | null;
  department: { id: string; name: string };
};

type BirthdayEntry = {
  employee: Employee;
  daysUntil: number;
  nextBirthday: Date;
  age: number | null;
};

export function BirthdayList({ currentUserId }: { currentUserId: string }) {
  const [entries, setEntries] = useState<BirthdayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBirthdays = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/directory");
    const data = await res.json();
    const employees: Employee[] = data.employees ?? [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthdayEntries: BirthdayEntry[] = [];

    for (const emp of employees) {
      if (!emp.birthday) continue;

      const bday = new Date(emp.birthday + "T12:00:00");
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

      if (thisYear < today) {
        thisYear.setFullYear(today.getFullYear() + 1);
      }

      const diffMs = thisYear.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      const age = thisYear.getFullYear() - bday.getUTCFullYear();

      birthdayEntries.push({
        employee: emp,
        daysUntil,
        nextBirthday: thisYear,
        age,
      });
    }

    birthdayEntries.sort((a, b) => a.daysUntil - b.daysUntil);
    setEntries(birthdayEntries);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBirthdays();
  }, [fetchBirthdays]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading birthdays...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">
          No birthday data available. Make sure birthdays are set in user profiles.
        </p>
      </div>
    );
  }

  // Split into sections
  const today = entries.filter((e) => e.daysUntil === 0);
  const thisWeek = entries.filter((e) => e.daysUntil > 0 && e.daysUntil <= 7);
  const thisMonth = entries.filter((e) => e.daysUntil > 7 && e.daysUntil <= 30);
  const later = entries.filter((e) => e.daysUntil > 30);

  return (
    <div className="space-y-6">
      {today.length > 0 && (
        <BirthdaySection
          title="Today 🎉"
          entries={today}
          currentUserId={currentUserId}
          highlight
        />
      )}
      {thisWeek.length > 0 && (
        <BirthdaySection
          title="This week"
          entries={thisWeek}
          currentUserId={currentUserId}
        />
      )}
      {thisMonth.length > 0 && (
        <BirthdaySection
          title="This month"
          entries={thisMonth}
          currentUserId={currentUserId}
        />
      )}
      {later.length > 0 && (
        <BirthdaySection
          title="Upcoming"
          entries={later}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

function BirthdaySection({
  title,
  entries,
  currentUserId,
  highlight = false,
}: {
  title: string;
  entries: BirthdayEntry[];
  currentUserId: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-gray-500 mb-2">{title}</h2>
      <div
        className={cn(
          "bg-white rounded-xl border overflow-hidden",
          highlight ? "border-amber-300" : "border-gray-200"
        )}
      >
        <div className="divide-y divide-gray-50">
          {entries.map((entry) => {
            const isYou = entry.employee.id === currentUserId;
            const dateLabel = entry.nextBirthday.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={entry.employee.id}
                className={cn(
                  "px-5 py-4 flex items-center justify-between",
                  entry.daysUntil === 0 && "bg-amber-50/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                      entry.daysUntil === 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {entry.employee.first_name[0]}
                    {entry.employee.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.employee.first_name} {entry.employee.last_name}
                      {isYou && (
                        <span className="text-xs text-gray-400 ml-1">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.employee.department.name}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-900">{dateLabel}</p>
                  <p className="text-xs text-gray-400">
                    {entry.daysUntil === 0
                      ? "Today!"
                      : entry.daysUntil === 1
                      ? "Tomorrow"
                      : `In ${entry.daysUntil} days`}
                    {entry.age && entry.age > 0 && entry.age < 120 && (
                      <span> · Turning {entry.age}</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}