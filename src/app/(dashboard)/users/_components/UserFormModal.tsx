"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, Loader2, Save, Eye, EyeOff } from "lucide-react";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
  role_id: z.string().min(1, "Role is required"),
  status: z.enum(["Active", "Inactive", "Locked"]),
  two_fa_method: z.enum(["NONE", "AUTHENTICATOR", "EMAIL"]),
});

type UserFormValues = z.infer<typeof userSchema>;

export function UserFormModal({ 
  user, 
  roles,
  onClose, 
  onSuccess 
}: { 
  user?: any; 
  roles: any[];
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If we are editing, password is not required. If creating, we must require it.
  const schema = user ? userSchema : userSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters")
  });

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: user ? {
      name: user.name,
      email: user.email,
      role_id: user.role.id,
      status: user.status as any,
      two_fa_method: user.two_fa_method as any,
    } : {
      status: "Active",
      two_fa_method: "NONE"
    }
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const url = user ? `/api/users/${user.id}` : "/api/users";
      const method = user ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || "Failed to save user"}`);
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{user ? "Edit User" : "Add New User"}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{user ? "Modify user permissions and security settings." : "Create a new user and assign a role."}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Full Name</label>
                <input 
                  type="text" 
                  {...register("name")} 
                  placeholder="e.g. Jane Doe"
                  className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.name ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`} 
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message?.toString()}</p>}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Email Address</label>
                <input 
                  type="email" 
                  {...register("email")} 
                  placeholder="name@company.com"
                  className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.email ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`} 
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message?.toString()}</p>}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">{user ? "New Password (Optional)" : "Password"}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    {...register("password")} 
                    placeholder={user ? "Leave blank to keep current" : "Min. 6 characters"}
                    className={`w-full h-12 rounded-[12px] border px-4 pr-12 text-[15px] outline-none transition-all shadow-sm ${errors.password ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message?.toString()}</p>}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">User Role</label>
                <select 
                  {...register("role_id")} 
                  className={`w-full h-12 rounded-[12px] border px-4 text-[15px] outline-none transition-all shadow-sm ${errors.role_id ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-50/30' : 'border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                >
                  <option value="">Select a role...</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.role_name}</option>
                  ))}
                </select>
                {errors.role_id && <p className="text-xs text-red-500 mt-1">{errors.role_id.message?.toString()}</p>}
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Account Status</label>
                <select 
                  {...register("status")} 
                  className="w-full h-12 rounded-[12px] border px-4 text-[15px] border-slate-200/80 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Locked">Locked</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[14px] font-semibold text-slate-800 tracking-tight mb-2.5">Two-Factor Authentication (2FA)</label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-1 grid grid-cols-3 gap-1">
                  <label className="cursor-pointer">
                    <input type="radio" value="NONE" {...register("two_fa_method")} className="peer sr-only" />
                    <div className="text-center py-2.5 rounded-lg text-sm font-medium text-slate-500 peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm transition-all border border-transparent peer-checked:border-slate-200">
                      Disabled
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" value="AUTHENTICATOR" {...register("two_fa_method")} className="peer sr-only" />
                    <div className="text-center py-2.5 rounded-lg text-sm font-medium text-slate-500 peer-checked:bg-white peer-checked:text-emerald-700 peer-checked:shadow-sm transition-all border border-transparent peer-checked:border-slate-200">
                      App (OTP)
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" value="EMAIL" {...register("two_fa_method")} className="peer sr-only" />
                    <div className="text-center py-2.5 rounded-lg text-sm font-medium text-slate-500 peer-checked:bg-white peer-checked:text-blue-700 peer-checked:shadow-sm transition-all border border-transparent peer-checked:border-slate-200">
                      Email
                    </div>
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Selecting <b>App</b> or <b>Email</b> will require the user to verify their identity on their next login.
                </p>
              </div>

            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="user-form"
            disabled={isSubmitting} 
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold tracking-tight hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed min-w-[120px]"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSubmitting ? "Saving..." : (user ? "Save Changes" : "Create User")}
          </button>
        </div>
      </div>
    </div>
  );
}
