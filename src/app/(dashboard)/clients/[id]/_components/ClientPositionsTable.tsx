"use client";

import { useState } from "react";
import { PositionDetailsSheet } from "@/app/(dashboard)/positions/_components/PositionDetailsSheet";
import { useRouter } from "next/navigation";

interface ClientPositionsTableProps {
  client: any;
}

export function ClientPositionsTable({ client }: ClientPositionsTableProps) {
  const router = useRouter();
  const [selectedPosition, setSelectedPosition] = useState<any | null>(null);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-[12px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Role</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Closed</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Value</th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider">Status</th>
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
                    <td className="px-6 py-4 font-bold text-slate-900">{pos.role_name}</td>
                    <td className="px-6 py-4 font-medium">{pos.requested_count}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{pos.closed_count}</td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(pos.requested_count * Number(pos.per_resource_cost))}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
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
