"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  type: "leave" | "booking" | "birthday" | "task" | "goal";
  color: string;
  meta?: string;
};

const EVENT_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  leave: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  booking: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  birthday: { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-400" },
  task: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  goal: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-400" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_LABELS: Record<string, string> = {
  leave: "Leaves",
  booking: "Bookings",
  birthday: "Birthdays",
  task: "Tasks",
  goal: "Goals",
};

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(["leave", "booking", "birthday", "task", "goal"])
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/calendar?month=${currentMonth}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function navigateMonth(offset: number) {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setCurrentMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
    setSelectedDate(null);
  }

  function goToToday() {
    const now = new Date();
    setCurrentMonth(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
    setSelectedDate(now.toISOString().split("T")[0]);
  }

  function toggleFilter(type: string) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  // Build calendar grid
  const [year, month] = currentMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Filter events
  const filteredEvents = events.filter((e) => activeFilters.has(e.type));

  function getEventsForDate(dateStr: string): CalendarEvent[] {
    return filteredEvents.filter((e) => {
      if (e.end_date) {
        return dateStr >= e.date && dateStr <= e.end_date;
      }
      return e.date === dateStr;
    });
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Build grid cells
  const cells: { day: number | null; dateStr: string }[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: "" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      dateStr: `${currentMonth}-${String(d).padStart(2, "0")}`,
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              ←
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-xs"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              →
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {Object.entries(EVENT_LABELS).map(([type, label]) => {
            const style = EVENT_STYLES[type];
            const active = activeFilters.has(type);
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors",
                  active
                    ? `${style.bg} ${style.text} border-transparent`
                    : "bg-white text-gray-400 border-gray-200"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", active ? style.dot : "bg-gray-300")} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => {
              if (!cell.day) {
                return <div key={i} className="min-h-[90px] border-b border-r border-gray-50 bg-gray-50/30" />;
              }

              const dayEvents = getEventsForDate(cell.dateStr);
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={cn(
                    "min-h-[90px] border-b border-r border-gray-50 p-1.5 text-left transition-colors",
                    isSelected && "bg-blue-50/50",
                    !isSelected && "hover:bg-gray-50/50"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex w-6 h-6 items-center justify-center text-xs rounded-full mb-1",
                      isToday
                        ? "bg-gray-900 text-white font-medium"
                        : "text-gray-700"
                    )}
                  >
                    {cell.day}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const style = EVENT_STYLES[evt.type];
                      return (
                        <div
                          key={evt.id}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded truncate",
                            style.bg,
                            style.text
                          )}
                        >
                          {evt.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-gray-400 px-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sidebar — selected day detail */}
      <div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-base font-medium text-gray-900 mb-3">
            {selectedDate
              ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })
              : "Select a day"}
          </h3>

          {!selectedDate ? (
            <p className="text-sm text-gray-500">
              Click on a date to see its events.
            </p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing scheduled.</p>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map((evt) => {
                const style = EVENT_STYLES[evt.type];
                return (
                  <div
                    key={evt.id}
                    className={cn("p-3 rounded-lg", style.bg)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", style.dot)} />
                      <span className={cn("text-xs font-medium uppercase tracking-wide", style.text)}>
                        {evt.type}
                      </span>
                    </div>
                    <p className={cn("text-sm font-medium", style.text)}>
                      {evt.title}
                    </p>
                    {evt.meta && (
                      <p className="text-xs text-gray-500 mt-0.5">{evt.meta}</p>
                    )}
                    {evt.end_date && evt.end_date !== evt.date && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Until{" "}
                        {new Date(evt.end_date + "T12:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Month summary */}
        {!loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              This month
            </h3>
            <div className="space-y-2">
              {Object.entries(EVENT_LABELS).map(([type, label]) => {
                const count = filteredEvents.filter((e) => e.type === type).length;
                const style = EVENT_STYLES[type];
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", style.dot)} />
                      <span className="text-xs text-gray-600">{label}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}