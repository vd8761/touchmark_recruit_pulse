"use client";

import React, { useState } from "react";
import { format, addDays } from "date-fns";
import { CalendarClock, X, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FollowupDatePicker } from "./FollowupDatePicker";

export interface FollowupItem {
  id: string;
  title: string;
  followup_date: string;
  status: string;
  rescheduled_count: number;
  last_rescheduled_at: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface FollowupRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  followup: FollowupItem | null;
  onSuccess: (updated: FollowupItem) => void;
}

export function FollowupRescheduleModal({
  isOpen,
  onClose,
  followup,
  onSuccess,
}: FollowupRescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected date when modal opens with a followup
  React.useEffect(() => {
    if (followup) {
      const current = new Date(followup.followup_date);
      // Default reschedule date to tomorrow or current date + 1 day
      const defaultNewDate = addDays(new Date(), 1);
      setSelectedDate(defaultNewDate > current ? defaultNewDate : addDays(current, 1));
      setError(null);
    }
  }, [followup, isOpen]);

  if (!followup) return null;

  const currentFormatted = format(new Date(followup.followup_date), "PPP");

  const handleQuickSelect = (daysToAdd: number) => {
    setSelectedDate(addDays(new Date(), daysToAdd));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedDate) {
      setError("Please select a new date");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/followup/${followup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followup_date: selectedDate.toISOString(),
          is_reschedule: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reschedule followup");
      }

      const updated = await res.json();
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to reschedule. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-b from-amber-50/60 to-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  Reschedule Followup
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Update the date and postpone your task reminder
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
          {/* Item details card */}
          <div className="p-3.5 bg-slate-50 rounded-[12px] border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Current Followup
            </span>
            <p className="text-[14px] font-semibold text-slate-800 line-clamp-2">
              {followup.title}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span>Scheduled for:</span>
              <span className="font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                {currentFormatted}
              </span>
              {followup.rescheduled_count > 0 && (
                <span className="text-slate-400 text-[11px]">
                  (Rescheduled {followup.rescheduled_count}x)
                </span>
              )}
            </div>
          </div>

          {/* Quick Reschedule Presets */}
          <div>
            <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">
              Quick Options
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Tomorrow", days: 1 },
                { label: "+2 Days", days: 2 },
                { label: "+3 Days", days: 3 },
                { label: "Next Week", days: 7 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleQuickSelect(opt.days)}
                  className="py-2 px-3 text-xs font-semibold rounded-[10px] border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40 hover:text-amber-700 text-slate-700 transition-all text-center shadow-2xs active:scale-95"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker Field */}
          <div>
            <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">
              New Followup Date <span className="text-red-500">*</span>
            </label>
            <FollowupDatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
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
                  <span>Rescheduling...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Confirm Reschedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
