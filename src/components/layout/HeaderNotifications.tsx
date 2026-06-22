"use client";

import { useEffect, useState } from "react";
import { Bell, Activity } from "lucide-react";
import { getRecentNotifications } from "@/app/actions/notifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

type Notification = Awaited<ReturnType<typeof getRecentNotifications>>[0];

export function HeaderNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      const data = await getRecentNotifications();
      setNotifications(data);
      // For now, let's just pretend the first 3 are unread if we have them
      setUnreadCount(Math.min(data.length, 3));
    }
    loadNotifications();
  }, []);

  return (
    <Popover>
      <PopoverTrigger className="relative -m-2.5 p-2.5 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer outline-none">
        <span className="sr-only">View notifications</span>
        <Bell className="h-[22px] w-[22px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4 mt-2" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h4 className="text-sm font-semibold text-slate-900">Notifications</h4>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {notifications.length} recent
          </span>
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <Activity className="h-6 w-6 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No recent activity.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${notif.action === 'Delete' ? 'bg-red-500' : notif.action === 'Update' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-slate-900 leading-tight">
                        {notif.message}
                      </p>
                      <div className="flex items-center text-xs text-slate-500 gap-2">
                        <span>{notif.modifier_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
