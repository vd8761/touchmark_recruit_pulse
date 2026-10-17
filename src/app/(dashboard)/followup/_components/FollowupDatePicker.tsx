"use client";

import React, { useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FollowupDatePickerProps {
  value?: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  align?: "start" | "center" | "end";
  allowClear?: boolean;
  onClear?: () => void;
}

export function FollowupDatePicker({
  value,
  onChange,
  placeholder = "Pick followup date",
  className,
  buttonClassName,
  align = "start",
  allowClear = false,
  onClear,
}: FollowupDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getDisplayLabel = () => {
    if (!value) return null;
    if (isToday(value)) return "Today (" + format(value, "MMM d") + ")";
    if (isTomorrow(value)) return "Tomorrow (" + format(value, "MMM d") + ")";
    return format(value, "PPP");
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-11 rounded-[10px] border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-amber-400 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 px-3.5 text-[14px] justify-start text-left font-normal transition-all shadow-xs",
                !value && "text-slate-400",
                buttonClassName
              )}
            >
              <CalendarIcon className="mr-2.5 h-4 w-4 text-amber-500 shrink-0" />
              <span className="truncate">{getDisplayLabel() || placeholder}</span>
            </Button>
          }
        />
        <PopoverContent
          className="w-[330px] p-0 rounded-[16px] shadow-2xl border border-slate-200 overflow-hidden bg-white z-50"
          align={align}
        >
          {/* Quick preset buttons - evenly divided in 4 columns */}
          <div className="grid grid-cols-4 gap-1.5 p-2.5 border-b border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(today);
                setIsOpen(false);
              }}
              className="py-1.5 px-1 text-center w-full text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50 transition-all shadow-2xs cursor-pointer truncate"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                onChange(tomorrow);
                setIsOpen(false);
              }}
              className="py-1.5 px-1 text-center w-full text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50 transition-all shadow-2xs cursor-pointer truncate"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => {
                const in3Days = new Date();
                in3Days.setDate(in3Days.getDate() + 3);
                onChange(in3Days);
                setIsOpen(false);
              }}
              className="py-1.5 px-1 text-center w-full text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50 transition-all shadow-2xs cursor-pointer truncate"
            >
              +3 Days
            </button>
            <button
              type="button"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                onChange(nextWeek);
                setIsOpen(false);
              }}
              className="py-1.5 px-1 text-center w-full text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50 transition-all shadow-2xs cursor-pointer truncate"
            >
              Next Week
            </button>
          </div>

          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={(date) => {
              if (date) {
                onChange(date);
                setIsOpen(false);
              }
            }}
            style={{ width: "100%" }}
            className="w-full bg-white rounded-b-[16px] p-3"
            monthGridClassName="w-full border-collapse mt-3"
            monthClassName="w-full"
            monthsClassName="w-full"
            weekdaysClassName="flex w-full justify-between"
            weekdayClassName="flex-1 text-center text-xs font-semibold text-slate-400 py-1"
            weekClassName="flex w-full justify-between mt-1"
            dayClassName="flex-1 flex items-center justify-center p-0"
            dayButtonClassName="h-9 w-9 rounded-lg font-medium text-xs hover:bg-amber-50 hover:text-amber-900 transition-all cursor-pointer"
          />
        </PopoverContent>
      </Popover>

      {allowClear && value && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
