"use client";

import { useState, useTransition, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, CheckCircle, FileText, Users, AlertTriangle, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Filter, Loader2 } from 'lucide-react';
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
  invoicesPaid: { count: number; value: number };
};

type MetricsData = {
  pipeline: { count: number; value: number };
  months: MonthData[];
  analytics: {
    recruiters: { name: string; pipelineDeals: number; pipelineValue: number; closedDeals: number; closedValue: number }[];
    clients: { name: string; deals: number; value: number; paidValue: number }[];
    funnel: { name: string; count: number }[];
  };
  allCandidates?: { date: string; candidate: string; company: string; amount: number; balanceAmount: number; status: string; invoiceStatus: string; recruiter: string }[];
  lastUpdated: string;
};

const COLORS = ['#0B132B', '#F59E0B', '#3B82F6', '#10B981', '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E'];

export default function SheetMetricsClient({ data, vendor }: { data: MetricsData, vendor: string }) {
  const { settings } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  const handleVendorChange = (newVendor: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('vendor', newVendor);
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const [selectedMonthId, setSelectedMonthId] = useState<string>('all');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(settings?.currencyLocale || 'en-IN', {
      style: 'currency',
      currency: settings?.currencyCode || 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const selectedMonth = selectedMonthId === 'all'
    ? {
        id: 'all',
        monthLabel: 'All Months',
        joined: { 
          count: data.months.reduce((acc, m) => acc + m.joined.count, 0), 
          value: data.months.reduce((acc, m) => acc + m.joined.value, 0) 
        },
        profitInvoiced: { 
          count: data.months.reduce((acc, m) => acc + m.profitInvoiced.count, 0), 
          value: data.months.reduce((acc, m) => acc + m.profitInvoiced.value, 0) 
        },
        lossDropped: { 
          count: data.months.reduce((acc, m) => acc + m.lossDropped.count, 0), 
          value: data.months.reduce((acc, m) => acc + m.lossDropped.value, 0) 
        },
        atRiskSustenance: { 
          count: data.months.reduce((acc, m) => acc + m.atRiskSustenance.count, 0), 
          value: data.months.reduce((acc, m) => acc + m.atRiskSustenance.value, 0) 
        },
        invoicesGenerated: { 
          count: data.months.reduce((acc, m) => acc + m.invoicesGenerated.count, 0), 
          value: data.months.reduce((acc, m) => acc + m.invoicesGenerated.value, 0) 
        },
        invoicesPaid: { 
          count: data.months.reduce((acc, m) => acc + m.invoicesPaid.count, 0), 
          value: data.months.reduce((acc, m) => acc + m.invoicesPaid.value, 0) 
        }
      }
    : data.months.find(m => m.id === selectedMonthId);


  const dynamicAnalytics = useMemo(() => {
    if (!data.allCandidates) return { ...data.analytics, outstandingInvoices: [] };

    const filteredCandidates = selectedMonthId === 'all'
      ? data.allCandidates
      : data.allCandidates.filter(c => {
          if (!c.date) return false;
          const mKey = new Date(c.date);
          if (isNaN(mKey.getTime())) return false;
          const key = `${mKey.getFullYear()}-${String(mKey.getMonth() + 1).padStart(2, '0')}`;
          return key === selectedMonthId;
        });

    const recruiterStats: Record<string, { name: string; pipelineDeals: number; pipelineValue: number; closedDeals: number; closedValue: number }> = {};
    const clientStats: Record<string, { name: string; deals: number; value: number; paidValue: number }> = {};
    const funnelStats: Record<string, number> = {
      'Sourced': 0, 'Screened': 0, 'Submitted to Client': 0, 'Shortlisted': 0, 'Interviewing': 0, 'Offered': 0, 'Offer Accepted': 0, 'Joined': 0
    };
    
    const pipelineStatuses = ['Sourced', 'Screened', 'Submitted to Client', 'Shortlisted', 'Interviewing', 'Offer Accepted'];

    filteredCandidates.forEach(row => {
      const { status, amount: budget, recruiter, company, invoiceStatus } = row;
      
      if (funnelStats[status] !== undefined) {
        funnelStats[status]++;
      }

      if (!recruiterStats[recruiter]) {
        recruiterStats[recruiter] = { name: recruiter, pipelineDeals: 0, pipelineValue: 0, closedDeals: 0, closedValue: 0 };
      }
      
      if (pipelineStatuses.includes(status)) {
        recruiterStats[recruiter].pipelineDeals++;
        recruiterStats[recruiter].pipelineValue += budget;
      } else if (status === 'Joined' || status === 'Invoiced') {
        recruiterStats[recruiter].closedDeals++;
        recruiterStats[recruiter].closedValue += budget;
        
        if (!clientStats[company]) {
          clientStats[company] = { name: company, deals: 0, value: 0, paidValue: 0 };
        }
        clientStats[company].deals++;
        clientStats[company].value += budget;
        
        const isPaid = invoiceStatus.toLowerCase().includes('paid') || invoiceStatus.toLowerCase().includes('received');
        if (isPaid) {
          clientStats[company].paidValue += budget;
        }
      }
    });

    const topRecruiters = Object.values(recruiterStats).sort((a, b) => b.closedValue - a.closedValue).slice(0, 10);
    const topClients = Object.values(clientStats).sort((a, b) => b.value - a.value).slice(0, 10);
    const funnelData = Object.entries(funnelStats).map(([name, count]) => ({ name, count })).filter(f => f.count > 0);

    const outstandingInvoices = filteredCandidates
      .filter(c => {
        const invStatus = c.invoiceStatus.toLowerCase();
        const isOutstanding = invStatus.includes('pending') || invStatus.includes('generated') || invStatus.includes('send') || invStatus.includes('overdue') || invStatus.includes('not yet') || invStatus.includes('partially received');
        // Only show if it's considered a closed deal and has an outstanding balance
        return isOutstanding && (c.status === 'Joined' || c.status === 'Invoiced' || c.amount > 0) && c.balanceAmount > 0;
      })
      .sort((a, b) => b.balanceAmount - a.balanceAmount);

    return {
      recruiters: topRecruiters,
      clients: topClients,
      funnel: funnelData,
      outstandingInvoices
    };
  }, [data, selectedMonthId]);

  return (
    <div className={`flex flex-col gap-6 px-6 pb-8 pt-2 md:px-8 animate-in fade-in duration-500 ${isPending ? 'opacity-60 pointer-events-none transition-opacity' : ''}`}>

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Google Sheet Dashboard</h1>
            <Select value={vendor} onValueChange={(val) => handleVendorChange(val as string)} disabled={isPending}>
              <SelectTrigger className="w-[220px] h-9 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors focus:ring-0 focus:ring-offset-0 rounded-lg shadow-sm">
                <SelectValue>{vendor === 'descience' ? 'Touchmark Descience' : 'Touchmark Workforce'}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                <SelectItem value="workforce" className="font-semibold cursor-pointer py-2">Touchmark Workforce</SelectItem>
                <SelectItem value="descience" className="font-semibold cursor-pointer py-2">Touchmark Descience</SelectItem>
              </SelectContent>
            </Select>
            {isPending && <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />}
          </div>
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
                  {selectedMonthId === 'all' ? 'All Months' : data.months.find(m => m.id === selectedMonthId)?.monthLabel || "Select month"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-lg rounded-xl overflow-hidden">
                <SelectItem value="all" className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-900 font-bold py-2 border-b border-slate-100">
                  All Months
                </SelectItem>
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
                <CardTitle className="text-[13px] font-bold text-slate-600 whitespace-nowrap tracking-tight mr-1">Realized Revenue</CardTitle>
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

            {/* Amount Collected / Paid */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[13px] font-bold text-slate-600 whitespace-nowrap tracking-tight mr-1">Amount Collected</CardTitle>
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter" title={formatCurrency(selectedMonth.invoicesPaid.value)}>{formatCurrency(selectedMonth.invoicesPaid.value)}</div>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
                  {selectedMonth.invoicesPaid.count} Invoices Paid
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
              <CardTitle>Revenue & Loss Breakdown for {selectedMonth.monthLabel}</CardTitle>
              <CardDescription>Visualizing the outcome of all {selectedMonth.joined.count} deals that joined this month.</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedMonth.joined.value > 0 ? (
                <>
                  <div className="w-full h-3 flex rounded-full overflow-hidden mt-2 bg-slate-100">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${(selectedMonth.profitInvoiced.value / selectedMonth.joined.value) * 100}%` }}
                      title={`Revenue: ${formatCurrency(selectedMonth.profitInvoiced.value)}`}
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
                        Realized (Revenue)
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
                  <XAxis type="number" tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fontWeight: 500, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="closedValue" stackId="a" fill="#0B132B" name="Closed Value" maxBarSize={32} />
                  <Bar dataKey="pipelineValue" stackId="a" fill="#F59E0B" name="Pipeline Value" maxBarSize={32} radius={[0, 4, 4, 0]} />
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
                <BarChart data={dynamicAnalytics.clients} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fontWeight: 500, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="value" fill="#0B132B" name="Closed Value" maxBarSize={32} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="paidValue" fill="#10B981" name="Paid Value" maxBarSize={32} radius={[0, 4, 4, 0]} />
                </BarChart>
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
                <BarChart data={dynamicAnalytics.funnel} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Candidates" maxBarSize={40}>
                    {dynamicAnalytics.funnel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Outstanding Invoices Section */}
      <div className="mb-8">
        <Card className="w-full border-amber-200 shadow-sm">
          <CardHeader className="bg-amber-50/50 border-b border-amber-100 rounded-t-xl pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-amber-900 flex items-center gap-2 text-base font-bold">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Pending Payment Details
                </CardTitle>
                <CardDescription className="text-amber-700 mt-1">Pending payments sorted by highest amount. Filters automatically by selected month.</CardDescription>
              </div>
              <div className="bg-white px-3 py-1 rounded-full border border-amber-200 text-sm font-bold text-amber-700 shadow-sm whitespace-nowrap self-start md:self-auto">
                {dynamicAnalytics.outstandingInvoices?.length || 0} Payments
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Company</th>
                    <th className="px-6 py-4 font-semibold">Recruiter</th>
                    <th className="px-6 py-4 font-semibold">Invoice Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Pending Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dynamicAnalytics.outstandingInvoices && dynamicAnalytics.outstandingInvoices.length > 0 ? (
                    dynamicAnalytics.outstandingInvoices.map((inv, idx) => {
                      const isValidDate = inv.date && !isNaN(new Date(inv.date).getTime());
                      return (
                      <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {isValidDate ? new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (inv.date || '-')}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{inv.company}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{inv.recruiter || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${
                            (inv.invoiceStatus || 'Pending').toLowerCase().includes('not yet') ? 'bg-rose-100 text-rose-700' :
                            (inv.invoiceStatus || 'Pending').toLowerCase().includes('partially') ? 'bg-blue-100 text-blue-700' :
                            (inv.invoiceStatus || 'Pending').toLowerCase().includes('generated') ? 'bg-indigo-100 text-indigo-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.invoiceStatus || 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-amber-600 text-right">{formatCurrency(inv.balanceAmount)}</td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="font-medium text-slate-900">Zero Pending Payments!</p>
                          <p className="text-sm">No pending payments for this selected period.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
