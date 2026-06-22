"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    setIsStandalone(!!isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Chrome/Android install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandaloneMode) setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show on iOS manually if not standalone
    if (isIOSDevice && !isStandaloneMode) {
      // Small delay so it doesn't jarringly appear instantly
      setTimeout(() => setShowPrompt(true), 1500);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (isStandalone || !showPrompt) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      alert("To install this app on iOS:\n1. Tap the Share button at the bottom of the screen\n2. Scroll down and tap 'Add to Home Screen'");
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900 text-white p-4 shadow-2xl border-t border-slate-800 flex items-center justify-between gap-4 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm sm:rounded-2xl sm:border animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="bg-white/10 p-2.5 rounded-xl shrink-0">
          <Download className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-[14px] truncate">Install RecruitPulse</span>
          <span className="text-[12px] text-slate-400 truncate">Add to home screen for the best experience</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-[13px] font-bold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-amber-900/20"
        >
          Install
        </button>
        <button onClick={() => setShowPrompt(false)} className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
