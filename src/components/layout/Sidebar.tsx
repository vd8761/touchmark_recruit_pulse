"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, FileText, Settings, ShieldAlert, ChevronLeft, ChevronRight, UserCog } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Positions", href: "/positions", icon: Briefcase },
  { name: "Audit Logs", href: "/audit-logs", icon: ShieldAlert },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Users & Roles", href: "/users", icon: UserCog },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ isMobile = false, onNavigate }: { isMobile?: boolean, onNavigate?: () => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // If mobile, never collapse, let the Sheet handle it
  const collapsed = !isMobile && isCollapsed;
  const widthClass = collapsed ? "w-[80px]" : "w-[260px]";

  return (
    <div className={`flex h-full flex-col bg-white z-20 transition-all duration-300 ease-in-out border-r border-slate-200 shadow-sm relative group ${isMobile ? 'w-full' : widthClass}`}>
      
      {!isMobile && (
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-8 bg-white border border-slate-200 rounded-full p-1.5 text-slate-400 hover:text-amber-500 hover:border-amber-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-50 flex items-center justify-center"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      <div className={`flex h-[72px] shrink-0 items-center border-b border-slate-100 overflow-hidden whitespace-nowrap ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
        {collapsed ? (
          <div className="flex items-center justify-center w-full">
            <Logo iconOnly className="scale-90" />
          </div>
        ) : (
          <div className="w-[180px] shrink-0">
            <Logo className="scale-[0.85] origin-left" />
          </div>
        )}
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4 px-3 overflow-x-hidden">
        <nav className="flex-1 space-y-1.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            // Check active state dynamically based on current route
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.name : undefined}
                className={`group flex items-center rounded-lg py-2.5 text-[14px] font-semibold transition-all duration-300 ease-out whitespace-nowrap overflow-hidden ${
                  collapsed ? 'justify-center px-0 mx-1' : 'px-3.5'
                } ${
                  isActive 
                    ? "bg-[#0B132B] text-white shadow-lg shadow-slate-900/20 scale-[1.02]" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] flex-shrink-0 transition-colors duration-300 ${
                    !collapsed && 'mr-3'
                  } ${
                    isActive ? "text-amber-500" : "text-slate-400 group-hover:text-amber-500"
                  }`}
                  aria-hidden="true"
                />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
