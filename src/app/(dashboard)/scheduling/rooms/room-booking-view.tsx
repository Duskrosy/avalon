"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Room = {
  id: string;
  name: string;
  capacity: number | null;
  location: string | null;
};

type Booking = {
  id: string;
  room_id: string;
  booked_by: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  room: { id: string; name: string; location: string | null; capacity: number | null };
  booker: { first_name: string; last_name: string };
};

type Props = {
  currentUserId: string;
  isOps: boolean;
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM

export function RoomBookingView({ currentUserId, isOps }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);

  // Booking form state
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    start_hour: "9",
    start_min: "00",
    end_hour: "10",
    end_min: "00",
    notes: "",
  });

  const fetchRooms = useCallback(async () => {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    const roomList = data.rooms ?? [];
    setRooms(roomList);
    if (roomList.length > 0 && !selectedRoom) {
      setSelectedRoom(roomList[0].id);
    }
  }, [selectedRoom]);

  const fetchBookings = useCallback(async () => {
    if (!selectedRoom || !selectedDate) return;
    setLoading(true);

    const dayStart = `${selectedDate}T00:00:00`;
    const dayEnd = `${selectedDate}T23:59:59`;

    const res = await fetch(
      `/api/bookings?room_id=${selectedRoom}&start=${dayStart}&end=${dayEnd}`
    );
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  }, [selectedRoom, selectedDate]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (selectedRoom) fetchBookings();
  }, [selectedRoom, selectedDate, fetchBookings]);

  function getBookingForHour(hour: number): Booking | null {
    return (
      bookings.find((b) => {
        const start = new Date(b.start_time);
        const end = new Date(b.end_time);
        const slotStart = new Date(`${selectedDate}T${String(hour).padStart(2, "0")}:00:00`);
        const slotEnd = new Date(`${selectedDate}T${String(hour + 1).padStart(2, "0")}:00:00`);
        return start < slotEnd && end > slotStart;
      }) ?? null
    );
  }

  function isSlotStart(booking: Booking, hour: number): boolean {
    const start = new Date(booking.start_time);
    return start.getHours() === hour;
  }

  function getBookingSpan(booking: Booking): number {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const startTime = `${selectedDate}T${form.start_hour.padStart(2, "0")}:${form.start_min}:00`;
    const endTime = `${selectedDate}T${form.end_hour.padStart(2, "0")}:${form.end_min}:00`;

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: selectedRoom,
        title: form.title,
        start_time: startTime,
        end_time: endTime,
        notes: form.notes || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setFormError(data.error);
      setFormLoading(false);
      return;
    }

    setForm({ title: "", start_hour: "9", start_min: "00", end_hour: "10", end_min: "00", notes: "" });
    setShowForm(false);
    setFormLoading(false);
    fetchBookings();
  }

  async function cancelBooking(id: string) {
    if (!confirm("Cancel this booking?")) return;
    const res = await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchBookings();
  }

  function navigateDay(offset: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);
  const dateLabel = new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (rooms.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">
          No rooms available. {isOps ? "Add a room using the button above." : "Ask OPS to add rooms."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {/* Room selector + date nav */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room.id)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-colors",
                  selectedRoom === room.id
                    ? "bg-gray-900 text-white"
                    : "border border-gray-300 hover:bg-gray-50"
                )}
              >
                {room.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateDay(-1)}
              className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-xs"
            >
              Today
            </button>
            <button
              onClick={() => navigateDay(1)}
              className="px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{dateLabel}</p>
              {selectedRoomData && (
                <p className="text-xs text-gray-500">
                  {selectedRoomData.name}
                  {selectedRoomData.capacity && ` · ${selectedRoomData.capacity} seats`}
                  {selectedRoomData.location && ` · ${selectedRoomData.location}`}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-800"
            >
              + Book slot
            </button>
          </div>

          {/* Timeline */}
          <div className="divide-y divide-gray-50">
            {HOURS.map((hour) => {
              const booking = getBookingForHour(hour);
              const isStart = booking ? isSlotStart(booking, hour) : false;
              const timeLabel = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;

              // Skip rendering if this slot is part of a multi-hour booking but not the start
              if (booking && !isStart) return null;

              const span = booking ? getBookingSpan(booking) : 1;
              const canCancel = booking && (booking.booked_by === currentUserId || isOps);

              return (
                <div
                  key={hour}
                  className="flex"
                  style={{ minHeight: `${span * 52}px` }}
                >
                  <div className="w-20 flex-shrink-0 px-3 py-3 text-xs text-gray-400 text-right border-r border-gray-100">
                    {timeLabel}
                  </div>
                  <div className="flex-1 px-4 py-2">
                    {booking ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 h-full flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {booking.title}
                          </p>
                          <p className="text-xs text-blue-600">
                            {booking.booker.first_name} {booking.booker.last_name}
                            {" · "}
                            {new Date(booking.start_time).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {new Date(booking.end_time).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          {booking.notes && (
                            <p className="text-xs text-blue-500 mt-1">
                              {booking.notes}
                            </p>
                          )}
                        </div>
                        {canCancel && (
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            className="text-xs text-blue-400 hover:text-red-500 ml-2"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center">
                        <p className="text-xs text-gray-300">Available</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking form sidebar */}
      <div>
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-medium text-gray-900 mb-4">
              Book a slot
            </h2>
            <form onSubmit={handleBook} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Team standup"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start time *
                  </label>
                  <div className="flex gap-1">
                    <select
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      value={form.start_hour}
                      onChange={(e) => setForm({ ...form, start_hour: e.target.value })}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={String(h)}>
                          {h > 12 ? h - 12 : h} {h >= 12 ? "PM" : "AM"}
                        </option>
                      ))}
                    </select>
                    <select
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      value={form.start_min}
                      onChange={(e) => setForm({ ...form, start_min: e.target.value })}
                    >
                      <option value="00">:00</option>
                      <option value="15">:15</option>
                      <option value="30">:30</option>
                      <option value="45">:45</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    End time *
                  </label>
                  <div className="flex gap-1">
                    <select
                      className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      value={form.end_hour}
                      onChange={(e) => setForm({ ...form, end_hour: e.target.value })}
                    >
                      {HOURS.map((h) => (
                        <option key={h} value={String(h)}>
                          {h > 12 ? h - 12 : h} {h >= 12 ? "PM" : "AM"}
                        </option>
                      ))}
                    </select>
                    <select
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      value={form.end_min}
                      onChange={(e) => setForm({ ...form, end_min: e.target.value })}
                    >
                      <option value="00">:00</option>
                      <option value="15">:15</option>
                      <option value="30">:30</option>
                      <option value="45">:45</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm resize-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {formLoading ? "Booking..." : "Book room"}
              </button>
            </form>
          </div>
        )}

        {/* Today's bookings summary */}
        <div className={cn("bg-white rounded-xl border border-gray-200 p-5", showForm && "mt-4")}>
          <h2 className="text-base font-medium text-gray-900 mb-3">
            Today&apos;s bookings
          </h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-gray-500">No bookings for this day.</p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {b.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(b.start_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(b.end_time).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" · "}
                    {b.booker.first_name} {b.booker.last_name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}