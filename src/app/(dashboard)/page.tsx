import { Users, Briefcase, CheckCircle, TrendingUp, Sparkles, Building2, Target, PauseCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { RoleOpeningsChart, ClientOpeningsChart, MonthlyTrendChart, RevenuePipelineChart } from "@/components/dashboard/DashboardCharts";
import { HighPriorityTable } from "@/components/dashboard/HighPriorityTable";
import { RecentActivityTimeline } from "@/components/dashboard/RecentActivityTimeline";

const dailyMessages = [
  "Ready to close some amazing roles today?",
  "Let's find the perfect candidates for your clients.",
  "Your recruitment pipeline is looking exceptionally strong.",
  "Time to make some great placements!",
  "Here is a quick overview of what's happening right now.",
];

export default async function Dashboard() {
  const session = await getServerSession();
  const userName = session?.user?.name?.split(" ")[0] || "Admin";
  const userRole = session?.user?.role || "Admin";

  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";

  const randomMessage = dailyMessages[Math.floor(Math.random() * dailyMessages.length)];

  // --- Fetch Data ---
  const [clients, positions, recentLogs, settingsRow] = await Promise.all([
    prisma.client.findMany({ where: { deleted_at: null } }),
    prisma.position.findMany({ 
      where: { deleted_at: null },
      include: { client: true, closures: true }
    }),
    prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      include: { modifier: true }
    }),
    prisma.appSetting.findMany({ 
      where: { key: { in: ["currencyCode", "currencyLocale"] } } 
    })
  ]);

  let currencyCode = "USD";
  let currencyLocale = "en-US";
  if (settingsRow && settingsRow.length > 0) {
    const codeSetting = settingsRow.find(s => s.key === "currencyCode");
    const localeSetting = settingsRow.find(s => s.key === "currencyLocale");
    if (codeSetting?.value) currencyCode = codeSetting.value;
    if (localeSetting?.value) currencyLocale = localeSetting.value;
  }

  // Client Metrics
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === "Active").length;

  // Position Metrics
  let totalRequested = 0;
  let totalOpen = 0;
  let totalClosed = 0;
  let partiallyClosed = 0;
  let onHold = 0;
  let cancelled = 0;

  // Financial Metrics
  let expectedRevenue = 0;
  let closedRevenue = 0;
  let pendingRevenue = 0;

  // Chart Data Aggregation
  const clientOpeningsMap: Record<string, number> = {};
  const monthlyClosuresMap: Record<string, number> = {};
  const roleOpeningsMap: Record<string, number> = {};

  // High Priority List
  const highPriorityPositions = positions
    .filter(p => (p.priority === "High" || p.priority === "Critical") && p.status !== "Closed")
    .sort((a, b) => new Date(a.expected_joining_date).getTime() - new Date(b.expected_joining_date).getTime())
    .slice(0, 5);

  positions.forEach(pos => {
    totalRequested += pos.requested_count;
    
    const cost = Number(pos.per_resource_cost);
    const expected = pos.requested_count * cost;
    const closedRev = pos.closed_count * cost;
    
    expectedRevenue += expected;
    closedRevenue += closedRev;

    if (pos.status === "Closed") {
      totalClosed++;
    } else if (pos.status === "Cancelled") {
      cancelled++;
    } else if (pos.status === "On Hold") {
      onHold++;
    } else {
      // Open or Partially Closed
      totalOpen++;
      if (pos.closed_count > 0) partiallyClosed++;
      
      const pendingCount = Math.max(0, pos.requested_count - pos.closed_count);
      pendingRevenue += pendingCount * cost;
      
      // Chart aggregation
      clientOpeningsMap[pos.client.company_name] = (clientOpeningsMap[pos.client.company_name] || 0) + pendingCount;
      roleOpeningsMap[pos.role_name] = (roleOpeningsMap[pos.role_name] || 0) + pendingCount;
    }

    // Monthly trend aggregation
    pos.closures.forEach(closure => {
      const month = new Date(closure.closure_date).toLocaleString('default', { month: 'short' });
      monthlyClosuresMap[month] = (monthlyClosuresMap[month] || 0) + closure.closed_count;
    });
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(val);

  // Format charts
  const clientData = Object.entries(clientOpeningsMap).map(([name, open]) => ({ name, open })).sort((a, b) => b.open - a.open).slice(0, 10);
  const roleData = Object.entries(roleOpeningsMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const trendData = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(month => ({
    month,
    closures: monthlyClosuresMap[month] || 0
  }));
  
  const revenueData = [
    { name: "Expected", amount: expectedRevenue, color: "#cbd5e1" },
    { name: "Pending", amount: pendingRevenue, color: "#0f172a" },
    { name: "Closed", amount: closedRevenue, color: "#f59e0b" },
  ];

  // Role-aware Ordering
  const isFinance = userRole === "Finance" || userRole === "Super Admin";

  const metricCards = [
    { 
      id: 'clients', 
      name: 'Active Clients', 
      stat: activeClients.toString(), 
      sub: `${totalClients} total registered`, 
      icon: Building2, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      href: '/clients'
    },
    { 
      id: 'openings', 
      name: 'Open Positions', 
      stat: totalOpen.toString(), 
      sub: `Out of ${totalRequested} requested`, 
      icon: Briefcase, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50',
      href: '/positions'
    },
    { 
      id: 'closed', 
      name: 'Total Closure', 
      stat: totalClosed.toString(), 
      sub: `${partiallyClosed} partially closed • ${onHold} on hold`, 
      icon: CheckCircle, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      href: '/positions'
    },
    { 
      id: 'revenue', 
      name: 'Pending Pipeline', 
      stat: formatCurrency(pendingRevenue), 
      sub: `${formatCurrency(closedRevenue)} realized revenue`, 
      icon: TrendingUp, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50',
      href: '/reports'
    },
  ];

  // If Finance, move Revenue to the front
  if (isFinance) {
    const revCard = metricCards.splice(3, 1)[0];
    metricCards.unshift(revCard);
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      
      {/* Hero Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 sm:p-6 rounded-[16px] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-[22px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {greeting}, {userName} <span className="text-2xl origin-bottom-right hover:animate-pulse cursor-default select-none">👋</span>
          </h3>
          <p className="mt-1.5 text-[14.5px] font-medium text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {randomMessage}
          </p>
        </div>
        <div className="hidden sm:block text-right relative z-10">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Today's Focus</p>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold border border-blue-100">
            <Target className="w-4 h-4" />
            {isFinance ? formatCurrency(pendingRevenue) + " Pipeline" : `${totalOpen} Open Positions`}
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 z-0"></div>
      </div>
      
      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="relative overflow-hidden rounded-[16px] bg-white p-5 shadow-sm border border-slate-200 transition-all hover:shadow-md hover:border-slate-300 group block"
            >
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-medium text-slate-600">{item.name}</p>
                <div className={`rounded-lg p-2 ${item.bg} group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-4 w-4 ${item.color}`} strokeWidth={2.5} />
                </div>
              </div>
              <div className="mt-4 flex flex-col">
                <p className="text-[28px] font-bold tracking-tight text-slate-900">{item.stat}</p>
                {item.sub && <p className="text-[12px] font-medium text-slate-500 mt-1">{item.sub}</p>}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Section: Revenue & Activity */}
        <div className="lg:col-span-2">
          <RevenuePipelineChart data={revenueData} />
        </div>
        <div className="lg:col-span-1">
          <RecentActivityTimeline logs={recentLogs} />
        </div>
      </div>

      {/* Middle Section: 2 Charts Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="lg:col-span-1">
          <RoleOpeningsChart data={roleData} />
        </div>
        <div className="lg:col-span-1">
          <ClientOpeningsChart data={clientData} />
        </div>
      </div>

      {/* Trend Section: Full Width */}
      <div className="mt-6">
        <MonthlyTrendChart data={trendData} />
      </div>

      {/* Bottom Section: High Priority Table & Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        <div className="lg:col-span-3">
          <HighPriorityTable positions={highPriorityPositions} />
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-[16px] border border-slate-200 shadow-sm h-full">
            <h3 className="text-[16px] font-bold text-slate-900 mb-6">Status Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-slate-600 min-w-0">
                  <PauseCircle className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap truncate">On-Hold</span>
                </div>
                <span className="font-bold text-slate-900 shrink-0">{onHold}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(onHold / Math.max(1, positions.length)) * 100}%` }}></div>
              </div>
              
              <div className="flex justify-between items-center pt-4 gap-4">
                <div className="flex items-center gap-2 text-slate-600 min-w-0">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-sm font-medium whitespace-nowrap truncate">Cancelled</span>
                </div>
                <span className="font-bold text-slate-900 shrink-0">{cancelled}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${(cancelled / Math.max(1, positions.length)) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
