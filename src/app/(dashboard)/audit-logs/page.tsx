"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Activity, Filter, Search } from "lucide-react";

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  reason?: string;
  timestamp: string;
  modifier?: {
    name: string;
    email: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("All");

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/audit-logs");
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (error) {
        console.error("Failed to fetch logs", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.modifier?.name && log.modifier.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesEntity = entityFilter === "All" || log.entity_type === entityFilter;

    return matchesSearch && matchesEntity;
  });

  const getActionColor = (action: string) => {
    if (action.includes("Create")) return "bg-green-100 text-green-700";
    if (action.includes("Update") || action.includes("Modify")) return "bg-blue-100 text-blue-700";
    if (action.includes("Delete")) return "bg-red-100 text-red-700";
    if (action.includes("Close")) return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Global Audit Logs</h2>
          <p className="text-[14px] text-slate-500 mt-1">Track all system activity, edits, and position closures.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by action, reason, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-[14px]"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="py-2 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all bg-white font-medium text-slate-700 text-[14px]"
            >
              <option value="All">All Entities</option>
              <option value="Position">Positions</option>
              <option value="Client">Clients</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">User</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Entity</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Action</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                    <p className="text-slate-500 mt-2 text-sm font-medium">Loading system logs...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <Activity className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg mb-1.5">No logs found</h3>
                    <p className="text-slate-500 text-[15px] mb-6 max-w-sm mx-auto leading-relaxed">
                      We couldn't find any audit logs matching your search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-[13px] font-medium text-slate-600">
                      {format(new Date(log.timestamp), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-[14px] text-slate-900">
                      {log.modifier?.name || "System"}
                      {log.modifier?.email && <span className="block text-[12px] text-slate-500 font-medium mt-0.5">{log.modifier.email}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-slate-600 max-w-md truncate" title={log.reason || "-"}>
                      {log.reason || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
