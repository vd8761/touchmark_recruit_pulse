"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, CheckCircle, FileText, Users, AlertTriangle, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Filter } from 'lucide-react';
import { useSettings } from '@/providers/SettingsProvider';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, Label
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MonthData = {
  id: string;
  monthLabel: string;
  joined: { count: number; value: number };
  profitInvoiced: { count: number; value: number };
  lossDropped: { count: number; value: number };
  atRiskSustenance: { count: number; value: number };
  invoicesGenerated: { count: number; value: number };
};

type MetricsData = {
  pipeline: { count: number; value: number };
  months: MonthData[];
  analytics: {
    recruiters: { name: string; pipelineDeals: number; pipelineValue: number; closedDeals: number; closedValue: number }[];
    clients: { name: string; deals: number; value: number }[];
    funnel: { name: string; count: number }[];
  };
  lastUpdated: string;
};

const COLORS = ['#0B132B', '#F59E0B', '#3B82F6', '#10B981', '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E'];

export default function SheetMetricsClient({ data }: { data: MetricsData }) {
  const { settings } = useSettings();
  
  // Default to the most recent month if available
  const [selectedMonthId, setSelectedMonthId] = useState<string>(
    data.months.length > 0 ? data.months[0].id : ''
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(settings?.currencyLocale || 'en-IN', {
      style: 'currency',
      currency: settings?.currencyCode || 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const selectedMonth = data.months.find(m => m.id === selectedMonthId);
  const totalClientRevenue = data.analytics.clients.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col gap-6 px-6 pb-8 pt-2 md:px-8 animate-in fade-in duration-500">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vendor Dashboard (Google Sheets)</h1>
          <p className="text-sm text-slate-500">
            Real-time metrics synced from Google Sheets. 
            Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        
        {data.months.length > 0 && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <span className="text-sm font-medium text-slate-600 pl-3">Reporting Month:</span>
            <Select value={selectedMonthId} onValueChange={(val) => setSelectedMonthId(val || '')}>
              <SelectTrigger className="w-[115px] px-3 bg-slate-50 border-none text-sm font-semibold text-slate-900 focus:ring-0 shadow-none hover:bg-slate-100 transition-colors rounded-md py-1.5 h-auto flex items-center justify-between">
                <SelectValue placeholder="Select month">
                  {data.months.find(m => m.id === selectedMonthId)?.monthLabel || "Select month"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-lg rounded-xl overflow-hidden">
                {data.months.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-900 font-medium py-2">
                    {m.monthLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Global Pipeline (Not tied to a month) */}
      <div className="bg-[#0B132B] text-white rounded-xl p-6 shadow-lg shadow-slate-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
          <Activity className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h2 className="text-sm font-medium text-slate-400 mb-1 tracking-wider uppercase">Global Pipeline (Real-Time)</h2>
          <div className="flex items-end gap-4 mt-2">
            <div className="text-4xl font-bold text-amber-400">{data.pipeline.count} <span className="text-lg font-medium text-slate-300">Deals</span></div>
            <div className="h-8 w-[1px] bg-slate-700 mx-2 hidden sm:block"></div>
            <div className="text-3xl font-bold">{formatCurrency(data.pipeline.value)} <span className="text-lg font-medium text-slate-300">Expected Value</span></div>
          </div>
        </div>
      </div>

      {!selectedMonth ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center text-slate-500">
          No historical monthly data found. Deals need an "Actual D.O.J" to appear here.
        </div>
      ) : (
        <>
          {/* Monthly P&L Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            
            {/* Gross Joined */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-bold text-slate-600 whitespace-nowrap tracking-tight mr-1">Gross Deals</CardTitle>
                <Users className="h-4 w-4 text-blue-500 shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter" title={formatCurrency(selectedMonth.joined.value)}>{formatCurrency(selectedMonth.joined.value)}</div>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
                  {selectedMonth.joined.count} Deals
                </p>
              </CardContent>
            </Card>

            {/* Profit (Invoiced) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-bold text-slate-600 whitespace-nowrap tracking-tight mr-1">Realized Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter" title={formatCurrency(selectedMonth.profitInvoiced.value)}>{formatCurrency(selectedMonth.profitInvoiced.value)}</div>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
                  {selectedMonth.profitInvoiced.count} Deals
                </p>
              </CardContent>
            </Card>

            {/* Invoices Generated */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-bold text-slate-600 whitespace-nowrap tracking-tight mr-1">Invoices Generated</CardTitle>
                <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter" title={formatCurrency(selectedMonth.invoicesGenerated.value)}>{formatCurrency(selectedMonth.invoicesGenerated.value)}</div>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
                  {selectedMonth.invoicesGenerated.count} Invoices
                </p>
              </CardContent>
            </Card>

            {/* Loss (Dropped) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-bold text-slate-600 whitespace-nowrap tracking-tight mr-1">Loss (Dropped)</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600 shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter" title={formatCurrency(selectedMonth.lossDropped.value)}>{formatCurrency(selectedMonth.lossDropped.value)}</div>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
                  {selectedMonth.lossDropped.count} Deals
                </p>
              </CardContent>
            </Card>

            {/* At Risk (Sustenance) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-bold text-slate-600 whitespace-nowrap tracking-tight mr-1">At Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter" title={formatCurrency(selectedMonth.atRiskSustenance.value)}>{formatCurrency(selectedMonth.atRiskSustenance.value)}</div>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
                  {selectedMonth.atRiskSustenance.count} Deals
                </p>
              </CardContent>
            </Card>

          </div>

          {/* Deep Dive Progress Bar */}
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Breakdown for {selectedMonth.monthLabel}</CardTitle>
              <CardDescription>Visualizing the outcome of all {selectedMonth.joined.count} deals that joined this month.</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedMonth.joined.value > 0 ? (
                <>
                  <div className="w-full h-3 flex rounded-full overflow-hidden mt-2 bg-slate-100">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${(selectedMonth.profitInvoiced.value / selectedMonth.joined.value) * 100}%` }}
                      title={`Profit: ${formatCurrency(selectedMonth.profitInvoiced.value)}`}
                    ></div>
                    <div 
                      className="bg-amber-400 h-full transition-all duration-500" 
                      style={{ width: `${(selectedMonth.atRiskSustenance.value / selectedMonth.joined.value) * 100}%` }}
                      title={`At Risk: ${formatCurrency(selectedMonth.atRiskSustenance.value)}`}
                    ></div>
                    <div 
                      className="bg-rose-500 h-full transition-all duration-500" 
                      style={{ width: `${(selectedMonth.lossDropped.value / selectedMonth.joined.value) * 100}%` }}
                      title={`Lost: ${formatCurrency(selectedMonth.lossDropped.value)}`}
                    ></div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        Realized (Profit)
                      </div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(selectedMonth.profitInvoiced.value)}</div>
                      <div className="text-xs font-semibold text-emerald-600">{((selectedMonth.profitInvoiced.value / selectedMonth.joined.value) * 100).toFixed(1)}% of total</div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        At Risk
                      </div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(selectedMonth.atRiskSustenance.value)}</div>
                      <div className="text-xs font-semibold text-amber-600">{((selectedMonth.atRiskSustenance.value / selectedMonth.joined.value) * 100).toFixed(1)}% of total</div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        Clawback / Loss
                      </div>
                      <div className="text-lg font-bold text-slate-900">{formatCurrency(selectedMonth.lossDropped.value)}</div>
                      <div className="text-xs font-semibold text-rose-600">{((selectedMonth.lossDropped.value / selectedMonth.joined.value) * 100).toFixed(1)}% of total</div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                        Active / Uninvoiced
                      </div>
                      <div className="text-lg font-bold text-slate-900">
                        {formatCurrency(Math.max(0, selectedMonth.joined.value - (selectedMonth.profitInvoiced.value + selectedMonth.atRiskSustenance.value + selectedMonth.lossDropped.value)))}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        {((Math.max(0, selectedMonth.joined.value - (selectedMonth.profitInvoiced.value + selectedMonth.atRiskSustenance.value + selectedMonth.lossDropped.value)) / selectedMonth.joined.value) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-12 flex items-center justify-center text-xs text-slate-400 font-medium bg-slate-50 rounded-lg">No Value Generated</div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Analytics Section (Always visible) */}
      <div className="mt-8 mb-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Advanced Analytics
        </h2>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          
          {/* Recruiter Performance */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-700">Top Recruiters Performance</CardTitle>
              <CardDescription>Pipeline vs Closed Value</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.analytics.recruiters} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(value) => `₹${(value/100000).toFixed(0)}L`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fontWeight: 500, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="closedValue" stackId="a" fill="#0B132B" name="Closed Value" maxBarSize={24} />
                  <Bar dataKey="pipelineValue" stackId="a" fill="#F59E0B" name="Pipeline Value" maxBarSize={24} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Client Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-700">Client Revenue</CardTitle>
              <CardDescription>Top 10 clients by closed value</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.analytics.clients}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {data.analytics.clients.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <Label
                      value={formatCurrency(totalClientRevenue)}
                      position="center"
                      className="text-lg font-bold fill-slate-900"
                    />
                    <Label
                      value="Total Closed"
                      position="center"
                      dy={20}
                      className="text-xs font-medium fill-slate-500"
                    />
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center" 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline Funnel */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-700">Hiring Pipeline Funnel</CardTitle>
              <CardDescription>Current volume by stage</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.analytics.funnel} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Candidates" maxBarSize={40}>
                    {data.analytics.funnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
}
