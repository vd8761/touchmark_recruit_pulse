"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { useSettings } from "@/providers/SettingsProvider";

const PIE_COLORS = ['#f59e0b', '#0f172a', '#fbbf24', '#334155', '#fcd34d', '#64748b'];

export function RoleOpeningsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
        <h3 className="text-[16px] font-bold text-slate-900 mb-6">Openings by Role</h3>
        <div className="flex-1 w-full flex items-center justify-center text-slate-400 min-h-[300px]">No data available</div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
      <h3 className="text-[16px] font-bold text-slate-900 mb-6">Openings by Role</h3>
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function ClientOpeningsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
        <h3 className="text-[16px] font-bold text-slate-900 mb-6">Openings by Client</h3>
        <div className="flex-1 w-full flex items-center justify-center text-slate-400 min-h-[300px]">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
      <h3 className="text-[16px] font-bold text-slate-900 mb-6">Openings by Client</h3>
      <div className="flex-1 w-full">
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
              <Bar dataKey="open" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function MonthlyTrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
        <h3 className="text-[16px] font-bold text-slate-900 mb-6">Monthly Closure Trend</h3>
        <div className="flex-1 w-full flex items-center justify-center text-slate-400 min-h-[300px]">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
      <h3 className="text-[16px] font-bold text-slate-900 mb-6">Monthly Closure Trend</h3>
      <div className="flex-1 w-full">
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
              <Line type="monotone" dataKey="closures" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function RevenuePipelineChart({ data }: { data: any[] }) {
  const { settings } = useSettings();
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
        <h3 className="text-[16px] font-bold text-slate-900 mb-6">Revenue Pipeline</h3>
        <div className="flex-1 w-full flex items-center justify-center text-slate-400 min-h-[300px]">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full flex flex-col animate-in fade-in duration-700 slide-in-from-bottom-4">
      <h3 className="text-[16px] font-bold text-slate-900 mb-6">Revenue Pipeline</h3>
      <div className="flex-1 w-full">
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${settings?.currencySymbol || '$'}${val >= 1000 ? val/1000 + 'k' : val}`} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val: any) => new Intl.NumberFormat(settings?.currencyLocale || 'en-US', { style: 'currency', currency: settings?.currencyCode || 'USD', maximumFractionDigits: 0 }).format(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
