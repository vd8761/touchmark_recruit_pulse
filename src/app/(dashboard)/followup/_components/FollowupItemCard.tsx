"use client";

import React, { useState } from "react";
import { format, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import {
  Check,
  Calendar,
  CalendarClock,
  MoreVertical,
  Trash2,
  Edit2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Loader2,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FollowupItem } from "./FollowupRescheduleModal";
import { cn } from "@/lib/utils";

interface FollowupItemCardProps {
  item: FollowupItem;
  onToggleStatus: (id: string, currentStatus: string) => Promise<void>;
  onReschedule: (item: FollowupItem) => void;
  onEdit: (item: FollowupItem) => void;
  onDelete: (id: string) => void;
}

export function FollowupItemCard({
  item,
  onToggleStatus,
  onReschedule,
  onEdit,
  onDelete,
}: FollowupItemCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isCompleted = item.status === "Completed";
  const itemDate = new Date(item.followup_date);

  // Determine reminder state
  const isDateToday = isToday(itemDate);
  const isDateTomorrow = isTomorrow(itemDate);
  // Consider overdue if strictly before today and not completed
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isOverdue = !isCompleted && itemDate < startOfToday;
  const overdueDays = isOverdue ? Math.max(1, differenceInDays(startOfToday, itemDate)) : 0;

  const handleCheckboxClick = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onToggleStatus(item.id, item.status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center justify-between p-4 rounded-[14px] border transition-all duration-200 bg-white shadow-2xs hover:shadow-md",
        isCompleted
          ? "border-slate-200/70 bg-slate-50/50 opacity-80"
          : isOverdue
          ? "border-red-200 bg-red-50/20 hover:border-red-300"
          : isDateToday
          ? "border-amber-200 bg-amber-50/20 hover:border-amber-300"
          : "border-slate-200/90 hover:border-slate-300"
      )}
    >
      {/* Left side: Checkbox + Title + Badges */}
      <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
        {/* Interactive Checkbox */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          disabled={isUpdating}
          className={cn(
            "mt-0.5 sm:mt-0 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 border outline-none cursor-pointer hover:scale-110 active:scale-95 shadow-2xs",
            isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
              : isOverdue
              ? "border-red-400 hover:border-red-600 bg-white text-transparent hover:text-red-500 hover:bg-red-50/50"
              : isDateToday
              ? "border-amber-500 hover:border-amber-600 bg-white text-transparent hover:text-amber-600 hover:bg-amber-50/50"
              : "border-slate-300 hover:border-amber-500 bg-white text-transparent hover:text-slate-400 hover:bg-slate-50"
          )}
          title={isCompleted ? "Click to mark as pending" : "Click to mark as complete"}
          aria-label={isCompleted ? "Mark as pending" : "Mark as complete"}
        >
          {isUpdating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          ) : (
            <Check className={cn("h-3.5 w-3.5 stroke-[3]", isCompleted ? "opacity-100" : "opacity-0 hover:opacity-70 text-slate-500")} />
          )}
        </button>

        {/* Content details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "text-[15px] font-semibold tracking-tight transition-all",
                isCompleted
                  ? "line-through text-slate-400 font-normal"
                  : "text-slate-900 group-hover:text-amber-950"
              )}
            >
              {item.title}
            </span>

            {/* Reminder Badges */}
            {isOverdue && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                Overdue {overdueDays > 0 ? `(${overdueDays}d)` : ""}
              </span>
            )}

            {!isCompleted && isDateToday && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                Due Today
              </span>
            )}

            {!isCompleted && isDateTomorrow && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                Tomorrow
              </span>
            )}

            {isCompleted && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Completed
              </span>
            )}

            {item.rescheduled_count > 0 && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                title={`Rescheduled ${item.rescheduled_count} time${item.rescheduled_count > 1 ? "s" : ""}`}
              >
                <CalendarClock className="h-2.5 w-2.5 text-slate-500" />
                Rescheduled {item.rescheduled_count}x
              </span>
            )}
          </div>

          {/* Subtitle / Date & Creator meta */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1 font-medium text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {format(itemDate, "EEE, MMM d, yyyy")}
            </span>

            {item.user?.name && (
              <span className="flex items-center gap-1 text-slate-400">
                <User className="h-3 w-3" />
                <span>{item.user.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-1.5 ml-3 shrink-0">
        {/* Quick Reschedule Button */}
        <button
          type="button"
          onClick={() => onReschedule(item)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold text-slate-700 hover:text-amber-800 bg-slate-100/80 hover:bg-amber-100/80 transition-all border border-slate-200 hover:border-amber-300"
          title="Reschedule this followup"
        >
          <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
          <span className="hidden sm:inline">Reschedule</span>
        </button>

        {/* Dropdown for More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors outline-none"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-lg border border-slate-200">
            <DropdownMenuItem
              onClick={() => onToggleStatus(item.id, item.status)}
              className="flex items-center gap-2 cursor-pointer text-xs font-medium"
            >
              {isCompleted ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  Mark as Pending
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Mark Complete
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onReschedule(item)}
              className="flex items-center gap-2 cursor-pointer text-xs font-medium"
            >
              <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
              Reschedule
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onEdit(item)}
              className="flex items-center gap-2 cursor-pointer text-xs font-medium"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
              Edit Title
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onDelete(item.id)}
              className="flex items-center gap-2 cursor-pointer text-xs font-medium text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
