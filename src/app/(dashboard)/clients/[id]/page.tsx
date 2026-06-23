import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Building2, Mail, Phone, MapPin, Briefcase, TrendingUp, Activity, Users, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ClientPositionsTable } from "./_components/ClientPositionsTable";

export default async function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || "Viewer";
  const canViewFinancials = !["Business Development", "Recruitment", "Viewer"].includes(userRole);

  const [client, settingsRow] = await Promise.all([
    prisma.client.findUnique({
      where: { id: id, deleted_at: null },
      include: {
        positions: {
          where: { deleted_at: null },
          include: { closures: true }
        }
      }
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

  if (!client) {
    notFound();
  }

  // Analytics Calculation
  let totalRequested = 0;
  let totalClosed = 0;
  let expectedRevenue = 0;
  let closedRevenue = 0;

  client.positions.forEach(pos => {
    totalRequested += pos.requested_count;
    totalClosed += pos.closed_count;
    expectedRevenue += pos.requested_count * Number(pos.per_resource_cost);
    closedRevenue += pos.closed_count * Number(pos.per_resource_cost);
  });

  // Fetch Audit Logs for Client and its Positions
  const positionIds = client.positions.map(p => p.id);
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity_type: 'Client', entity_id: client.id },
        { entity_type: 'Position', entity_id: { in: positionIds } }
      ]
    },
    orderBy: { timestamp: 'desc' },
    include: { modifier: true }
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat(currencyLocale, { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(val);

  return (
    <div className="max-w-[1200px] mx-auto pb-12 space-y-6">
      
      {/* Back Link */}
      <Link href="/clients" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </Link>

      {/* Hero Header */}
      <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-inner">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{client.company_name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {client.contact_person}</span>
              <span>•</span>
              <span>{client.industry}</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] uppercase tracking-wider font-bold ${
                client.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {client.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${canViewFinancials ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-5`}>
        <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600 mb-2">
            <Briefcase className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Overall Positions</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900">{totalRequested}</span>
            <span className="text-sm font-medium text-slate-500 mb-1">requested</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-slate-600 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Total Fulfilled</h3>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-slate-900">{totalClosed}</span>
            <span className="text-sm font-medium text-slate-500 mb-1">closed</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalClosed / Math.max(1, totalRequested)) * 100)}%` }}></div>
          </div>
        </div>
        {canViewFinancials && (
          <>
            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 text-slate-600 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold">Expected Revenue</h3>
              </div>
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(expectedRevenue)}</span>
            </div>
            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 text-slate-600 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold">Realized Revenue</h3>
              </div>
              <span className="text-2xl font-bold text-slate-900">{formatCurrency(closedRevenue)}</span>
            </div>
          </>
        )}
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="portfolio" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 rounded-none h-auto p-0 gap-6">
          <TabsTrigger value="portfolio" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 rounded-none px-0 py-3 font-semibold text-slate-500 data-[state=active]:text-slate-900">
            Positions Portfolio
          </TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 rounded-none px-0 py-3 font-semibold text-slate-500 data-[state=active]:text-slate-900">
            Contact & Details
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 rounded-none px-0 py-3 font-semibold text-slate-500 data-[state=active]:text-slate-900">
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="pt-6">
          <ClientPositionsTable client={JSON.parse(JSON.stringify(client))} />
        </TabsContent>

        <TabsContent value="contact" className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Mail className="w-5 h-5"/></div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</p>
                <p className="font-medium text-slate-900 mt-0.5">{client.email}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="p-2.5 bg-green-50 text-green-600 rounded-lg"><Phone className="w-5 h-5"/></div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</p>
                <p className="font-medium text-slate-900 mt-0.5">{client.phone}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-[12px] border border-slate-200 shadow-sm flex items-start gap-4 sm:col-span-2">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg"><MapPin className="w-5 h-5"/></div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</p>
                <p className="font-medium text-slate-900 mt-0.5">{client.address || "N/A"}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="pt-6">
          <div className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-6">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-amber-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-[12px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between space-x-2 mb-1">
                      <div className="font-bold text-slate-900">{log.action} {log.entity_type}</div>
                      <time className="text-xs font-medium text-slate-500">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</time>
                    </div>
                    <div className="text-sm text-slate-600">
                      {log.reason || `Action performed by ${log.modifier?.name || 'System'}`}
                    </div>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-slate-500 relative z-10">No history available.</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
