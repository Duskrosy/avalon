"use client";

import { useState, useEffect, useCallback } from "react";

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  birthday: string | null;
  is_active: boolean;
  department: { id: string; name: string; slug: string };
  role: { id: string; name: string; slug: string; tier: number };
};

type Department = { id: string; name: string; slug: string };
type Role = { id: string; name: string; slug: string; tier: number };

type UserListProps = {
  currentUserId: string;
  isOps: boolean;
  departments: Department[];
  roles: Role[];
};

export function UserList({
  currentUserId,
  isOps,
  departments,
  roles,
}: UserListProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.users) setUsers(data.users);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function startEdit(user: User) {
    setEditingId(user.id);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      department_id: user.department.id,
      role_id: user.role.id,
      birthday: user.birthday ?? "",
      phone: user.phone ?? "",
    });
  }

  async function saveEdit(userId: string) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });

    if (res.ok) {
      setEditingId(null);
      fetchUsers();
    }
  }

  async function deactivateUser(userId: string) {
    if (!confirm("Are you sure you want to deactivate this user?")) return;

    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    if (res.ok) fetchUsers();
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-medium text-gray-900">
          All users ({users.length})
        </h2>
      </div>

      <div className="divide-y divide-gray-100">
        {users.map((user) => (
          <div key={user.id} className="px-5 py-4">
            {editingId === user.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    value={editForm.first_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, first_name: e.target.value })
                    }
                    placeholder="First name"
                  />
                  <input
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    value={editForm.last_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, last_name: e.target.value })
                    }
                    placeholder="Last name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    value={editForm.department_id}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        department_id: e.target.value,
                      })
                    }
                    disabled={!isOps}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    value={editForm.role_id}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role_id: e.target.value })
                    }
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    value={editForm.birthday}
                    onChange={(e) =>
                      setEditForm({ ...editForm, birthday: e.target.value })
                    }
                  />
                  <input
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    placeholder="Phone"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(user.id)}
                    className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                    {user.first_name[0]}
                    {user.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.email} · {user.department.name} · {user.role.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(user)}
                    className="px-2.5 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  {isOps && user.id !== currentUserId && (
                    <button
                      onClick={() => deactivateUser(user.id)}
                      className="px-2.5 py-1 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {users.length === 0 && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500">No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
}