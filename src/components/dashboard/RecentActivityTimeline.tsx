"use client";

import { Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function RecentActivityTimeline({ logs }: { logs: any[] }) {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-[396px] flex flex-col">
        <h3 className="text-[16px] font-bold text-slate-900 mb-6 flex items-center gap-2 shrink-0">
          <Activity className="w-5 h-5 text-slate-400" />
          Recent Activity
        </h3>
        <div className="flex-1 w-full flex items-center justify-center text-slate-400">
          No recent activity
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-[396px] flex flex-col">
      <h3 className="text-[16px] font-bold text-slate-900 mb-6 flex items-center gap-2 shrink-0">
        <Activity className="w-5 h-5 text-slate-400" />
        Recent Activity
      </h3>
      <div className="space-y-4 overflow-y-auto flex-1 pr-2">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                log.action === 'Create' ? 'bg-emerald-500' :
                log.action === 'Delete' ? 'bg-red-500' : 'bg-amber-500'
              }`} />
              <div className="w-px h-full bg-slate-200 mt-2" />
            </div>
            <div className="pb-4">
              <p className="text-[14px] font-medium text-slate-900">
                {log.action} {log.entity_type}
              </p>
              <p className="text-[13px] text-slate-500 mt-1">
                {log.reason || `System update by ${log.modifier?.name || 'User'}`}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">
                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
