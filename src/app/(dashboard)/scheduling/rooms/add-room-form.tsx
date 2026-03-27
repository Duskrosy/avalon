"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddRoomForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: "", location: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        location: form.location || null,
      }),
    });

    if (res.ok) {
      setForm({ name: "", capacity: "", location: "" });
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        + Add room
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Room name *
          </label>
          <input
            type="text"
            required
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Main Conference Room"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Capacity
          </label>
          <input
            type="number"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            placeholder="10"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Location
          </label>
          <input
            type="text"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="2nd Floor"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}