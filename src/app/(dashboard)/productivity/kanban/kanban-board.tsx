"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type Member = { id: string; first_name: string; last_name: string };

type Card = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  sort_order: number;
  assignee: { id: string; first_name: string; last_name: string } | null;
};

type Column = {
  id: string;
  board_id: string;
  name: string;
  sort_order: number;
  cards: Card[];
};

type Department = { id: string; name: string; slug: string };

type Props = {
  isOps: boolean;
  currentUserId: string;
  currentDepartmentId: string;
  departments: Department[];
};

const PRIORITY_COLORS = {
  low: "border-l-gray-300",
  medium: "border-l-blue-400",
  high: "border-l-amber-400",
  urgent: "border-l-red-500",
};

const PRIORITY_BADGE = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-50 text-blue-600",
  high: "bg-amber-50 text-amber-600",
  urgent: "bg-red-50 text-red-600",
};

export function KanbanBoard({
  isOps,
  currentUserId,
  currentDepartmentId,
  departments,
}: Props) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [boardId, setBoardId] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState(currentDepartmentId);
  const [loading, setLoading] = useState(true);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);

  // Add card form state
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    priority: "medium",
  });

  // Add column state
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/kanban?department_id=${selectedDept}`);
    const data = await res.json();
    setColumns(data.columns ?? []);
    setMembers(data.members ?? []);
    setBoardId(data.board_id ?? "");
    setLoading(false);
  }, [selectedDept]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  async function handleAddCard(columnId: string) {
    if (!newCard.title.trim()) return;

    await fetch("/api/kanban/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        column_id: columnId,
        ...newCard,
      }),
    });

    setNewCard({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium" });
    setAddingToColumn(null);
    fetchBoard();
  }

  async function handleMoveCard(cardId: string, targetColumnId: string) {
    await fetch("/api/kanban/cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cardId, column_id: targetColumnId, sort_order: 0 }),
    });
    fetchBoard();
  }

  async function handleDeleteCard(cardId: string) {
    if (!confirm("Delete this card?")) return;
    await fetch(`/api/kanban/cards?id=${cardId}`, { method: "DELETE" });
    fetchBoard();
  }

  async function handleAddColumn() {
    if (!newColumnName.trim() || !boardId) return;

    await fetch("/api/kanban/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: boardId, name: newColumnName }),
    });

    setNewColumnName("");
    setAddingColumn(false);
    fetchBoard();
  }

  async function handleDeleteColumn(columnId: string) {
    if (!confirm("Delete this column and all its cards?")) return;
    await fetch(`/api/kanban/columns?id=${columnId}`, { method: "DELETE" });
    fetchBoard();
  }

  function handleDragStart(card: Card) {
    setDraggedCard(card);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(targetColumnId: string) {
    if (draggedCard && draggedCard.column_id !== targetColumnId) {
      handleMoveCard(draggedCard.id, targetColumnId);
    }
    setDraggedCard(null);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading board...</p>
      </div>
    );
  }

  return (
    <div>
      {isOps && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDept(d.id)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors",
                selectedDept === d.id
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 hover:bg-gray-50"
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900">
                  {column.name}
                </h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {column.cards.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setAddingToColumn(column.id);
                    setNewCard({ title: "", description: "", assigned_to: "", due_date: "", priority: "medium" });
                  }}
                  className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
                >
                  +
                </button>
                <button
                  onClick={() => handleDeleteColumn(column.id)}
                  className="text-gray-300 hover:text-red-500 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[100px] bg-gray-50 rounded-xl p-2">
              {/* Add card form */}
              {addingToColumn === column.id && (
                <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                  <input
                    type="text"
                    autoFocus
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Card title"
                    value={newCard.title}
                    onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCard(column.id);
                      if (e.key === "Escape") setAddingToColumn(null);
                    }}
                  />
                  <textarea
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs resize-none"
                    rows={2}
                    placeholder="Description (optional)"
                    value={newCard.description}
                    onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                      value={newCard.assigned_to}
                      onChange={(e) => setNewCard({ ...newCard, assigned_to: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                      value={newCard.priority}
                      onChange={(e) => setNewCard({ ...newCard, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <input
                    type="date"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    value={newCard.due_date}
                    onChange={(e) => setNewCard({ ...newCard, due_date: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddCard(column.id)}
                      className="flex-1 px-2 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-800"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingToColumn(null)}
                      className="px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {column.cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card)}
                  className={cn(
                    "bg-white rounded-lg border border-gray-200 border-l-[3px] p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors",
                    PRIORITY_COLORS[card.priority]
                  )}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-gray-900 flex-1">
                      {card.title}
                    </p>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-gray-300 hover:text-red-500 text-xs ml-2 -mt-0.5"
                    >
                      ✕
                    </button>
                  </div>
                  {card.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {card.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {card.assignee && (
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-medium text-gray-500">
                          {card.assignee.first_name[0]}
                          {card.assignee.last_name[0]}
                        </div>
                      )}
                      {card.due_date && (
                        <span className="text-[10px] text-gray-400">
                          {formatDate(card.due_date)}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        PRIORITY_BADGE[card.priority]
                      )}
                    >
                      {card.priority}
                    </span>
                  </div>
                </div>
              ))}

              {column.cards.length === 0 && addingToColumn !== column.id && (
                <p className="text-xs text-gray-400 text-center py-4">
                  No cards
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Add column */}
        <div className="flex-shrink-0 w-72">
          {addingColumn ? (
            <div className="bg-gray-50 rounded-xl p-3">
              <input
                type="text"
                autoFocus
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                placeholder="Column name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") setAddingColumn(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddColumn}
                  className="flex-1 px-2 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-800"
                >
                  Add column
                </button>
                <button
                  onClick={() => setAddingColumn(false)}
                  className="px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 border-2 border-dashed border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
            >
              + Add column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}