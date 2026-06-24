"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const baseClosureSchema = z.object({
  closed_count: z.number().min(1, "At least 1 resource is required"),
  closure_date: z.date(),
  location: z.string().optional(),
  closure_details: z.string().min(1, "Candidate / Closure Details are required"),
  remarks: z.string().optional()
});

type ClosureFormValues = z.infer<typeof baseClosureSchema>;

const getClosureSchema = (isMultiLocation: boolean) => z.object({
  closed_count: z.number().min(1, "At least 1 resource is required"),
  closure_date: z.date(),
  location: isMultiLocation ? z.string().min(1, "Location is required for multi-location positions") : z.string().optional(),
  closure_details: z.string().min(1, "Candidate / Closure Details are required"),
  remarks: z.string().optional()
});



interface PositionClosureFormProps {
  position: any;
  onSuccess: (data?: any) => void;
}

export function PositionClosureForm({ position, onSuccess }: PositionClosureFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const isMultiLocation = Array.isArray(position.locations) && position.locations.length > 0;
  
  const { register, handleSubmit, formState: { errors }, control, setError: setFormError, watch } = useForm<ClosureFormValues>({
    resolver: zodResolver(getClosureSchema(isMultiLocation)) as any,
    defaultValues: {
      closed_count: 1,
      closure_date: new Date(),
      closure_details: "",
      remarks: "",
      location: ""
    }
  });

  const selectedLocationName = watch("location");
  let maxResources = position.requested_count - position.closed_count;
  if (isMultiLocation && selectedLocationName) {
    const loc = position.locations.find((l: any) => l.name === selectedLocationName);
    if (loc) {
      maxResources = loc.count - (loc.closed_count || 0);
    }
  }

  const onSubmit = async (data: ClosureFormValues) => {
    setIsSubmitting(true);
    setError("");

    if (data.closed_count > maxResources) {
      setFormError("closed_count", { type: "manual", message: `Cannot exceed maximum remaining resources (${maxResources})` });
      setIsSubmitting(false);
      return;
    }
    try {
      const res = await fetch(`/api/positions/${position.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          closure_date: data.closure_date.toISOString()
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to log closure");
      }

      const updatedData = await res.json();
      onSuccess(updatedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  const InputError = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <p className="text-[12px] text-red-500 font-medium animate-in fade-in flex items-center gap-1.5 ml-0.5 mt-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        {message}
      </p>
    );
  };

  return (
    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 animate-in slide-in-from-top-4">
      <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-blue-600" />
        Record New Fulfillments
      </h4>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isMultiLocation && (
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Location <span className="text-red-600">*</span></label>
            <Controller
              control={control}
              name="location"
              render={({ field }) => (
                <Select onValueChange={(val) => field.onChange(val || "")} value={field.value}>
                  <SelectTrigger className={`w-full rounded-xl border px-4 py-2.5 h-12 text-sm outline-none transition-all shadow-sm ${errors.location ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}>
                    <SelectValue placeholder="Select location for fulfillment">
                      {field.value && (position.locations as any[])?.find((l: any) => l.name === field.value) ? (() => {
                        const loc = (position.locations as any[]).find((l: any) => l.name === field.value);
                        return `${loc.name} (${loc.closed_count || 0} / ${loc.count} fulfilled)`;
                      })() : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 shadow-xl bg-white">
                    {(position.locations as any[]).map((loc: any, idx: number) => {
                      const isFull = (loc.closed_count || 0) >= (loc.count || 0);
                      return (
                        <SelectItem key={idx} value={loc.name} disabled={isFull} className={`text-sm cursor-pointer py-2.5 ${isFull ? 'opacity-50' : 'focus:bg-slate-50'}`}>
                          {loc.name} ({(loc.closed_count || 0)} / {loc.count} fulfilled)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            <InputError message={errors.location?.message} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Number of Resources <span className="text-red-600">*</span></label>
            <input 
              type="number" 
              min={1} 
              max={maxResources}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all shadow-sm ${errors.closed_count ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
              {...register("closed_count", { valueAsNumber: true })}
            />
            <InputError message={errors.closed_count?.message} />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Date <span className="text-red-600">*</span></label>
            <Controller
              control={control}
              name="closure_date"
              render={({ field }) => (
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all shadow-sm justify-start text-left font-normal h-12 bg-white",
                        !field.value && "text-slate-500",
                        errors.closure_date ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  } />
                  <PopoverContent className="w-auto p-0 rounded-[16px] shadow-xl border-slate-200 overflow-hidden" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setIsCalendarOpen(false);
                      }}
                      className="bg-white rounded-[16px]"
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            <InputError message={errors.closure_date?.message} />
          </div>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Candidate / Closure Details <span className="text-red-600">*</span></label>
          <input 
            type="text" 
            placeholder="e.g. Onboarded John Doe & Jane Smith"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all shadow-sm ${errors.closure_details ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
            {...register("closure_details")}
          />
          <InputError message={errors.closure_details?.message} />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Remarks (Optional)</label>
          <textarea 
            className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all shadow-sm resize-none ${errors.remarks ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
            rows={2}
            {...register("remarks")}
          />
          <InputError message={errors.remarks?.message} />
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl">
            {error}
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Closure'}
          </button>
        </div>
      </form>
    </div>
  );
}
