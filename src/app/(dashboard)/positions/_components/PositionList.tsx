"use client";

import { useEffect, useState, Suspense } from "react";
import { format } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Plus, Building2, Briefcase } from "lucide-react";
import { useSettings } from "@/providers/SettingsProvider";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { PositionForm } from "./PositionForm";
import { PositionDetailsSheet } from "./PositionDetailsSheet";
import { Eye } from "lucide-react";

interface Position {
  id: string;
  client_id: string;
  client: {
    company_name: string;
    client_name: string;
  };
  role_name: string;
  department: string;
  requested_count: number;
  closed_count: number;
  per_resource_cost: string | number;
  billing_slab: string;
  priority: string;
  status: string;
  expected_joining_date: string;
  updated_at: string;
}

function PositionListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newClientId = searchParams.get('new_client_id');
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | undefined>();
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>();
  const { settings } = useSettings();

  useEffect(() => {
    if (newClientId) {
      setPreselectedClientId(newClientId);
      setIsFormOpen(true);
      // Optional: remove query param from URL so refresh doesn't pop it open again
      router.replace('/positions');
    }
  }, [newClientId, router]);

  const fetchPositions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/positions");
      const data = await res.json();
      if (res.ok) {
        setPositions(data);
        setSelectedPosition(prev => {
          if (!prev) return prev;
          return data.find((p: Position) => p.id === prev.id) || prev;
        });
      }
    } catch (err) {
      console.error("Failed to fetch positions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const handleAddNew = () => {
    setSelectedPosition(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (position: Position) => {
    setSelectedPosition(position);
    setIsFormOpen(true);
  };

  const handleView = (position: Position) => {
    setSelectedPosition(position);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this position?")) return;
    
    try {
      const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPositions(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete position");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(settings.currencyLocale, {
      style: 'currency',
      currency: settings.currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical": return "bg-red-100 text-red-800 border-red-200";
      case "High": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Medium": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Low": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-emerald-100 text-emerald-800";
      case "Partially Closed": return "bg-amber-100 text-amber-800";
      case "Closed": return "bg-slate-100 text-slate-600";
      case "On Hold": return "bg-purple-100 text-purple-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Positions</h2>
          <p className="text-[14px] text-slate-500 mt-1">Manage open jobs and track fulfillment progress.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-600 text-amber-950 font-bold px-4 py-2.5 rounded-[10px] transition-all shadow-sm flex items-center gap-2 self-start sm:self-auto border border-amber-500/50"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          Add Position
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Role & Company</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider hidden md:table-cell">Cost & Slab</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider hidden sm:table-cell text-center">Fulfillment</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Status & Priority</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                    <p className="text-slate-500 mt-2 text-sm font-medium">Loading positions...</p>
                  </td>
                </tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
                      <Briefcase className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg mb-1.5">No positions found</h3>
                    <p className="text-slate-500 text-[15px] mb-6 max-w-sm mx-auto leading-relaxed">
                      Get started by adding your first job opening for a client.
                    </p>
                    <button 
                      onClick={handleAddNew} 
                      className="text-amber-600 hover:text-amber-700 font-semibold text-[15px] flex items-center gap-1.5 mx-auto transition-colors group"
                    >
                      <Plus className="w-4 h-4 transition-transform group-hover:scale-110" strokeWidth={2.5} />
                      <span className="hover:underline underline-offset-4">Add your first position</span>
                    </button>
                  </td>
                </tr>
              ) : (
                positions.map((position) => {
                  const totalCost = position.requested_count * Number(position.per_resource_cost);
                  const progressPercentage = Math.min(100, Math.round((position.closed_count / position.requested_count) * 100));
                  
                  return (
                    <tr key={position.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-[15px] mb-0.5">{position.role_name}</div>
                        <div className="text-slate-500 text-[13px] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {position.client?.company_name} <span className="text-slate-300">•</span> {position.department}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1 font-semibold text-slate-900">
                          {formatCurrency(totalCost)}
                        </div>
                        <div className="text-slate-500 text-[12px] mt-0.5 font-medium">
                          Slab: {position.billing_slab}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-3">
                          <div className="text-right">
                            <div className="text-[13px] font-bold text-slate-900">{position.closed_count} <span className="text-slate-400 font-medium">/ {position.requested_count}</span></div>
                          </div>
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${progressPercentage === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                          <div className="text-[12px] font-medium text-slate-500 w-8">{progressPercentage}%</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          {position.status === 'Closed' ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${getStatusColor(position.status)}`}>
                                Closed
                              </span>
                              {position.updated_at && (
                                <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                                  on {format(new Date(position.updated_at), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${getStatusColor(position.status)}`}>
                              {position.status}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityColor(position.priority)}`}>
                            {position.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleView(position)} className="relative group/btn flex items-center justify-center w-9 h-9 text-slate-400 hover:bg-slate-100 hover:text-blue-600 rounded-md transition-colors cursor-pointer">
                            <Eye className="w-[18px] h-[18px]" strokeWidth={2.5} />
                            <div className="absolute bottom-full mb-1.5 opacity-0 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:translate-y-0 pointer-events-none transition-all duration-200 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded-[6px] shadow-lg whitespace-nowrap z-10">
                              View Details
                            </div>
                          </button>
                          {position.status !== 'Closed' && position.status !== 'Cancelled' && (
                            <button onClick={() => handleEdit(position)} className="relative group/btn flex items-center justify-center w-9 h-9 text-slate-400 hover:bg-slate-100 hover:text-amber-600 rounded-md transition-colors cursor-pointer">
                              <FiEdit2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
                              <div className="absolute bottom-full mb-1.5 opacity-0 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:translate-y-0 pointer-events-none transition-all duration-200 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded-[6px] shadow-lg whitespace-nowrap z-10">
                                Edit
                              </div>
                            </button>
                          )}
                          <button onClick={() => handleDelete(position.id)} className="relative group/btn flex items-center justify-center w-9 h-9 text-slate-400 hover:bg-slate-100 hover:text-red-600 rounded-md transition-colors cursor-pointer">
                            <FiTrash2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
                            <div className="absolute bottom-full mb-1.5 opacity-0 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:translate-y-0 pointer-events-none transition-all duration-200 bg-slate-800 text-white text-[11px] font-bold px-2 py-1 rounded-[6px] shadow-lg whitespace-nowrap z-10">
                              Delete
                            </div>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PositionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchPositions}
        initialData={selectedPosition}
        preselectedClientId={preselectedClientId}
      />
      
      {selectedPosition && (
        <PositionDetailsSheet 
          position={selectedPosition}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onRefresh={fetchPositions}
        />
      )}
    </>
  );
}

export function PositionList() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" /></div>}>
      <PositionListInner />
    </Suspense>
  );
}
