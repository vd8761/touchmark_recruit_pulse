import AiChatModal from '@/components/AiChatModal';
import { getSheetMetrics } from '@/lib/sheets';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Strips the heavy raw arrays from sheet metrics and returns only
 * pre-computed summaries that are safe to pass to the AI.
 * This prevents the TPM (tokens per minute) limit from being exceeded.
 */
function buildLeanVendorSummary(data: any, isDescience: boolean): any {
  if (!data) return null;

  // ── Overall totals ─────────────────────────────────────────────────
  const totals: any = {
    pipeline: data.pipeline || { count: 0, value: 0 },
  };

  if (isDescience) {
    totals.salesBilled    = { count: 0, value: 0 };
    totals.collected      = { count: 0, value: 0 };
    totals.pending        = { count: 0, value: 0 };
    (data.months || []).forEach((m: any) => {
      totals.salesBilled.count  += m.salesBilled?.count  || 0;
      totals.salesBilled.value  += m.salesBilled?.value  || 0;
      totals.collected.count    += m.collected?.count    || 0;
      totals.collected.value    += m.collected?.value    || 0;
      totals.pending.count      += m.pending?.count      || 0;
      totals.pending.value      += m.pending?.value      || 0;
    });
  } else {
    totals.placements     = { count: 0, value: 0 };
    totals.revenueEarned  = { count: 0, value: 0 };
    totals.invoicesRaised = { count: 0, value: 0 };
    totals.collected      = { count: 0, value: 0 };
    totals.revenueLost    = { count: 0, value: 0 };
    totals.atRisk         = { count: 0, value: 0 };
    (data.months || []).forEach((m: any) => {
      totals.placements.count     += m.joined?.count            || 0;
      totals.placements.value     += m.joined?.value            || 0;
      totals.revenueEarned.count  += m.profitInvoiced?.count    || 0;
      totals.revenueEarned.value  += m.profitInvoiced?.value    || 0;
      totals.invoicesRaised.count += m.invoicesGenerated?.count || 0;
      totals.invoicesRaised.value += m.invoicesGenerated?.value || 0;
      totals.collected.count      += m.invoicesPaid?.count      || 0;
      totals.collected.value      += m.invoicesPaid?.value      || 0;
      totals.revenueLost.count    += m.lossDropped?.count       || 0;
      totals.revenueLost.value    += m.lossDropped?.value       || 0;
      totals.atRisk.count         += m.atRiskSustenance?.count  || 0;
      totals.atRisk.value         += m.atRiskSustenance?.value  || 0;
    });
  }

  // ── Monthly summary — only key figures, NO raw candidate rows ──────
  const monthSummaries = (data.months || []).map((m: any) => {
    if (isDescience) {
      return {
        month: m.monthLabel,
        salesBilled: m.salesBilled,
        collected: m.collected,
        pending: m.pending,
      };
    }
    return {
      month: m.monthLabel,
      placements: m.joined,
      revenueEarned: m.profitInvoiced,
      invoicesRaised: m.invoicesGenerated,
      collected: m.invoicesPaid,
      revenueLost: m.lossDropped,
      atRisk: m.atRiskSustenance,
    };
  });

  // ── Top recruiters & clients (analytics) — keep only top 5 ────────
  const topRecruiters = (data.analytics?.recruiters || [])
    .slice(0, 5)
    .map((r: any) => ({ name: r.name, closedValue: r.closedValue, closedDeals: r.closedDeals }));

  const topClients = (data.analytics?.clients || [])
    .slice(0, 5)
    .map((c: any) => ({ name: c.name, value: c.value, paidValue: c.paidValue }));

  return {
    overallTotals: totals,
    byMonth: monthSummaries,
    topRecruiters,
    topClients,
    // allCandidates intentionally excluded — too large for AI context
  };
}

