"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CalendarClock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  CalendarDays,
  Bell,
  ArrowRight,
  List,
} from "lucide-react";
import { FollowupDatePicker } from "./_components/FollowupDatePicker";
import { FollowupFormModal } from "./_components/FollowupFormModal";
import { FollowupRescheduleModal, FollowupItem } from "./_components/FollowupRescheduleModal";
import { FollowupItemCard } from "./_components/FollowupItemCard";
import { FollowupCalendarView } from "./_components/FollowupCalendarView";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "due_today" | "overdue" | "upcoming" | "completed";

export function FollowupClient() {
  const [items, setItems] = useState<FollowupItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | undefined>(undefined);

  // Quick Inline Add State
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDate, setQuickDate] = useState<Date>(new Date());
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FollowupItem | null>(null);

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleItem, setRescheduleItem] = useState<FollowupItem | null>(null);

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Fetch followups from API
  const fetchFollowups = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.set("filter", activeTab);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/followup?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
        if (json.stats) {
          setStats(json.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching followups:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  // Quick inline add handler
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) {
      setQuickError("Please enter a title");
      return;
    }

    setIsQuickAdding(true);
    setQuickError(null);

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickTitle.trim(),
          followup_date: (quickDate || new Date()).toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create followup");
      }

      setQuickTitle("");
      setQuickDate(new Date());
      fetchFollowups();
    } catch (err: any) {
      setQuickError(err.message || "Failed to add followup");
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Toggle status handler
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";

    // Optimistic update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );

    try {
      const res = await fetch(`/api/followup/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Rollback
        fetchFollowups();
      } else {
        fetchFollowups();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
      fetchFollowups();
    }
  };

  // Reschedule handler
  const handleOpenReschedule = (item: FollowupItem) => {
    setRescheduleItem(item);
    setIsRescheduleModalOpen(true);
  };

  // Edit handler
  const handleOpenEdit = (item: FollowupItem) => {
    setEditingItem(item);
    setIsFormModalOpen(true);
  };

  // Delete handler
  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const res = await fetch(`/api/followup/${itemToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== itemToDelete));
        fetchFollowups();
      }
    } catch (err) {
      console.error("Failed to delete followup:", err);
    } finally {
      setItemToDelete(null);
    }
  };

  // Calculation for progress percentage
  const completionPercentage = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }, [stats]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Followup</h1>
            <span className="bg-amber-100 text-amber-900 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-200">
              To-Do & Reminders
            </span>
          </div>
          <p className="text-[14px] text-slate-500 mt-1">
            Organize follow-ups, track overdue reminders, and easily reschedule tasks in one place.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* View Mode Toggle: List vs Calendar */}
          <div className="h-10 p-1 bg-slate-100/90 rounded-[12px] border border-slate-200/90 shadow-2xs flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 flex items-center gap-1.5 px-3.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              )}
              title="Switch to List View"
            >
              <List className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "h-8 flex items-center gap-1.5 px-3.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                viewMode === "calendar"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              )}
              title="Switch to Calendar View"
            >
              <CalendarDays className="h-4 w-4" />
              <span>Calendar</span>
            </button>
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setSelectedDateForModal(new Date());
              setIsFormModalOpen(true);
            }}
            className="h-10 bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-amber-950 font-bold px-4 rounded-[12px] transition-all shadow-sm flex items-center gap-2 border border-amber-500/50 cursor-pointer whitespace-nowrap text-xs"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            <span>New Followup</span>
          </button>
        </div>
      </div>

      {/* Reminder Notification Banner (If Overdue or Due Today) */}
      {(stats.overdue > 0 || stats.dueToday > 0) && (
        <div className="rounded-[16px] p-4 bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-orange-500/10 border border-amber-300/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0 shadow-xs">
              <Bell className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-slate-900">
                Followup Reminder Alert
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {stats.overdue > 0 && stats.dueToday > 0 ? (
                  <>
                    You have <span className="font-bold text-red-600">{stats.overdue} overdue</span> and{" "}
                    <span className="font-bold text-amber-700">{stats.dueToday} due today</span> tasks waiting for action.
                  </>
                ) : stats.overdue > 0 ? (
                  <>
                    You have <span className="font-bold text-red-600">{stats.overdue} overdue</span> followups that need rescheduling or completion.
                  </>
                ) : (
                  <>
                    You have <span className="font-bold text-amber-700">{stats.dueToday} followups scheduled for today</span>.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {stats.dueToday > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("due_today")}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60 transition-all shadow-2xs"
              >
                View Today ({stats.dueToday})
              </button>
            )}
            {stats.overdue > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("overdue")}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all shadow-2xs"
              >
                View Overdue ({stats.overdue})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "p-4 rounded-[16px] border text-left transition-all duration-200 bg-white",
            activeTab === "all"
              ? "border-amber-400 ring-2 ring-amber-400/20 shadow-sm"
              : "border-slate-200/80 hover:border-slate-300 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All scheduled tasks</div>
        </button>

        <button
          onClick={() => setActiveTab("due_today")}
          className={cn(
            "p-4 rounded-[16px] border text-left transition-all duration-200 bg-white",
            activeTab === "due_today"
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
              : "border-slate-200/80 hover:border-amber-200 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Due Today</span>
            <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{stats.dueToday}</div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">Scheduled for today</div>
        </button>

        <button
          onClick={() => setActiveTab("overdue")}
          className={cn(
            "p-4 rounded-[16px] border text-left transition-all duration-200 bg-white",
            activeTab === "overdue"
              ? "border-red-400 ring-2 ring-red-400/20 shadow-sm"
              : "border-slate-200/80 hover:border-red-200 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Overdue</span>
            <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-600">{stats.overdue}</div>
          <div className="text-[11px] text-red-500 mt-0.5">Needs reschedule</div>
        </button>

        <button
          onClick={() => setActiveTab("upcoming")}
          className={cn(
            "p-4 rounded-[16px] border text-left transition-all duration-200 bg-white",
            activeTab === "upcoming"
              ? "border-sky-400 ring-2 ring-sky-400/20 shadow-sm"
              : "border-slate-200/80 hover:border-sky-200 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming</span>
            <div className="h-7 w-7 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600">
              <CalendarClock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.upcoming}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Scheduled for future</div>
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={cn(
            "p-4 rounded-[16px] border text-left transition-all duration-200 bg-white col-span-2 lg:col-span-1",
            activeTab === "completed"
              ? "border-emerald-400 ring-2 ring-emerald-400/20 shadow-sm"
              : "border-slate-200/80 hover:border-emerald-200 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Completed</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{stats.completed}</span>
            <span className="text-xs font-semibold text-slate-400">({completionPercentage}%)</span>
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Finished followups</div>
        </button>
      </div>

      {/* Quick Add Bar: Just Title and Date Picker */}
      <div className="p-4 sm:p-5 bg-white border border-slate-200/90 rounded-[18px] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Quick Add Followup (Title & Date Picker)
          </span>
        </div>

        <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Field 1: Title input */}
          <div className="flex-1">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => {
                setQuickTitle(e.target.value);
                if (quickError) setQuickError(null);
              }}
              placeholder="What do you need to follow up on? (e.g. Call Infosys recruiter for update)"
              className="w-full h-11 rounded-[10px] border border-slate-200 bg-slate-50/60 hover:bg-white focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-900 px-4 text-[14px] outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Field 2: Date Picker (reusing exact application date picker) */}
          <div className="w-full sm:w-[240px]">
            <FollowupDatePicker
              value={quickDate}
              onChange={(d) => setQuickDate(d)}
              placeholder="Pick followup date"
              className="w-full"
              buttonClassName="w-full h-11"
            />
          </div>

          {/* Add Button */}
          <button
            type="submit"
            disabled={isQuickAdding}
            className="h-11 px-5 rounded-[10px] bg-[#0B132B] hover:bg-[#1C2541] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm shrink-0 disabled:opacity-50"
          >
            {isQuickAdding ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            ) : (
              <>
                <Plus className="h-4 w-4 text-amber-400" strokeWidth={3} />
                <span>Add Followup</span>
              </>
            )}
          </button>
        </form>

        {quickError && (
          <p className="text-xs font-semibold text-red-500 mt-2 ml-1">{quickError}</p>
        )}
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-[12px] border border-slate-200/80 overflow-x-auto">
          {[
            { id: "all", label: "All", count: stats.total },
            { id: "due_today", label: "Due Today", count: stats.dueToday, badgeColor: "bg-amber-500 text-white" },
            { id: "overdue", label: "Overdue", count: stats.overdue, badgeColor: "bg-red-500 text-white" },
            { id: "upcoming", label: "Upcoming", count: stats.upcoming },
            { id: "completed", label: "Completed", count: stats.completed },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={cn(
                  "px-3.5 py-1.5 rounded-[9px] text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap",
                  isActive
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    tab.badgeColor && !isActive
                      ? tab.badgeColor
                      : isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200/80 text-slate-600"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search followups..."
            className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-3 focus:ring-amber-500/10 placeholder:text-slate-400 shadow-2xs"
          />
        </div>
      </div>

      {/* View Content: Calendar View vs List View */}
      {viewMode === "calendar" ? (
        <FollowupCalendarView
          items={items}
          onToggleStatus={handleToggleStatus}
          onReschedule={handleOpenReschedule}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteClick}
          onAddNewForDate={(date) => {
            setEditingItem(null);
            setSelectedDateForModal(date);
            setIsFormModalOpen(true);
          }}
        />
      ) : (
        /* Followup List Content */
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-16 text-center bg-white border border-slate-200 rounded-[18px] shadow-2xs">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
              <p className="text-slate-500 mt-2 text-sm font-medium">Loading your followups...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center bg-white border border-slate-200 rounded-[18px] shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-xs">
                <CalendarClock className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <h2 className="text-slate-900 font-bold text-lg mb-1">
                {activeTab === "due_today"
                  ? "No followups due today"
                  : activeTab === "overdue"
                  ? "Awesome! No overdue followups"
                  : activeTab === "upcoming"
                  ? "No upcoming followups scheduled"
                  : activeTab === "completed"
                  ? "No completed followups yet"
                  : "No followups found"}
              </h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-5 leading-relaxed">
                {activeTab === "all"
                  ? "Add your first followup item using the quick-add bar above or the New Followup button."
                  : "You are all caught up for this filter tab."}
              </p>
              {activeTab !== "all" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="text-amber-700 hover:text-amber-800 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Show all followups</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <FollowupItemCard
                  key={item.id}
                  item={item}
                  onToggleStatus={handleToggleStatus}
                  onReschedule={handleOpenReschedule}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <FollowupFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => fetchFollowups()}
        editingItem={editingItem}
        initialDate={selectedDateForModal}
      />

      <FollowupRescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        followup={rescheduleItem}
        onSuccess={() => fetchFollowups()}
      />

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title="Delete Followup"
        description="Are you sure you want to delete this followup? This action can be undone by an administrator."
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
