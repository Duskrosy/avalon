"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { QA_TIER_KEYS, QA_TIERS } from "@/lib/sales/constants";
import type { QaLog, SalesAgent } from "@/lib/sales/types";

type Props = {
  open: boolean;
  onClose: () => void;
  editingId: string | null;
  agents: SalesAgent[];
  entries: QaLog[];
  onSaved: () => void;
};

const emptyForm = {
  agent_id: "", qa_date: "", message_link: "", qa_tier: "",
  qa_reason: "", evaluator: "", notes: "",
};

export function QaDrawer({ open, onClose, editingId, agents, entries, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingId) {
      const row = entries.find(e => e.id === editingId);
      if (row) {
        setForm({
          agent_id: row.agent_id, qa_date: row.qa_date, message_link: row.message_link,
          qa_tier: row.qa_tier, qa_reason: row.qa_reason, evaluator: row.evaluator,
          notes: row.notes || "",
        });
      }
    } else {
      setForm({ ...emptyForm, qa_date: new Date().toISOString().split("T")[0] });
    }
    setErrors({});
  }, [open, editingId, entries]);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.agent_id) e.agent_id = "Select an agent";
    if (!form.qa_date) e.qa_date = "Date is required";
    if (!form.message_link.trim()) e.message_link = "Message link is required";
    else {
      try { const u = new URL(form.message_link.trim()); if (!u.hostname) throw new Error(); }
      catch { e.message_link = "Please enter a valid URL"; }
    }
    if (!form.qa_tier) e.qa_tier = "Select a QA tier";
    if (!form.qa_reason.trim()) e.qa_reason = "Reason is required";
    if (!form.evaluator.trim()) e.evaluator = "Evaluator is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);

    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { id: editingId, ...form } : form;

    const res = await fetch("/api/sales/qa", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setErrors({ _form: data.error });
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
    onSaved();
  }

  // Computed preview
  const tierInfo = form.qa_tier ? QA_TIERS[form.qa_tier as keyof typeof QA_TIERS] : null;

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/40 z-[1000]" />
      <div className="fixed top-0 right-0 bottom-0 w-[580px] bg-white z-[1001] shadow-2xl flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-900">
            {editingId ? "Edit QA entry" : "Add QA entry"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200">Core input</div>

          <Field label="Agent" required error={errors.agent_id}>
            <select value={form.agent_id} onChange={e => update("agent_id", e.target.value)}
              className={cn("w-full px-3 py-2 rounded-md border text-sm", errors.agent_id ? "border-red-500" : "border-gray-200")}>
              <option value="">Select agent...</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
            </select>
          </Field>

          <Field label="QA date" required error={errors.qa_date}>
            <input type="date" value={form.qa_date} onChange={e => update("qa_date", e.target.value)}
              className={cn("w-full px-3 py-2 rounded-md border text-sm", errors.qa_date ? "border-red-500" : "border-gray-200")} />
          </Field>

          <Field label="Message link" required error={errors.message_link}>
            <input value={form.message_link} onChange={e => update("message_link", e.target.value)}
              placeholder="https://pancake.ph/conversations/..."
              className={cn("w-full px-3 py-2 rounded-md border text-sm", errors.message_link ? "border-red-500" : "border-gray-200")} />
            {form.message_link && !errors.message_link && (
              <a href={form.message_link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 mt-1 inline-block">Open link ↗</a>
            )}
          </Field>

          <Field label="Reason" required error={errors.qa_reason}>
            <input value={form.qa_reason} onChange={e => update("qa_reason", e.target.value)}
              placeholder="Reason for the QA flag..."
              className={cn("w-full px-3 py-2 rounded-md border text-sm", errors.qa_reason ? "border-red-500" : "border-gray-200")} />
          </Field>

          <Field label="QA tier" required error={errors.qa_tier}>
            <div className="flex gap-2">
              {QA_TIER_KEYS.map(t => {
                const active = form.qa_tier === t;
                const isFail = t === "Fail";
                return (
                  <button key={t} onClick={() => update("qa_tier", t)}
                    className={cn("flex-1 py-2 rounded-md text-sm font-semibold border transition-colors text-center",
                      active ? (isFail ? "border-red-500 bg-red-50 text-red-700" : t === "Tier 3" ? "border-green-600 bg-green-50 text-green-700" : t === "Tier 1" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-gray-400 bg-gray-100 text-gray-700")
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}>
                    {t}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Evaluator" required error={errors.evaluator}>
            <input value={form.evaluator} onChange={e => update("evaluator", e.target.value)}
              placeholder="Who evaluated this?"
              className={cn("w-full px-3 py-2 rounded-md border text-sm", errors.evaluator ? "border-red-500" : "border-gray-200")} />
          </Field>

          <Field label="Notes">
            <textarea rows={3} value={form.notes} onChange={e => update("notes", e.target.value)}
              placeholder="Additional context (optional)..."
              className="w-full px-3 py-2 rounded-md border border-gray-200 text-sm resize-none" />
          </Field>

          {/* Computed */}
          <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-200 mt-6">QA scoring</div>

          {tierInfo ? (
            <>
              <div className="px-3 py-2 rounded-md bg-gray-100 border border-dashed border-gray-300">
                <p className="text-xs text-gray-500 mb-1">QA points</p>
                <p className={cn("text-lg font-semibold", tierInfo.fail ? "text-red-600" : "text-gray-900")}>
                  {tierInfo.points} points
                </p>
                <p className="text-[11px] text-gray-500">{form.qa_tier} → {tierInfo.points} pts</p>
              </div>
              <div className="px-3 py-2 rounded-md bg-gray-100 border border-dashed border-gray-300">
                <p className="text-xs text-gray-500 mb-1">QA fail</p>
                {tierInfo.fail ? (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 rounded">FAIL</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700 rounded">PASS</span>
                )}
              </div>
              {tierInfo.fail && (
                <div className="px-3 py-2 rounded-md bg-red-50 text-xs text-red-600">
                  FPS will be capped at 60 for this day.
                </div>
              )}
            </>
          ) : (
            <div className="px-4 py-3 rounded-lg bg-gray-50 text-sm text-gray-500">
              Select a QA tier to see scoring.
            </div>
          )}

          {errors._form && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{errors._form}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-md border border-gray-900 text-sm font-semibold text-gray-900 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="px-6 py-2 rounded-md bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50">
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}