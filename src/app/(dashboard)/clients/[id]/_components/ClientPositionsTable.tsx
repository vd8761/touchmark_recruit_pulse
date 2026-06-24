"use client";

import { useState } from "react";
import { useSettings } from "@/providers/SettingsProvider";
import { PositionDetailsSheet } from "@/app/(dashboard)/positions/_components/PositionDetailsSheet";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MapPin } from "lucide-react";

interface ClientPositionsTableProps {
  client: any;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open": return "bg-blue-50 text-blue-700 border border-blue-200/50";
    case "Partially Closed": return "bg-amber-50 text-amber-700 border border-amber-200/50";
    case "Closed": return "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
    case "On Hold": return "bg-purple-50 text-purple-700 border border-purple-200/50";
    case "Cancelled": return "bg-red-50 text-red-700 border border-red-200/50";
    default: return "bg-slate-100 text-slate-700 border border-slate-200/50";
  }
};

export function ClientPositionsTable({ client }: ClientPositionsTableProps) {
  const router = useRouter();
  const [selectedPosition, setSelectedPosition] = useState<any | null>(null);
  const { settings } = useSettings();
  const { data: session } = useSession();

  const userRole = session?.user?.role || "Viewer";
  const canViewFinancials = !["Business Development", "Recruitment", "Viewer"].includes(userRole);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(settings?.currencyLocale || 'en-US', { style: 'currency', currency: settings?.currencyCode || 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider w-[40%] min-w-[280px]">Role</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider w-[15%] min-w-[120px]">Requested</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider w-[15%] min-w-[120px]">Closed</th>
                {canViewFinancials && (
                  <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider w-[15%] min-w-[120px]">Value</th>
                )}
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider w-[15%] min-w-[150px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {client.positions.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">No positions found for this client.</td></tr>
              ) : (
                client.positions.map((pos: any) => (
                  <tr 
                    key={pos.id} 
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedPosition({ ...pos, client: { company_name: client.company_name, contact_person: client.contact_person } })}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 mb-0.5">{pos.role_name}</div>
                      <div className="text-slate-500 text-[13px] flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {pos.department}
                        {pos.locations && Array.isArray(pos.locations) && pos.locations.length > 0 ? (
                          <>
                            <span className="text-slate-300">•</span>
                            <MapPin className="w-3.5 h-3.5" />
                            {pos.locations.map((l: any) => `${l.name} (${l.count})`).join(', ')}
                          </>
                        ) : pos.location && (
                          <>
                            <span className="text-slate-300">•</span>
                            <MapPin className="w-3.5 h-3.5" />
                            {pos.location}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{pos.requested_count}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{pos.closed_count}</td>
                    {canViewFinancials && (
                      <td className="px-6 py-4 text-slate-600">{formatCurrency(pos.requested_count * Number(pos.per_resource_cost))}</td>
                    )}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${getStatusColor(pos.status)}`}>
                        {pos.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPosition && (
        <PositionDetailsSheet
          position={selectedPosition}
          isOpen={true}
          onClose={() => setSelectedPosition(null)}
          onRefresh={() => router.refresh()}
        />
      )}
    </>
  );
}