export default async function AiChatWrapper() {
  const session = await getServerSession(authOptions);
  let vendorSummaries: any = null;
  let appData: any = null;

  try {
    // ── 1. Fetch Sheet Metrics (all 3 vendors) ─────────────────────────
    const [workforceResult, descienceResult, doscResult] = await Promise.allSettled([
      getSheetMetrics('workforce'),
      getSheetMetrics('descience'),
      getSheetMetrics('dosc'),
    ]);

    vendorSummaries = {
      'Touchmark Workforce': workforceResult.status === 'fulfilled'
        ? buildLeanVendorSummary(workforceResult.value, false) : null,
      'Touchmark Descience': descienceResult.status === 'fulfilled'
        ? buildLeanVendorSummary(descienceResult.value, true) : null,
      'DOSC Placement': doscResult.status === 'fulfilled'
        ? buildLeanVendorSummary(doscResult.value, false) : null,
    };

    // ── 2. Fetch App Data from Database ────────────────────────────────
    const [clients, positions, users] = await Promise.allSettled([
      prisma.client.findMany({
        where: { deleted_at: null },
        select: {
          company_name: true,
          industry: true,
          status: true,
          touchmark_poc: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      // Fetch all non-deleted positions to compute accurate overall pipeline (Dashboard numbers)
      prisma.position.findMany({
        where: { deleted_at: null },
        select: {
          role_name: true,
          department: true,
          location: true,
          requested_count: true,
          closed_count: true,
          per_resource_cost: true,
          billing_slab: true,
          status: true,
          priority: true,
          expected_joining_date: true,
          client: { select: { company_name: true } },
        },
        orderBy: [{ priority: 'asc' }, { created_at: 'desc' }],
      }),
      session?.user?.role === 'Super Admin'
        ? prisma.user.findMany({
            where: { deleted_at: null },
            select: {
              name: true,
              email: true,
              status: true,
              role: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const positionsData = positions.status === 'fulfilled' ? positions.value : [];

    // Calculate EXACT Dashboard metrics across the entire platform
    let pendingRevenue = 0;
    let realizedRevenue = 0;

    positionsData.forEach((p: any) => {
      const cost = parseFloat(p.per_resource_cost) || 0;
      const requested = parseInt(p.requested_count) || 1;
      const closed = parseInt(p.closed_count) || 0;

      realizedRevenue += closed * cost;

      if (p.status !== 'Closed' && p.status !== 'Cancelled' && p.status !== 'On Hold') {
        const pendingCount = Math.max(0, requested - closed);
        pendingRevenue += pendingCount * cost;
      }
    });

    const openPositionsList = positionsData
      .filter((p: any) => p.status === 'Open' || p.status === 'On Hold')
      .slice(0, 60);

    appData = {
      overallPipeline: {
        pendingPipelineINR: pendingRevenue,
        realizedRevenueINR: realizedRevenue,
        note: 'These totals represent the entire RecruitPulse App Database (matches Dashboard UI).'
      },
      clients: {
        total: clients.status === 'fulfilled' ? clients.value.length : 0,
        active: clients.status === 'fulfilled'
          ? clients.value.filter((c: any) => c.status === 'Active').length : 0,
        list: clients.status === 'fulfilled' ? clients.value : [],
      },
      positions: {
        openCount: positionsData.filter((p: any) => p.status === 'Open').length,
        onHoldCount: positionsData.filter((p: any) => p.status === 'On Hold').length,
        highPriorityCount: positionsData.filter((p: any) => p.priority === 'High').length,
        list: openPositionsList.map((p: any) => {
          const cost = parseFloat(p.per_resource_cost) || 0;
          const count = parseInt(p.requested_count) || 1;
          return {
            role: p.role_name,
            client: p.client?.company_name,
            location: p.location,
            openings: count,
            perResourceCostINR: cost,
            totalDealValueINR: cost * count,
            billingSlab: p.billing_slab || null,
            status: p.status,
            priority: p.priority,
            expectedJoining: p.expected_joining_date
              ? new Date(p.expected_joining_date).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })
              : null,
          };
        }),
      },
      users:
        session?.user?.role === 'Super Admin' && users.status === 'fulfilled'
          ? {
              total: users.value.length,
              list: users.value.map((u: any) => ({
                name: u.name,
                role: u.role?.name,
                status: u.status,
              })),
            }
          : { note: 'User data only visible to Super Admins.' },
    };
  } catch (error) {
    console.error('Failed to fetch data for AI Chat:', error);
  }

  const fullContext = JSON.stringify({ sheetMetrics: vendorSummaries, appData });

  return <AiChatModal metricsContext={fullContext} />;
}
