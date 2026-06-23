"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, FileText, Settings, ShieldAlert, ChevronLeft, ChevronRight, UserCog } from "lucide-react";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const userRole = session?.user?.role || "Viewer";

  // Filter navigation based on role
  const filteredNavigation = navigation.filter((item) => {
    if (userRole === "Super Admin") return true;
    
    if (item.name === "Users & Roles" || item.name === "Settings") {
      return false; // Strictly Super Admin only
    }

    if (item.name === "Audit Logs") {
      return userRole === "Admin";
    }
    
    if (item.name === "Reports") {
      return userRole === "Admin" || userRole === "Finance"; 
    }
    
    // Dashboard, Clients, Positions are available to everyone
    return true;
  });

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
          {filteredNavigation.map((item) => {
            const Icon = item.icon;
            // Check active state dynamically based on current route
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={`group relative flex items-center rounded-lg py-2.5 text-[14px] font-semibold transition-all duration-300 ease-out whitespace-nowrap overflow-visible ${
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
                {collapsed && (
                  <div className="absolute left-14 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 bg-slate-800 text-white text-xs font-medium py-1.5 px-2.5 rounded-md shadow-md z-50">
                    {item.name}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[4px] border-transparent border-r-slate-800"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
