"use client";

import React, { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  MoreVertical,
  CalendarClock,
  Trash2,
  Edit2,
  Sparkles,
  Check,
  User,
  ListTodo,
} from "lucide-react";
import { FollowupItem } from "./FollowupRescheduleModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FollowupCalendarViewProps {
  items: FollowupItem[];
  onToggleStatus: (id: string, currentStatus: string) => Promise<void>;
  onReschedule: (item: FollowupItem) => void;
  onEdit: (item: FollowupItem) => void;
  onDelete: (id: string) => void;
  onAddNewForDate: (date: Date) => void;
}

export function FollowupCalendarView({
  items,
  onToggleStatus,
  onReschedule,
  onEdit,
  onDelete,
  onAddNewForDate,
}: FollowupCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Month navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Generate calendar days grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Group followups by day key (YYYY-MM-DD)
  const followupsByDay = useMemo(() => {
    const map = new Map<string, FollowupItem[]>();
    for (const item of items) {
      const d = new Date(item.followup_date);
      const key = format(d, "yyyy-MM-dd");
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  // Followups for currently selected day
  const selectedDayKey = format(selectedDate, "yyyy-MM-dd");
  const selectedDayTasks = followupsByDay.get(selectedDayKey) || [];

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="bg-white border border-slate-200/90 rounded-[20px] shadow-sm overflow-hidden flex flex-col">
      {/* Calendar Header Navigation */}
      <div className="p-4 sm:p-6 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/80 via-white to-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{format(currentMonth, "MMMM yyyy")}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tap any date to view tasks or schedule followups
            </p>
          </div>
        </div>

        {/* Legend + Navigation Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-wrap">
          {/* Status Legend - hidden on very small mobile, visible from md */}
          <div className="hidden md:flex items-center gap-3 mr-2 text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Due Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Done
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              Today
            </button>

            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous Month"
                className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-r border-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next Month"
                className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center">
        {weekdays.map((day, idx) => (
          <div
            key={day}
            className={cn(
              "py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider",
              idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-700"
            )}
          >
            <span className="sm:hidden">{day.charAt(0)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Days Grid - Responsive compact cell height on mobile to prevent endless scrolling */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/40">
        {calendarDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayFollowups = followupsByDay.get(dayKey) || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "min-h-[58px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col justify-between transition-all duration-150 bg-white group/cell relative cursor-pointer",
                !isCurrentMonth && "bg-slate-50/50 text-slate-400",
                isCurrentDay && !isSelected && "bg-amber-50/30",
                isSelected && "ring-2 ring-inset ring-amber-500 bg-amber-50/40 z-10"
              )}
            >
              {/* Day header: Day number + Add button on hover */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center transition-all",
                    isCurrentDay
                      ? "bg-amber-500 text-amber-950 font-black shadow-xs ring-2 ring-amber-300"
                      : isSelected
                      ? "bg-slate-900 text-white font-bold"
                      : isCurrentMonth
                      ? "text-slate-800"
                      : "text-slate-400"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Quick Add Button (visible on hover on desktop) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNewForDate(day);
                  }}
                  title={`Add followup for ${format(day, "MMM d")}`}
                  className="hidden sm:inline-flex opacity-0 group-hover/cell:opacity-100 p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Mobile View Indicators: Clean colored dots for tasks */}
              <div className="flex items-center justify-center gap-1 mt-1 sm:hidden">
                {dayFollowups.slice(0, 3).map((item) => {
                  const isCompleted = item.status === "Completed";
                  const itemDate = new Date(item.followup_date);
                  const isOverdue = !isCompleted && itemDate < startOfToday;
                  const isTodayItem = !isCompleted && isToday(itemDate);

                  return (
                    <span
                      key={item.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        isCompleted
                          ? "bg-emerald-500"
                          : isOverdue
                          ? "bg-red-500"
                          : isTodayItem
                          ? "bg-amber-500"
                          : "bg-sky-500"
                      )}
                    />
                  );
                })}
                {dayFollowups.length > 3 && (
                  <span className="text-[9px] font-bold text-slate-500">
                    +{dayFollowups.length - 3}
                  </span>
                )}
              </div>

              {/* Desktop View: Full Task Chips inside cell */}
              <div className="hidden sm:block flex-1 space-y-1 mt-1.5 overflow-hidden">
                {dayFollowups.slice(0, 3).map((item) => {
                  const isCompleted = item.status === "Completed";
                  const itemDate = new Date(item.followup_date);
                  const isOverdue = !isCompleted && itemDate < startOfToday;
                  const isTodayItem = !isCompleted && isToday(itemDate);

                  return (
                    <div
                      key={item.id}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "group/chip flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-semibold border transition-all truncate",
                        isCompleted
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 line-through opacity-70"
                          : isOverdue
                          ? "bg-red-50 text-red-800 border-red-200/90 font-bold"
                          : isTodayItem
                          ? "bg-amber-100/70 text-amber-900 border-amber-300"
                          : "bg-slate-50 text-slate-800 border-slate-200/80 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(item.id, item.status)}
                          className={cn(
                            "h-3 w-3 rounded-full border shrink-0 flex items-center justify-center transition-colors cursor-pointer",
                            isCompleted
                              ? "bg-emerald-500 border-emerald-600 text-white"
                              : isOverdue
                              ? "border-red-400 bg-white"
                              : "border-slate-400 bg-white"
                          )}
                          title={isCompleted ? "Mark pending" : "Mark done"}
                        >
                          {isCompleted && <Check className="h-2 w-2 stroke-[3]" />}
                        </button>
                        <span className="truncate">{item.title}</span>
                      </div>

                      {/* Dropdown for item actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <button
                              type="button"
                              className="opacity-0 group-hover/chip:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-700 ml-1 shrink-0 outline-none cursor-pointer"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-36 rounded-xl shadow-lg border-slate-200">
                          <DropdownMenuItem
                            onClick={() => onReschedule(item)}
                            className="text-xs flex items-center gap-2 cursor-pointer"
                          >
                            <CalendarClock className="h-3.5 w-3.5 text-amber-600" />
                            Reschedule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEdit(item)}
                            className="text-xs flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(item.id)}
                            className="text-xs flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}

                {/* More items overflow badge */}
                {dayFollowups.length > 3 && (
                  <div className="w-full text-center text-[10px] font-bold text-amber-700 bg-amber-50/80 py-0.5 rounded border border-amber-200/60">
                    +{dayFollowups.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Agenda Section (Essential on Mobile, Useful on Desktop) */}
      <div className="p-4 sm:p-5 border-t border-slate-200/90 bg-gradient-to-b from-slate-50/60 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <ListTodo className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tasks for {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedDayTasks.length === 0
                  ? "No tasks scheduled for this day"
                  : `${selectedDayTasks.length} followup task${selectedDayTasks.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAddNewForDate(selectedDate)}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 hover:text-amber-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-amber-600 stroke-[2.5]" />
            <span>Add for this day</span>
          </button>
        </div>

        {/* Selected Day Items List */}
        <div className="pt-3">
          {selectedDayTasks.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-400">
                No followups on this date. Tap <span className="font-semibold text-amber-700">Add for this day</span> to schedule one.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayTasks.map((item) => {
                const isCompleted = item.status === "Completed";
                const itemDate = new Date(item.followup_date);
                const isOverdue = !isCompleted && itemDate < startOfToday;
                const isTodayItem = !isCompleted && isToday(itemDate);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all bg-white shadow-2xs",
                      isCompleted ? "border-slate-200/70 bg-slate-50/50 opacity-80" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(item.id, item.status)}
                        className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center border transition-all cursor-pointer shrink-0",
                          isCompleted
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 hover:border-amber-500 bg-white"
                        )}
                        title={isCompleted ? "Mark pending" : "Mark complete"}
                      >
                        {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "text-xs font-semibold truncate",
                              isCompleted ? "line-through text-slate-400 font-normal" : "text-slate-900"
                            )}
                          >
                            {item.title}
                          </span>

                          {isOverdue && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 border border-red-200">
                              Overdue
                            </span>
                          )}

                          {!isCompleted && isTodayItem && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              Today
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onReschedule(item)}
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 hover:text-amber-800 bg-slate-100 hover:bg-amber-100/70 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <CalendarClock className="h-3 w-3 text-amber-600" />
                        <span className="hidden xs:inline">Reschedule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
