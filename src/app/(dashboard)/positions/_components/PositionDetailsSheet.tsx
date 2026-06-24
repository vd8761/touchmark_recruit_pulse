import { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, Briefcase, Building2, MapPin, Calendar as CalendarIcon, CheckCircle2, AlertCircle, Loader2, ArrowRight, Activity, XCircle, FileEdit, Plus, History, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PositionForm } from "./PositionForm";
import { PositionClosureForm } from "./PositionClosureForm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Position {
  id: string;
  client_id: string;
  client: {
    company_name: string;
    contact_person: string;
  };
  role_name: string;
  department: string;
  location?: string | null;
  locations?: { name: string; count: number }[] | null;
  requested_count: number;
  closed_count: number;
  per_resource_cost: string | number;
  billing_slab: string;
  priority: string;
  status: string;
  expected_joining_date: string;
  remarks?: string | null;
  modification_reason?: string | null;
  created_at: string;
}

interface PositionClosure {
  id: string;
  closed_count: number;
  closure_date: string;
  closure_details: string;
  location?: string;
  remarks?: string;
  closer?: { name: string; email: string };
  created_at: string;
}

interface AuditLog {
  id: string;
  action: string;
  reason?: string;
  timestamp: string;
  modifier?: { name: string; email: string };
}

interface PositionDetailsSheetProps {
  position: Position;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSelectPosition?: (pos: any) => void;
}

