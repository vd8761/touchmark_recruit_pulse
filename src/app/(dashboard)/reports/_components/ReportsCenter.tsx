"use client";

import { useState, useEffect } from "react";
import { format, parseISO, isValid } from "date-fns";
import { FileText, Download, Loader2, Calendar as CalendarIcon, Users, Briefcase, Filter, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const safeFormatDate = (dateVal: any, fmt: string) => {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? 'N/A' : format(d, fmt);
};

type ReportType = 'client_positions' | 'role_requirements' | 'monthly_closures' | 'audit_logs';

export function ReportsCenter() {
  const [activeReport, setActiveReport] = useState<ReportType>('client_positions');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<{id: string, company_name: string}[]>([]);

  // Filters
  const [clientId, setClientId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    // Fetch clients for filter
    fetch('/api/clients').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setClients(data);
    }).catch(console.error);
  }, []);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('reportType', activeReport);
      if (clientId) params.append('clientId', clientId);
      if (roleName) params.append('roleName', roleName);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error("Failed to generate report", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [activeReport]);

  const clearFilters = () => {
    setClientId("");
    setRoleName("");
    setStatus("");
    setStartDate("");
    setEndDate("");
  };

  const exportExcel = () => {
    if (data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(formatDataForExport(data));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeReport}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const exportPDF = () => {
    if (data.length === 0) return;
    const doc = new jsPDF();
    const exportData = formatDataForExport(data);
    const headers = Object.keys(exportData[0] || {});
    const rows = exportData.map(obj => headers.map(h => obj[h]));
    
    doc.text(`Report: ${activeReport.replace('_', ' ').toUpperCase()}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 22);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 30,
      styles: { fontSize: 8 },
    });
    doc.save(`${activeReport}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const formatDataForExport = (raw: any[]) => {
    return raw.map(item => {
      if (activeReport === 'client_positions') {
        return {
          Client: item.client?.company_name || 'N/A',
          Role: item.role_name,
          Department: item.department,
          Requested: item.requested_count,
          Fulfilled: item.closed_count,
          Status: item.status,
          Priority: item.priority,
          Expected_Date: safeFormatDate(item.expected_joining_date, 'yyyy-MM-dd')
        };
      } else if (activeReport === 'monthly_closures') {
        return {
          Client: item.position?.client?.company_name || 'N/A',
          Role: item.position?.role_name || 'N/A',
          Closed_Count: item.closed_count,
          Closure_Date: safeFormatDate(item.closure_date, 'yyyy-MM-dd'),
          Closed_By: item.closer?.name || 'N/A'
        };
      } else if (activeReport === 'audit_logs') {
        return {
          Action: item.action,
          Entity: item.entity_type,
          Reason: item.reason,
          Modified_By: item.modifier?.name || 'System',
          Time: safeFormatDate(item.timestamp, 'yyyy-MM-dd HH:mm:ss')
        };
      }
      return item;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      
      {/* Top Navigation & Export Area */}
      <div className="px-6 pt-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-end justify-between shrink-0 gap-4 overflow-x-auto">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveReport('client_positions')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeReport === 'client_positions' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            <Users className="w-4 h-4" /> Client Positions
          </button>
          <button 
            onClick={() => setActiveReport('monthly_closures')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeReport === 'monthly_closures' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            <Briefcase className="w-4 h-4" /> Monthly Closures
          </button>
          <button 
            onClick={() => setActiveReport('audit_logs')}
            className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeReport === 'audit_logs' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            <FileText className="w-4 h-4" /> Audit History
          </button>
        </div>
        
        <div className="flex items-center gap-2 pb-3 shrink-0">
          <button 
            onClick={exportExcel}
            disabled={isLoading || data.length === 0}
            className="px-3 py-1.5 text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button 
            onClick={exportPDF}
            disabled={isLoading || data.length === 0}
            className="px-3 py-1.5 text-sm font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Horizontal Filter Bar */}
      <div className="p-4 px-6 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5"><Filter className="w-4 h-4 text-slate-400" /> Filters</h3>
          <button onClick={clearFilters} className="text-[12px] font-bold text-slate-500 hover:text-slate-800">Clear All</button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Client</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className="w-full text-[13px] rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm h-9 px-3 border bg-white">
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          
          {activeReport !== 'audit_logs' && (
            <>
              <div className="lg:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
                <input type="text" value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Developer" className="w-full text-[13px] rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm h-9 px-3 border" />
              </div>
              <div className="lg:col-span-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full text-[13px] rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 shadow-sm h-9 px-3 border bg-white">
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Partially Closed">Partially Closed</option>
                  <option value="Closed">Closed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </>
          )}

          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger className={`w-full text-[13px] rounded-lg border-slate-200 shadow-sm h-9 px-3 border bg-white flex items-center justify-between text-left font-normal ${!startDate ? 'text-slate-500' : 'text-slate-900'}`}>
                  {startDate ? format(parseISO(startDate), "PPP") : <span>Start Date</span>}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate && isValid(parseISO(startDate)) ? parseISO(startDate) : undefined}
                    onSelect={(d) => setStartDate(d ? format(d, 'yyyy-MM-dd') : "")}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger className={`w-full text-[13px] rounded-lg border-slate-200 shadow-sm h-9 px-3 border bg-white flex items-center justify-between text-left font-normal ${!endDate ? 'text-slate-500' : 'text-slate-900'}`}>
                  {endDate ? format(parseISO(endDate), "PPP") : <span>End Date</span>}
                  <CalendarIcon className="h-4 w-4 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate && isValid(parseISO(endDate)) ? parseISO(endDate) : undefined}
                    onSelect={(d) => setEndDate(d ? format(d, 'yyyy-MM-dd') : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="lg:col-span-1 sm:col-span-2 md:col-span-4">
            <button onClick={generateReport} className="w-full bg-slate-900 text-white font-semibold text-[13px] h-9 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-0 bg-slate-50/50">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p className="text-sm font-medium">Generating report...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium text-slate-500">No data found for the selected criteria.</p>
          </div>
        ) : (
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-slate-200 border-b border-slate-200">
              <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  {Object.keys(formatDataForExport(data)[0] || {}).map((header) => (
                    <th key={header} className="px-6 py-3.5 text-left text-[12px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      {header.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {formatDataForExport(data).map((row: any, i) => (
                  <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                    {Object.values(row).map((val: any, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap text-[13px] font-medium text-slate-700">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
    </div>
  );
}
