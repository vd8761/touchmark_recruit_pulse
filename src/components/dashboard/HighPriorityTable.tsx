"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

export function HighPriorityTable({ positions }: { positions: any[] }) {
  if (!positions || positions.length === 0) {
    return (
      <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-sm border border-emerald-100">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-[16px] font-bold text-slate-900">No High Priority Requirements</h3>
        <p className="text-[14px] text-slate-500 mt-2 max-w-sm">
          You're all caught up! There are currently no critical or high priority positions that require immediate attention.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden h-full">
      <div className="p-6 border-b border-slate-100 flex items-center gap-2 bg-red-50/30">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <h3 className="text-[16px] font-bold text-slate-900">High Priority Requirements</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 font-semibold text-[13px] uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4">Required</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Target Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {positions.map((pos) => (
              <tr key={pos.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">
                  <Link href={`/positions`} className="hover:text-blue-600 transition-colors">
                    {pos.role_name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-slate-600">{pos.client.company_name}</td>
                <td className="px-6 py-4 text-slate-600">
                  <span className="font-semibold text-slate-900">{pos.requested_count}</span>
                  <span className="text-slate-400 mx-1">/</span>
                  <span className="text-emerald-600">{pos.closed_count} closed</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    pos.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {pos.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-500">
                  {new Date(pos.expected_joining_date).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
