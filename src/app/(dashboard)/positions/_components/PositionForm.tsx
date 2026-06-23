"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CalendarIcon, Check, ChevronsUpDown, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { useSettings } from "@/providers/SettingsProvider";
import { useSession } from "next-auth/react";
import { AutocompleteInput } from "./AutocompleteInput";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/calendar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const positionSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  role_name: z.string().min(2, "Role name must be at least 2 characters"),
  department: z.string().min(2, "Department must be at least 2 characters"),
  requested_count: z.number().min(1, "Must request at least 1 resource"),
  location: z.string().optional(),
  locations: z.array(z.object({ name: z.string(), count: z.number() })).optional(),
  per_resource_cost: z.coerce.number().min(0, "Cost cannot be negative").optional(),
  billing_slab: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]),
  expected_joining_date: z.date(),
  status: z.enum(["Open", "Partially Closed", "Closed", "On Hold", "Cancelled"]),
  remarks: z.string().optional(),
  modification_reason: z.string().optional(),
});

type PositionFormValues = z.infer<typeof positionSchema>;

interface Client {
  id: string;
  company_name: string;
  contact_person: string;
}

export function PositionForm({ 
  open, 
  onOpenChange, 
  onSuccess,
  initialData,
  preselectedClientId
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: any;
  preselectedClientId?: string | null;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isFetchingClients, setIsFetchingClients] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitAction, setSubmitAction] = useState<"save" | "save_and_add">("save");
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  
  const { settings } = useSettings();
  const { data: session } = useSession();

  const userRole = session?.user?.role || "Viewer";
  const canViewFinancials = !["Business Development", "Recruitment", "Viewer"].includes(userRole);

  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema) as any,
    defaultValues: {
      client_id: preselectedClientId || "",
      role_name: "",
      department: "",
      location: "",
      locations: [{ name: "", count: 1 }],
      requested_count: 1,
      per_resource_cost: undefined,
      billing_slab: "",
      priority: "Medium",
      status: "Open",
      remarks: "",
      modification_reason: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  const locations = watch("locations") || [{ name: "", count: 1 }];
  
  const requestedCount = isMultiLocation 
    ? locations.reduce((acc, loc) => acc + (loc.count || 0), 0)
    : (watch("requested_count") || 0);
    
  const perResourceCost = watch("per_resource_cost") || 0;
  const totalCost = requestedCount * perResourceCost;

  useEffect(() => {
    if (open) {
      const fetchClients = async () => {
        setIsFetchingClients(true);
        try {
          const res = await fetch("/api/clients");
          if (res.ok) {
            const data = await res.json();
            // Filter to only show Active clients, unless we're editing and the client is already selected
            const activeClients = data.filter((c: any) => 
              c.status === "Active" || (initialData && c.id === initialData.client_id)
            );
            setClients(activeClients);
          }
        } catch (error) {
          console.error("Failed to fetch clients", error);
        } finally {
          setIsFetchingClients(false);
        }
      };
      fetchClients();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        // We are editing
        setValue("client_id", initialData.client_id);
        setValue("role_name", initialData.role_name);
        setValue("department", initialData.department);
        setValue("location", initialData.location || "");
        setValue("requested_count", initialData.requested_count);
        setValue("per_resource_cost", Number(initialData.per_resource_cost));
        setValue("billing_slab", initialData.billing_slab);
        setValue("priority", initialData.priority);
        setValue("expected_joining_date", new Date(initialData.expected_joining_date));
        setValue("status", initialData.status);
        setValue("remarks", initialData.remarks || "");
        setValue("modification_reason", ""); // Must be filled by user
      } else {
        // We are creating
        reset({
          client_id: preselectedClientId || "",
          role_name: "",
          department: "",
          location: "",
          locations: [{ name: "", count: 1 }],
          requested_count: 1,
          per_resource_cost: 0,
          billing_slab: "",
          priority: "Medium",
          status: "Open",
          remarks: "",
          modification_reason: "",
        });
      }
      setError("");
    }
  }, [open, initialData, reset, setValue, preselectedClientId]);

  const onSubmit = async (data: PositionFormValues) => {
    setIsSubmitting(true);
    setError("");
    try {
      const url = initialData ? `/api/positions/${initialData.id}` : "/api/positions";
      const method = initialData ? "PUT" : "POST";

      const payload = {
        ...data,
        locations: isMultiLocation ? data.locations : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        if (!initialData && submitAction === "save_and_add") {
          // Reset the form but keep the client selected for rapid entry
          reset({
            client_id: watch("client_id"),
            department: watch("department"),
            role_name: "",
            location: "",
            locations: [{ name: "", count: 1 }],
            requested_count: 1,
            per_resource_cost: 0,
            billing_slab: "",
            priority: "Medium",
            status: "Open",
            remarks: "",
            modification_reason: "",
          });
        } else {
          onOpenChange(false);
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Something went wrong.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(settings?.currencyLocale || 'en-US', {
      style: 'currency',
      currency: settings?.currencyCode || 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] lg:max-w-[800px] w-[95vw] p-0 overflow-hidden bg-slate-50 border-0 rounded-[24px] shadow-2xl max-h-[90vh] flex flex-col gap-0">
        <FormProvider {...form}>
          <form id="position-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden max-h-[90vh]">
          {/* Sticky Header */}
          <div className="bg-white px-8 py-6 border-b border-slate-100 shrink-0 shadow-sm relative z-20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                {initialData ? "Modify Position" : "Add New Position"}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {initialData 
                  ? "Update job requirements or change fulfillment status. Modifications will be logged."
                  : "Create a new job opening for a client and track fulfillment."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2.5">
                  <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Client / Company <span className="text-red-600 font-bold">*</span></label>
                  <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
                    <PopoverTrigger render={
                      <Button
                        ref={register("client_id").ref}
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientComboboxOpen}
                        disabled={!!initialData} // Lock client if editing
                        className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm justify-between font-normal ${errors.client_id ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`}
                      >
                        {watch("client_id") && clients.find(c => c.id === watch("client_id"))
                          ? (
                              <span className="font-semibold text-slate-900 truncate">
                                {clients.find(c => c.id === watch("client_id"))?.company_name} ({clients.find(c => c.id === watch("client_id"))?.contact_person})
                              </span>
                            )
                          : isFetchingClients ? "Loading clients..." : <span className="text-slate-500">Select Client</span>}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    } />
                    <PopoverContent className="w-[var(--anchor-width)] p-0 rounded-[12px] border-slate-200 shadow-xl bg-white" align="start">
                      <Command>
                        <CommandInput placeholder="Search client or company..." className="h-11" />
                        <CommandList className="max-h-[250px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
                          <CommandEmpty className="py-6 text-center text-sm text-slate-500">No client found.</CommandEmpty>
                          <CommandGroup>
                            {clients.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.company_name + " " + c.contact_person}
                                onSelect={() => {
                                  setValue("client_id", c.id, { shouldValidate: true });
                                  setClientComboboxOpen(false);
                                }}
                                className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5 px-3 aria-selected:bg-slate-50"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watch("client_id") === c.id ? "opacity-100 text-amber-500" : "opacity-0"
                                  )}
                                />
                                <span className="truncate">{c.company_name} <span className="text-slate-500 font-normal">({c.contact_person})</span></span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.client_id && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.client_id.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Role Name <span className="text-red-600 font-bold">*</span></label>
                  <AutocompleteInput 
                    name="role_name" 
                    type="role" 
                    placeholder="e.g. Senior Frontend Developer" 
                    className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.role_name ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} 
                  />
                  {errors.role_name && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.role_name.message}</p>}
                </div>
                <div className="space-y-2.5">
                  <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Department <span className="text-red-600 font-bold">*</span></label>
                  <AutocompleteInput 
                    name="department" 
                    type="department" 
                    placeholder="e.g. Engineering" 
                    className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.department ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} 
                  />
                  {errors.department && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.department.message}</p>}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4 mb-2.5">
                  <label className="block text-[14px] font-semibold text-slate-800 tracking-tight">Location <span className="text-red-600 font-bold">*</span></label>
                  <div className="flex items-center justify-between">
                    <label className="block text-[14px] font-semibold text-slate-800 tracking-tight">Resource Count <span className="text-red-600 font-bold">*</span></label>
                    {!initialData && (
                      <div className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
                        <span>Multiple Locations</span>
                        <button 
                          type="button" 
                          onClick={() => setIsMultiLocation(!isMultiLocation)}
                          className={`w-9 h-5 rounded-full relative transition-colors ${isMultiLocation ? 'bg-amber-500' : 'bg-slate-300'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isMultiLocation ? 'translate-x-4' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {!isMultiLocation ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input 
                        {...register("location")} 
                        placeholder="Location (e.g. New York, Remote)" 
                        className="w-full h-12 rounded-[12px] border border-slate-200/80 px-4 text-[15px] outline-none transition-all shadow-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                      />
                    </div>
                    <div>
                      <input 
                        type="number" 
                        min="1"
                        {...register("requested_count", { valueAsNumber: true })} 
                        placeholder="Requested Count" 
                        className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.requested_count ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {locations.map((loc, index) => (
                      <div key={index} className="grid grid-cols-2 gap-4 relative group">
                        <div>
                          <input 
                            value={loc.name}
                            onChange={(e) => {
                              const newLocs = [...locations];
                              newLocs[index].name = e.target.value;
                              setValue("locations", newLocs, { shouldValidate: true });
                            }}
                            placeholder="Location (e.g. New York)" 
                            className="w-full h-12 rounded-[12px] border border-slate-200/80 px-4 text-[15px] outline-none transition-all shadow-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                          />
                        </div>
                        <div className="flex gap-3">
                          <input 
                            type="number" 
                            min="1"
                            value={loc.count}
                            onChange={(e) => {
                              const newLocs = [...locations];
                              newLocs[index].count = parseInt(e.target.value) || 1;
                              setValue("locations", newLocs, { shouldValidate: true });
                            }}
                            className="w-full h-12 rounded-[12px] border border-slate-200/80 px-4 text-[15px] outline-none transition-all shadow-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                          />
                          {locations.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => {
                                const newLocs = locations.filter((_, i) => i !== index);
                                setValue("locations", newLocs, { shouldValidate: true });
                              }}
                              className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-[12px] transition-all"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button 
                      type="button" 
                      onClick={() => setValue("locations", [...locations, { name: "", count: 1 }], { shouldValidate: true })}
                      className="text-[13px] text-blue-600 font-bold hover:text-blue-700 flex items-center gap-1 mt-2 px-2 py-1 rounded hover:bg-blue-50 transition-colors w-fit"
                    >
                      + Add another location
                    </button>
                  </div>
                )}
              </div>

              {canViewFinancials && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2.5">
                    <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Per Resource Cost ({settings.currencyCode}) <span className="text-red-600 font-bold">*</span></label>
                  <input 
                    type="number" 
                    min="0"
                    {...register("per_resource_cost", { valueAsNumber: true })} 
                    placeholder="0" 
                    className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.per_resource_cost ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`}
                  />
                  {errors.per_resource_cost && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.per_resource_cost.message}</p>}
                  </div>
                </div>
              )}

              {/* Dynamic Cost Calculator Display */}
              {canViewFinancials && (
                <div className="bg-slate-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4 text-[150px] font-bold leading-none selection:bg-transparent">
                    {settings.currencySymbol}
                  </div>
                  <div className="relative z-10">
                    <p className="text-slate-400 text-sm font-medium mb-1">Total Estimated Value</p>
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-amber-400">
                          {formatCurrency(totalCost)}
                        </span>
                        <span className="text-slate-400 text-sm">{settings.currencyCode}</span>
                      </div>
                      {settings.currencyCode !== "INR" && settings.inrConversionRate > 0 && (
                        <div className="flex items-baseline gap-2 sm:before:content-['/'] sm:before:text-slate-600 sm:before:text-xl sm:before:font-light sm:before:mr-2">
                          <span className="text-2xl font-bold tracking-tight text-emerald-400">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalCost * settings.inrConversionRate)}
                          </span>
                          <span className="text-slate-400 text-sm">INR</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-slate-400 text-xs">
                        {requestedCount} resources × {formatCurrency(perResourceCost)} / resource
                      </p>
                      {settings.currencyCode !== "INR" && settings.inrConversionRate > 0 && (
                        <div className="text-slate-200 text-[11.5px] tracking-wide bg-slate-800/80 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 w-fit border border-slate-700/50 shadow-sm">
                          <svg className="text-emerald-400" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          1 {settings.currencyCode} = ₹{settings.inrConversionRate.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {canViewFinancials && (
                  <div className="space-y-2.5">
                    <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Billing Slab <span className="text-red-600 font-bold">*</span></label>
                  <Select
                    onValueChange={(val) => setValue("billing_slab", val as any, { shouldValidate: true })}
                    value={watch("billing_slab")}
                  >
                    <SelectTrigger className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.billing_slab ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'} flex items-center justify-between`}>
                      <SelectValue placeholder="Select Slab" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[12px] border border-slate-200 shadow-xl bg-white">
                      <SelectItem value="0-5 Lakhs" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">0-5 Lakhs</SelectItem>
                      <SelectItem value="5-10 Lakhs" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">5-10 Lakhs</SelectItem>
                      <SelectItem value="10-15 Lakhs" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">10-15 Lakhs</SelectItem>
                      <SelectItem value="15-20 Lakhs" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">15-20 Lakhs</SelectItem>
                      <SelectItem value="20-25 Lakhs" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">20-25 Lakhs</SelectItem>
                      <SelectItem value="25-30 Lakhs" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">25-30 Lakhs</SelectItem>
                      <SelectItem value="25+ Lakhs" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">25+ Lakhs</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.billing_slab && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.billing_slab.message}</p>}
                </div>
                )}

                <div className="space-y-2.5">
                  <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Priority <span className="text-red-600 font-bold">*</span></label>
                  <Select
                    onValueChange={(val) => setValue("priority", val as any, { shouldValidate: true })}
                    value={watch("priority")}
                  >
                    <SelectTrigger ref={register("priority").ref} className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.priority ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'} flex items-center justify-between`}>
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[12px] border border-slate-200 shadow-xl bg-white">
                      <SelectItem value="Low" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Low</SelectItem>
                      <SelectItem value="Medium" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Medium</SelectItem>
                      <SelectItem value="High" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">High</SelectItem>
                      <SelectItem value="Critical" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.priority && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.priority.message}</p>}
                </div>
              </div>

              <div className={initialData ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
                <div className="space-y-2.5">
                  <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Expected Joining Date <span className="text-red-600 font-bold">*</span></label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        ref={register("expected_joining_date").ref}
                        variant={"outline"}
                        className={cn(
                          "w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm justify-start text-left font-normal",
                          errors.expected_joining_date ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30 text-red-900 hover:bg-red-50 hover:text-red-900' : 'border-slate-200/80 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-900',
                          !watch("expected_joining_date") && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watch("expected_joining_date") ? format(watch("expected_joining_date"), "PPP") : <span>Pick expected joining date</span>}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0 rounded-[16px] shadow-xl border-slate-200 overflow-hidden" align="start">
                      <Calendar
                        mode="single"
                        showYearSwitcher
                        selected={watch("expected_joining_date")}
                        onSelect={(date) => {
                          if (date) {
                            setValue("expected_joining_date", date, { shouldValidate: true, shouldDirty: true });
                          }
                        }}
                        className="bg-white rounded-[16px]"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.expected_joining_date && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.expected_joining_date.message}</p>}
                </div>

                {initialData && (
                  <div className="space-y-2.5">
                    <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Status <span className="text-red-600 font-bold">*</span></label>
                    <Select
                      onValueChange={(val) => setValue("status", val as any, { shouldValidate: true })}
                      value={watch("status")}
                    >
                      <SelectTrigger ref={register("status").ref} className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.status ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'} flex items-center justify-between`}>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[12px] border border-slate-200 shadow-xl bg-white">
                        <SelectItem value="Open" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Open</SelectItem>
                        <SelectItem value="Partially Closed" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Partially Closed</SelectItem>
                        <SelectItem value="Closed" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Closed</SelectItem>
                        <SelectItem value="On Hold" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">On Hold</SelectItem>
                        <SelectItem value="Cancelled" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.status && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.status.message}</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Remarks (Optional)</label>
                <textarea {...register("remarks")} placeholder="Any specific requirements or notes?" className="w-full rounded-[12px] border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 px-4 py-3.5 text-[15px] outline-none transition-all focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none shadow-sm" rows={3} />
              </div>

              {initialData && (
                <div className="space-y-2.5 p-5 bg-amber-50 border border-amber-200 rounded-[16px] shadow-sm">
                  <label className="text-[14px] font-bold text-amber-900 tracking-tight flex items-center gap-2">
                    Reason for Modification <span className="text-red-600 font-bold">*</span>
                  </label>
                  <textarea 
                    {...register("modification_reason")} 
                    placeholder="Please explain why you are modifying this position (e.g., Client requested more resources, Priority changed to Critical)" 
                    className={`w-full rounded-[12px] border px-4 py-3.5 text-[15px] outline-none transition-all shadow-sm resize-none ${errors.modification_reason ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-amber-300/80 bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'}`}
                    rows={2} 
                  />
                  {errors.modification_reason && <p className="text-[12px] text-red-600 font-bold ml-0.5 mt-1.5">{errors.modification_reason.message}</p>}
                </div>
              )}
            </div>
            
          </div>
          <div className="bg-white px-8 py-5 border-t border-slate-100 shrink-0 flex items-center justify-between gap-4 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            <div className="flex-1">
              {error && (
                <div className="text-red-600 text-[13.5px] font-bold flex items-center gap-2 bg-red-50/80 px-3.5 py-2 rounded-lg border border-red-200 animate-in fade-in slide-in-from-bottom-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  {error}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <button type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="px-6 py-2.5 rounded-[12px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                Cancel
              </button>
              {!initialData && (
                <button 
                  type="submit" 
                  form="position-form" 
                  onClick={() => setSubmitAction("save_and_add")}
                  disabled={isSubmitting} 
                  className="px-6 py-2.5 rounded-[12px] font-bold bg-white text-slate-800 hover:bg-slate-50 transition-all border border-slate-200 shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && submitAction === "save_and_add" && <Loader2 className="w-5 h-5 animate-spin" />}
                  Save & Add Another
                </button>
              )}
              <button 
                type="submit" 
                form="position-form" 
                onClick={() => setSubmitAction("save")}
                disabled={isSubmitting} 
                className="px-8 py-2.5 rounded-[12px] font-bold bg-gradient-to-b from-[#111A3A] to-[#0B132B] hover:from-[#1A254D] hover:to-[#111A3A] text-white transition-all shadow-md shadow-slate-900/20 border border-slate-800 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && submitAction === "save" && <Loader2 className="w-5 h-5 animate-spin" />}
                {initialData ? "Save Changes" : "Save Position"}
              </button>
            </div>
          </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
