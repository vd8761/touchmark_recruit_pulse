"use client";

import { useState } from "react";
import { Bell, UserCircle, LogOut, Menu } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { HeaderNotifications } from "@/components/layout/HeaderNotifications";

export function Header() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between gap-x-4 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6 lg:px-8 z-10 sticky top-0 shadow-sm transition-all duration-300">
      {/* Mobile Menu Trigger */}
      <div className="flex lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger className="-m-2.5 p-2.5 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center">
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[260px]">
            <VisuallyHidden>
              <SheetTitle>Navigation Menu</SheetTitle>
            </VisuallyHidden>
            <Sidebar isMobile onNavigate={() => setIsOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex flex-1 justify-end items-center gap-x-4 lg:gap-x-6">
        <HeaderNotifications />

        {/* Separator */}
        <div className="hidden lg:block lg:h-8 lg:w-px lg:bg-slate-200" aria-hidden="true" />

        {/* Profile */}
        <div className="flex items-center gap-x-4">
          <div className="flex items-center gap-x-3">
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <UserCircle className="h-6 w-6 text-slate-400" aria-hidden="true" />
            </div>
            <div className="hidden lg:flex lg:flex-col lg:items-start">
              <span className="text-[14px] font-bold leading-none text-slate-900" aria-hidden="true">
                {session?.user?.name?.replace(/\s*\(.*\)/, '') || "Loading..."}
              </span>
              <span className="text-[12px] font-medium text-slate-500 mt-1" aria-hidden="true">
                {session?.user?.role || ""}
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-x-2 ml-4 text-[13px] font-semibold text-slate-500 hover:text-red-600 transition-colors bg-slate-50 hover:bg-red-50 px-3 py-2 rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
