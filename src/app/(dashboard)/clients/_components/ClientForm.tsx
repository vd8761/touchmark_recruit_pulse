"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, AlertCircle, Check } from "lucide-react";
import { parsePhoneNumber } from "react-phone-number-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const clientSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  company_name: z.string().min(1, "Company name is required"),
  contact_person: z.string().min(1, "Contact person is required"),
  touchmark_poc: z.string().min(1, "Touchmark POC is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  industry: z.string().min(1, "Industry is required"),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("Active"),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: any;
}

export function ClientForm({ open, onOpenChange, onSuccess, initialData }: ClientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPositionPrompt, setShowPositionPrompt] = useState(false);
  const [createdClientId, setCreatedClientId] = useState("");

  const { register, handleSubmit, formState: { errors }, reset, setValue, control } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      status: "Active",
    }
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        Object.keys(initialData).forEach((key) => {
          if (key === "phone" && initialData.country_code) {
            setValue("phone", `${initialData.country_code}${initialData.phone}` as any);
          } else if (key !== "country_code") {
            setValue(key as any, initialData[key] || "");
          }
        });
      } else {
        reset();
      }
      setError("");
    }
  }, [open, initialData, reset, setValue]);

  const onSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    setError("");
    try {
      const url = initialData ? `/api/clients/${initialData.id}` : "/api/clients";
      const method = initialData ? "PUT" : "POST";
      const parsedPhone = data.phone ? parsePhoneNumber(data.phone) : null;
      const payload = {
        ...data,
        country_code: parsedPhone?.countryCallingCode ? `+${parsedPhone.countryCallingCode}` : null,
        phone: parsedPhone?.nationalNumber || data.phone,
      };
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const d = await res.json();
          throw new Error(d.error || "Failed to save client");
        } else {
          const text = await res.text();
          console.error("Server HTML Error Response:", text);
          throw new Error("Server returned an unexpected response. Please try restarting your development server.");
        }
      }

      onSuccess();
      
      if (!initialData) {
        // Created successfully, show position prompt
        const responseData = await res.json();
        setCreatedClientId(responseData.id);
        setShowPositionPrompt(true);
      } else {
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error(err);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] lg:max-w-[800px] w-[95vw] p-0 overflow-hidden bg-slate-50 border-0 rounded-[24px] shadow-2xl max-h-[90vh] flex flex-col gap-0">
        {showPositionPrompt ? (
          <div className="flex flex-col items-center text-center p-12 space-y-5 bg-white">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-2 ring-8 ring-emerald-50/50">
              <Check className="w-10 h-10" strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Client Added Successfully!</h2>
            <p className="text-slate-500 text-[16px] max-w-sm leading-relaxed">
              Would you like to immediately add open positions (jobs) for this client?
            </p>
            <div className="flex gap-4 w-full max-w-sm mt-6">
              <button 
                type="button"
                onClick={() => {
                  setShowPositionPrompt(false);
                  onOpenChange(false);
                }}
                className="flex-1 h-12 rounded-[12px] border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Maybe Later
              </button>
              <button 
                type="button"
                onClick={() => {
                  router.push(`/positions?new_client_id=${createdClientId}`);
                  setShowPositionPrompt(false);
                  onOpenChange(false);
                }}
                className="flex-1 h-12 rounded-[12px] bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors shadow-sm"
              >
                Add Positions
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden max-h-[90vh]">
          
          {/* Sticky Header */}
          <div className="bg-white px-8 py-6 border-b border-slate-100 shrink-0 shadow-sm relative z-20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900 pr-8">
                {initialData ? "Edit Client" : "Add New Client"}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-[15px] mt-1.5">
                Fill in the client's information below. Required fields are marked with an asterisk.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 space-y-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
              <div className="flex flex-col">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Client Name <span className="text-red-600 font-bold">*</span></label>
                <input placeholder="e.g. Acme Corporation" {...register("client_name")} className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.client_name ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} />
                <InputError message={errors.client_name?.message} />
              </div>

              <div className="flex flex-col">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Company Name <span className="text-red-600 font-bold">*</span></label>
                <input placeholder="e.g. Acme Tech Inc." {...register("company_name")} className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.company_name ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} />
                <InputError message={errors.company_name?.message} />
              </div>

              <div className="flex flex-col">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Contact Person <span className="text-red-600 font-bold">*</span></label>
                <input placeholder="e.g. Jane Doe" {...register("contact_person")} className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.contact_person ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} />
                <InputError message={errors.contact_person?.message} />
              </div>

              <div className="flex flex-col">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Touchmark POC <span className="text-red-600 font-bold">*</span></label>
                <input placeholder="e.g. John Smith" {...register("touchmark_poc")} className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.touchmark_poc ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} />
                <InputError message={errors.touchmark_poc?.message} />
              </div>

              <div className="flex flex-col">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Email Address <span className="text-red-600 font-bold">*</span></label>
                <input type="email" placeholder="jane.doe@example.com" {...register("email")} className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} />
                <InputError message={errors.email?.message} />
              </div>

              <div className="flex flex-col">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Phone Number <span className="text-red-600 font-bold">*</span></label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      placeholder="+1 (555) 000-0000"
                      defaultCountry="IN"
                      value={field.value}
                      onChange={field.onChange}
                      className={errors.phone ? '*:border-red-400 *:bg-red-50/30' : ''}
                    />
                  )}
                />
                <InputError message={errors.phone?.message} />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Industry <span className="text-red-600 font-bold">*</span></label>
                <input placeholder="e.g. Software, Healthcare, Finance" {...register("industry")} className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.industry ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 hover:bg-slate-50'}`} />
                <InputError message={errors.industry?.message} />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Address</label>
                <textarea placeholder="Enter the full company address..." {...register("address")} rows={3} className="w-full rounded-[12px] border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 px-4 py-3.5 text-[15px] outline-none transition-all focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none shadow-sm" />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Additional Notes</label>
                <textarea placeholder="Any additional context or information about this client..." {...register("notes")} rows={3} className="w-full rounded-[12px] border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 px-4 py-3.5 text-[15px] outline-none transition-all focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 resize-none shadow-sm" />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Status</label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <SelectTrigger className="w-full h-12 rounded-[12px] border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 px-4 text-[15px] outline-none transition-all focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-sm flex items-center justify-between">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[12px] border border-slate-200 shadow-xl bg-white">
                        <SelectItem value="Active" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Active</SelectItem>
                        <SelectItem value="Inactive" className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2.5">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="bg-white px-8 py-5 border-t border-slate-100 shrink-0 flex items-center justify-between z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            <div className="flex-1 mr-4">
              {error && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-600 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4 shrink-0">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-6 py-2.5 rounded-[12px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-2.5 rounded-[12px] font-bold bg-gradient-to-b from-[#111A3A] to-[#0B132B] hover:from-[#1A254D] hover:to-[#111A3A] text-white transition-all shadow-md shadow-slate-900/20 border border-slate-800 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {initialData ? "Save Changes" : "Create Client"}
              </button>
            </div>
          </div>

        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