export function PositionDetailsSheet({ position, isOpen, onClose, onRefresh, onSelectPosition }: PositionDetailsSheetProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "closures" | "history" | "other_positions">("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const { data: session } = useSession();

  const userRole = session?.user?.role || "Viewer";
  const canViewFinancials = !["Business Development", "Recruitment", "Viewer"].includes(userRole);
  const canEditPosition = ["Super Admin", "Admin", "Business Development"].includes(userRole);
  const canDeleteClosure = ["Super Admin", "Admin"].includes(userRole);
  const canAddClosure = ["Super Admin", "Admin", "Business Development", "Recruitment"].includes(userRole);
  
  // Fulfillment state
  const [closures, setClosures] = useState<PositionClosure[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Client positions state
  const [clientPositions, setClientPositions] = useState<any[]>([]);
  const [isLoadingClientPositions, setIsLoadingClientPositions] = useState(false);

  // Close form state
  const [deletingClosureId, setDeletingClosureId] = useState<string | null>(null);
  const [closureToDelete, setClosureToDelete] = useState<string | null>(null);

  // Local position state for instant progress updates
  const [localPos, setLocalPos] = useState<Position | null>(null);

  const fetchPosition = async () => {
    try {
      const res = await fetch(`/api/positions/${position.id}?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setLocalPos(data);
      }
    } catch (error) {
      console.error("Failed to fetch position data", error);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/positions/${position.id}/history?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setClosures(data.closures || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchClientPositions = async () => {
    setIsLoadingClientPositions(true);
    try {
      const res = await fetch(`/api/positions?client_id=${position.client_id}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setClientPositions(data.filter((p: any) => p.id !== position.id));
      }
    } catch (error) {
      console.error("Failed to fetch client positions", error);
    } finally {
      setIsLoadingClientPositions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab("overview");
      setIsEditing(false);
      setIsClosing(false);
      setLocalPos(null);
      fetchPosition();
      fetchHistory();
      fetchClientPositions();
    }
  }, [isOpen, position.id]);

  if (!isOpen) return null;

  const currentPos = localPos || position;


  const handleDeleteClosure = async (closureId: string) => {
    setClosureToDelete(closureId);
  };

  const confirmDeleteClosure = async () => {
    if (!closureToDelete) return;
    const closureId = closureToDelete;


    setDeletingClosureId(closureId);
    try {
      const res = await fetch(`/api/positions/closures/${closureId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefresh();
        fetchHistory();
        fetchPosition();
      } else {
        alert("Failed to delete closure");
      }
    } catch (error) {
      alert("Error deleting closure");
    } finally {
      setDeletingClosureId(null);
      setClosureToDelete(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-red-100 text-red-800 border-red-200";
      case "High": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Medium": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-blue-50 text-blue-700 border-blue-200/60";
      case "Partially Closed": return "bg-amber-50 text-amber-700 border-amber-200/60";
      case "Closed": return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "On Hold": return "bg-purple-50 text-purple-700 border-purple-200/60";
      case "Cancelled": return "bg-red-50 text-red-700 border-red-200/60";
      default: return "bg-slate-50 text-slate-700 border-slate-200/60";
    }
  };

  const fulfillmentPercentage = Math.min(100, Math.round((currentPos.closed_count / currentPos.requested_count) * 100));
  const isMultiLocation = Array.isArray(currentPos.locations) && currentPos.locations.length > 0;

  return (
    <>
      {isEditing && (
        <PositionForm 
          open={true}
          onOpenChange={(open) => {
            if (!open) setIsEditing(false);
          }}
          onSuccess={() => {
            setIsEditing(false);
            onRefresh();
            fetchHistory();
          }}
          initialData={currentPos as any} 
        />
      )}
      <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity ${isEditing ? 'opacity-0 pointer-events-none' : ''}`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col transition-transform duration-300 ${isEditing ? 'translate-x-full' : 'translate-x-0'} animate-in slide-in-from-right-full`}>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-white shrink-0 relative">
          <button onClick={onClose} className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-4 pr-12">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{currentPos.role_name}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <Link href={`/clients/${currentPos.client_id}`} className="flex items-center gap-1.5 text-slate-600 font-medium hover:text-blue-600 transition-colors group">
                  <Building2 className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  {currentPos.client?.company_name || "Unknown Client"}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
                {currentPos.locations && Array.isArray(currentPos.locations) && currentPos.locations.length > 0 ? (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-slate-600 font-medium">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {currentPos.locations.map((l: any) => `${l.name} (${l.count})`).join(', ')}
                    </span>
                  </>
                ) : currentPos.location && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {currentPos.location}
                    </span>
                  </>
                )}
                <span className="text-slate-300">•</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold border ${getStatusColor(currentPos.status)}`}>
                  {currentPos.status}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold border ${getPriorityColor(currentPos.priority)}`}>
                  {currentPos.priority} Priority
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-6 mt-8 -mb-6">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`pb-4 text-[14px] font-semibold border-b-2 transition-colors ${activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab("closures")}
              className={`pb-4 text-[14px] font-semibold border-b-2 transition-colors ${activeTab === "closures" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              Fulfillment & Closures
            </button>
            <button 
              onClick={() => setActiveTab("history")}
              className={`pb-4 text-[14px] font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              Timeline
            </button>
            <button 
              onClick={() => setActiveTab("other_positions")}
              className={`pb-4 text-[14px] font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "other_positions" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              Other Positions <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">{clientPositions.length}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800 text-[15px]">Position Details</h3>
                  {canEditPosition && position.status !== 'Closed' && position.status !== 'Cancelled' && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <FileEdit className="w-4 h-4" /> Edit Details
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-px bg-slate-100">
                  <div className="bg-white p-5 col-span-2 sm:col-span-1">
                    <p className="text-[13px] font-medium text-slate-500 mb-1">Department</p>
                    <p className="font-semibold text-slate-900">{currentPos.department}</p>
                  </div>
                  <div className="bg-white p-5 col-span-2 sm:col-span-1">
                    <p className="text-[13px] font-medium text-slate-500 mb-1">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                          style={{ width: `${fulfillmentPercentage}%` }}
                        />
                      </div>
                      {currentPos.requested_count > 0 && (
                        <span className="text-xs font-bold text-slate-600">
                          {Math.round((currentPos.closed_count / currentPos.requested_count) * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {canViewFinancials && (
                    <>
                      <div className="bg-white p-5">
                        <p className="text-[13px] font-medium text-slate-500 mb-1">Cost Per Resource</p>
                        <p className="font-semibold text-slate-900">{currentPos.per_resource_cost}</p>
                      </div>
                      <div className="bg-white p-5">
                        <p className="text-[13px] font-medium text-slate-500 mb-1">Billing Slab</p>
                        <p className="font-semibold text-slate-900">{currentPos.billing_slab}</p>
                      </div>
                    </>
                  )}
                  <div className="bg-white p-5 col-span-2">
                    <p className="text-[13px] font-medium text-slate-500 mb-1">Expected Joining Date</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CalendarIcon className="w-4 h-4 text-amber-500" />
                      <p className="font-semibold text-slate-900">{format(new Date(currentPos.expected_joining_date), "MMMM d, yyyy")}</p>
                    </div>
                  </div>
                  {currentPos.remarks && (
                    <div className="bg-white p-5 col-span-2">
                      <p className="text-[13px] font-medium text-slate-500 mb-1">Initial Remarks</p>
                      <p className="text-slate-700 text-sm">{currentPos.remarks}</p>
                    </div>
                  )}
                  {currentPos.modification_reason && (
                    <div className="bg-amber-50 p-5 col-span-2 border border-amber-100 rounded-b-xl">
                      <p className="text-[13px] font-bold text-amber-900 mb-1">Latest Modification Reason</p>
                      <p className="text-amber-800 text-sm">{currentPos.modification_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cross-Module Relational Context (Client Snapshot) */}
              {currentPos.client && (
                <div className="bg-gradient-to-br from-[#0B132B] to-[#1a2952] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-amber-400" />
                      <h3 className="font-semibold text-[15px] text-white">Client Context</h3>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-md mt-2">
                      This position belongs to <strong className="text-white">{currentPos.client.company_name}</strong>. You can view all of their active and historical positions in the Clients module.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB: CLOSURES */}
          {activeTab === "closures" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              
              {/* Tracker Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-[16px]">Fulfillment Progress</h3>
                    <p className="text-slate-500 text-sm mt-0.5">Track how many resources have been onboarded</p>
                  </div>
                  {!isMultiLocation && (
                    <div className="text-right">
                      <p className="text-3xl font-bold text-slate-900 tracking-tight">{currentPos.closed_count} <span className="text-xl text-slate-400 font-medium">/ {currentPos.requested_count}</span></p>
                    </div>
                  )}
                </div>
                
                {isMultiLocation ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-500">Total Progress:</span>
                      <span className="text-sm font-bold text-slate-900">{currentPos.closed_count} / {currentPos.requested_count}</span>
                    </div>
                    {(currentPos.locations as any[]).map((loc: any, idx: number) => {
                      const locClosed = loc.closed_count || 0;
                      const locRequested = loc.count || 0;
                      const locPct = Math.min(100, Math.round((locClosed / locRequested) * 100));
                      return (
                        <div key={idx}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[13px] font-semibold text-slate-700">{loc.name}</span>
                            <span className="text-[13px] font-bold text-slate-900">{locClosed} <span className="text-slate-400 font-medium">/ {locRequested}</span></span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${locPct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${fulfillmentPercentage}%` }}
                    />
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  {currentPos.closed_count < currentPos.requested_count ? (
                    canAddClosure && (
                      <button 
                        onClick={() => setIsClosing(!isClosing)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${isClosing ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                      >
                        {isClosing ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isClosing ? 'Cancel' : 'Log a Closure'}
                      </button>
                    )
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                      <CheckCircle2 className="w-5 h-5" />
                      Fully Closed
                    </div>
                  )}
                </div>
              </div>

              {/* Closure Form */}
              {isClosing && (
                <PositionClosureForm 
                  position={currentPos}
                  onSuccess={() => {
                    setIsClosing(false);
                    fetchPosition();
                    onRefresh();
                    fetchHistory();
                  }}
                />
              )}

              {/* Closure List */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  Past Closures
                </h4>
                {isLoadingHistory ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                ) : closures.length === 0 ? (
                  <div className="bg-slate-100/50 border border-slate-200 border-dashed rounded-2xl p-8 text-center">
                    <p className="text-slate-500 font-medium">No resources have been closed for this position yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {closures.map(closure => (
                      <div key={closure.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-slate-900">{closure.closed_count} Resource{closure.closed_count > 1 ? 's' : ''} Closed</h5>
                            <div className="flex items-center gap-2">
                              {closure.location && (
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {closure.location}
                                </span>
                              )}
                              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                {format(new Date(closure.closure_date), "MMM d, yyyy")}
                              </span>
                              {canDeleteClosure && (
                                <button
                                  onClick={() => handleDeleteClosure(closure.id)}
                                  disabled={deletingClosureId === closure.id}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                  title="Delete Closure"
                                >
                                  {deletingClosureId === closure.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-700 text-sm mt-1">{closure.closure_details}</p>
                          {closure.remarks && <p className="text-slate-500 text-xs mt-2 italic">"{closure.remarks}"</p>}
                          {closure.closer && (
                            <p className="text-slate-400 text-xs mt-3 flex items-center gap-1">
                              Logged by {closure.closer.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: HISTORY */}
          {activeTab === "history" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-[16px] mb-6 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" />
                  Audit Timeline
                </h3>
                
                {isLoadingHistory ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No history found.</p>
                ) : (
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 pb-4">
                    {auditLogs.map((log, index) => {
                      const isCreate = log.action.includes("Create");
                      const isClose = log.action.includes("Close");
                      return (
                        <div key={log.id} className="relative">
                          <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white ring-4 ring-white ${isCreate ? 'bg-green-500' : isClose ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${isCreate ? 'bg-green-100 text-green-700' : isClose ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                {log.action}
                              </span>
                              <span className="text-[12px] font-semibold text-slate-400 flex items-center gap-1.5">
                                <CalendarIcon className="w-3 h-3" />
                                {format(new Date(log.timestamp), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                            {log.reason && (
                              <p className="text-sm text-slate-700 mt-2 font-medium bg-white px-3 py-2 rounded-lg border border-slate-100">
                                {log.reason}
                              </p>
                            )}
                            <div className="mt-3 text-[12px] text-slate-500 flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                {log.modifier?.name?.charAt(0) || "S"}
                              </div>
                              By {log.modifier?.name || "System"}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: OTHER POSITIONS */}
          {activeTab === "other_positions" && currentPos.client && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800 text-[16px] flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                    Other Positions at {currentPos.client.company_name}
                  </h3>
                  <Link href={`/clients/${currentPos.client_id}`} className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    View Client Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                
                {isLoadingClientPositions ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                ) : clientPositions.length === 0 ? (
                  <p className="text-slate-500 text-center py-12 text-[14px]">No other positions found for this client.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {clientPositions.map((pos) => (
                      <div 
                        key={pos.id} 
                        className={`p-5 transition-colors ${onSelectPosition ? 'hover:bg-slate-50 cursor-pointer group' : ''}`}
                        onClick={() => {
                          if (onSelectPosition) {
                            onSelectPosition(pos);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-[15px] group-hover:text-blue-600 transition-colors">{pos.role_name}</h4>
                            <p className="text-[13px] text-slate-500 mt-0.5">{pos.department}</p>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getStatusColor(pos.status)}`}>
                            {pos.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-[12px]">
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <span className="text-emerald-600 font-bold">{pos.closed_count}</span> / {pos.requested_count} Fulfilled
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="font-medium text-slate-500 flex items-center gap-1">
                            <CalendarIcon className="w-3.5 h-3.5" /> {format(new Date(pos.expected_joining_date), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      <ConfirmDialog
        open={!!closureToDelete}
        onOpenChange={(open) => !open && setClosureToDelete(null)}
        title="Delete Closure"
        description="Are you sure you want to delete this closure? The position fulfillment count will be updated."
        onConfirm={confirmDeleteClosure}
        confirmText="Delete Closure"
      />
    </>
  );
}
