"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/providers/SettingsProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const settingsSchema = z.object({
  currencyCode: z.string().min(1, "Required"),
  currencySymbol: z.string().min(1, "Required"),
  currencyLocale: z.string().min(1, "Required"),
  alertEmailId: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const CURRENCY_OPTIONS = [
  { code: "INR", symbol: "₹", locale: "en-IN", label: "Indian Rupee (INR)" },
  { code: "USD", symbol: "$", locale: "en-US", label: "US Dollar (USD)" },
  { code: "EUR", symbol: "€", locale: "de-DE", label: "Euro (EUR)" },
  { code: "GBP", symbol: "£", locale: "en-GB", label: "British Pound (GBP)" },
  { code: "AUD", symbol: "$", locale: "en-AU", label: "Australian Dollar (AUD)" },
  { code: "SGD", symbol: "$", locale: "en-SG", label: "Singapore Dollar (SGD)" },
];

export default function SettingsPage() {
  const { settings, isLoading: isContextLoading, refreshSettings } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings
  });

  useEffect(() => {
    if (!isContextLoading) {
      setValue("currencyCode", settings.currencyCode);
      setValue("currencySymbol", settings.currencySymbol);
      setValue("currencyLocale", settings.currencyLocale);
      setValue("alertEmailId", settings.alertEmailId || "");
    }
  }, [settings, isContextLoading, setValue]);

  const onCurrencySelect = (code: string | null) => {
    if (!code) return;
    const selected = CURRENCY_OPTIONS.find(c => c.code === code);
    if (selected) {
      setValue("currencyCode", selected.code);
      setValue("currencySymbol", selected.symbol);
      setValue("currencyLocale", selected.locale);
    }
  };

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        await refreshSettings();
        router.refresh();
      } else {
        console.error("Failed to save settings");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isContextLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 mt-1">Manage your application configurations and localized formats.</p>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight">General Configuration</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your default formats and system-wide preferences.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {/* Column 1: Currency & Formatting */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 tracking-tight mb-1">Currency & Formatting</h3>
              <p className="text-sm text-slate-500 mb-6">Applies to all cost calculators and financial tables.</p>
              
              <div>
            <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">
              Primary Currency <span className="text-red-600 font-bold">*</span>
            </label>
            <Select
              onValueChange={onCurrencySelect}
              value={watch("currencyCode")}
            >
              <SelectTrigger className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.currencyCode ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`}>
                <SelectValue placeholder="Select Currency">
                  {watch("currencyCode") && CURRENCY_OPTIONS.find(c => c.code === watch("currencyCode")) ? (
                    <span className="flex items-center">
                      <span className="font-semibold text-slate-500 mr-2 inline-block min-w-[20px] text-center">
                        {CURRENCY_OPTIONS.find(c => c.code === watch("currencyCode"))?.symbol}
                      </span>
                      {CURRENCY_OPTIONS.find(c => c.code === watch("currencyCode"))?.label}
                    </span>
                  ) : "Select Currency"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-[12px] border border-slate-200 shadow-xl bg-white">
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">
                    <span className="font-semibold text-slate-500 mr-2 inline-block min-w-[20px] text-center">{c.symbol}</span> {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {watch("currencyCode") !== "INR" && (
              <div className="mt-6">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">
                  INR Conversion Rate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                  <input 
                    type="number" 
                    step="0.01"
                    disabled
                    value={settings.inrConversionRate}
                    className="w-full h-12 rounded-[12px] border border-slate-200 bg-slate-100 pl-8 pr-4 text-[15px] outline-none text-slate-500 cursor-not-allowed" 
                  />
                </div>
                <p className="text-[12px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Auto-updated daily with live market rates.
                </p>
              </div>
            )}
          </div>
          </div>

            {/* Column 2: Notification Preferences */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 tracking-tight mb-1">Notification Preferences</h3>
              <p className="text-sm text-slate-500 mb-6">Configure where system alerts should be sent.</p>
              
              <div>
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">
                  Alert Email Address
                </label>
              <input 
                type="email"
                placeholder="alerts@company.com"
                {...register("alertEmailId")}
                className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.alertEmailId ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} 
              />
              {errors.alertEmailId && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.alertEmailId.message}</p>}
              </div>
            </div>
          </div>

          <div className="pt-8 mt-10 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="h-12 px-6 rounded-[12px] bg-slate-900 text-white text-[15px] font-semibold tracking-tight hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/10 transition-all shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? "Saving Configuration..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
