"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Loader2, CalendarClock, CheckSquare, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FollowupDatePicker } from "./FollowupDatePicker";
import { FollowupItem } from "./FollowupRescheduleModal";

interface FollowupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (item: FollowupItem) => void;
  editingItem?: FollowupItem | null;
  initialDate?: Date;
}

export function FollowupFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingItem,
  initialDate,
}: FollowupFormModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setDate(new Date(editingItem.followup_date));
    } else {
      setTitle("");
      setDate(initialDate || new Date());
    }
    setError(null);
  }, [editingItem, initialDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title for the followup");
      return;
    }
    if (!date) {
      setError("Please pick a followup date");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = editingItem ? `/api/followup/${editingItem.id}` : `/api/followup`;
      const method = editingItem ? "PATCH" : "POST";
      const body = editingItem
        ? { title: title.trim(), followup_date: date.toISOString() }
        : { title: title.trim(), followup_date: date.toISOString() };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save followup");
      }

      const item = await res.json();
      onSuccess(item);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                {editingItem ? <Edit3 className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  {editingItem ? "Edit Followup" : "New Followup"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {editingItem ? "Update your followup details" : "Schedule a new to-do reminder"}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Field 1: Title */}
          <div>
            <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Call candidate John for final round interview feedback"
              className="w-full h-12 rounded-[12px] border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-900 px-4 text-[14px] outline-none transition-all placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {/* Field 2: Date Picker */}
          <div>
            <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">
              Followup Date <span className="text-red-500">*</span>
            </label>
            <FollowupDatePicker
              value={date}
              onChange={(newDate) => setDate(newDate)}
              className="w-full"
              buttonClassName="w-full h-12"
            />
          </div>

          {error && (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-[10px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-amber-950 font-bold px-5 py-2.5 rounded-[10px] transition-all shadow-sm flex items-center gap-2 border border-amber-500/50 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  {editingItem ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" strokeWidth={3} />}
                  <span>{editingItem ? "Update Followup" : "Create Followup"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
