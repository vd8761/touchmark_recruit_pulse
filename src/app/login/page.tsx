"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/Logo";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Multi-step state
  const [step, setStep] = useState<"CREDENTIALS" | "OTP" | "SETUP">("CREDENTIALS");
  const [authMethod, setAuthMethod] = useState<"EMAIL" | "AUTHENTICATOR" | null>(null);
  const [tempCredentials, setTempCredentials] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmitCredentials = async (data: LoginFormValues) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/pre-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Invalid credentials");
        setLoading(false);
        return;
      }

      if (!result.requires2fa) {
        // Log in immediately
        await finalizeLogin(data.email, data.password);
        return;
      }

      setTempCredentials({ email: data.email, password: data.password });
      setAuthMethod(result.method);

      if (result.setupRequired) {
        // Fetch QR code
        const setupRes = await fetch("/api/auth/setup-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const setupResult = await setupRes.json();
        if (setupRes.ok) {
          setQrCodeUrl(setupResult.qrCodeUrl);
          setSecretKey(setupResult.secret);
          setStep("SETUP");
        } else {
          setError(setupResult.error || "Failed to setup 2FA");
        }
      } else {
        setStep("OTP");
      }
    } catch (e) {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const finalizeLogin = async (email: string, password: string, otpCode?: string) => {
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      otp: otpCode,
      redirect: false,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const onVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return setError("Please enter the verification code");
    await finalizeLogin(tempCredentials.email, tempCredentials.password, otp);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 selection:bg-amber-500/30 font-sans p-4">
      
      {/* Container */}
      <div className="relative w-full max-w-[400px]">
        
        <div className="bg-white rounded-[20px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col">
          
          <div className="flex flex-col items-center mb-8">
            <Logo className="mb-6" />
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">
              Welcome back
            </h2>
            <p className="text-[14px] text-slate-500 text-center">
              Log in to your Touchmark portal account.
            </p>
          </div>

          {step === "CREDENTIALS" && (
            <form onSubmit={handleSubmit(onSubmitCredentials)} noValidate className="space-y-5">
              
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 p-3.5 text-[13px] text-red-600 font-medium text-center animate-in fade-in flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[13px] font-semibold text-slate-700 ml-0.5">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@touchmarkdes.com"
                  disabled={loading}
                  {...register("email")}
                  className={`h-11 rounded-lg bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-amber-500/20 transition-all ${errors.email ? "border-red-400 focus-visible:ring-red-400/20 bg-red-50/30" : ""}`}
                />
                {errors.email && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.email.message}</p>}
              </div>
              
              <div className="space-y-2 pt-1">
                <Label htmlFor="password" className="text-[13px] font-semibold text-slate-700 ml-0.5">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    disabled={loading}
                    {...register("password")}
                    className={`h-11 rounded-lg bg-slate-50/50 border-slate-200 text-slate-900 pr-12 focus-visible:ring-2 focus-visible:ring-amber-500/20 transition-all ${errors.password ? "border-red-400 focus-visible:ring-red-400/20 bg-red-50/30" : ""}`}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-[12px] text-red-500 font-medium ml-0.5 mt-1.5">{errors.password.message}</p>}
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold tracking-tight rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </div>
                  ) : "Continue"}
                </Button>
              </div>
            </form>
          )}

          {step === "SETUP" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-semibold text-slate-900 mb-2">Set up Authenticator App</p>
                <p className="text-xs text-slate-500 mb-4">Scan this QR code with Google Authenticator or Authy.</p>
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-40 h-40 rounded-lg shadow-sm border border-slate-200" />
                )}
                <p className="text-xs text-slate-400 mt-4 break-all font-mono bg-white p-2 border border-slate-100 rounded-md">
                  {secretKey}
                </p>
              </div>
              <Button onClick={() => setStep("OTP")} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                I have scanned the code
              </Button>
            </div>
          )}

          {step === "OTP" && (
            <form onSubmit={onVerifyOTP} className="space-y-5 animate-in fade-in slide-in-from-right-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 p-3.5 text-[13px] text-red-600 font-medium text-center">
                  {error}
                </div>
              )}
              
              <div className="text-center mb-6">
                <p className="text-sm text-slate-600">
                  {authMethod === "EMAIL" 
                    ? "We've sent a 6-digit code to your email." 
                    : "Enter the 6-digit code from your authenticator app."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp" className="text-[13px] font-semibold text-slate-700 ml-0.5">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className="h-12 text-center text-xl tracking-[0.5em] font-mono rounded-lg bg-slate-50/50 border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-amber-500/20"
                />
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button 
                  type="submit" 
                  disabled={loading || otp.length < 6}
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </Button>
                <button 
                  type="button" 
                  onClick={() => { setStep("CREDENTIALS"); setError(""); setOtp(""); }}
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Footer info */}
        <p className="text-center text-[12px] text-slate-400 mt-6 font-medium">
          &copy; {new Date().getFullYear()} Touchmark. All rights reserved.
        </p>
      </div>
    </div>
  );
}
