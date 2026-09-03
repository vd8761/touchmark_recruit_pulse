import AiChatModal from '@/components/AiChatModal';
import { getSheetMetrics } from '@/lib/sheets';

// Helper to pre-calculate totals so the LLM doesn't have to do array math
function calculateTotals(data: any, isDescience: boolean) {
  if (!data || !data.months) return data;
  
  const totals: any = {
    totalPipeline: data.pipeline || { count: 0, value: 0 }
  };

  if (isDescience) {
    totals.totalSalesBilled = { count: 0, value: 0 };
    totals.totalCollected = { count: 0, value: 0 };
    totals.totalPending = { count: 0, value: 0 };

    data.months.forEach((m: any) => {
      totals.totalSalesBilled.count += m.salesBilled?.count || 0;
      totals.totalSalesBilled.value += m.salesBilled?.value || 0;
      totals.totalCollected.count += m.collected?.count || 0;
      totals.totalCollected.value += m.collected?.value || 0;
      totals.totalPending.count += m.pending?.count || 0;
      totals.totalPending.value += m.pending?.value || 0;
    });
  } else {
    totals.totalPlacements = { count: 0, value: 0 };
    totals.totalRevenueEarned = { count: 0, value: 0 };
    totals.totalInvoicesRaised = { count: 0, value: 0 };
    totals.totalAmountCollected = { count: 0, value: 0 };
    totals.totalRevenueLost = { count: 0, value: 0 };
    totals.totalAtRisk = { count: 0, value: 0 };

    data.months.forEach((m: any) => {
      totals.totalPlacements.count += m.joined?.count || 0;
      totals.totalPlacements.value += m.joined?.value || 0;
      totals.totalRevenueEarned.count += m.profitInvoiced?.count || 0;
      totals.totalRevenueEarned.value += m.profitInvoiced?.value || 0;
      totals.totalInvoicesRaised.count += m.invoicesGenerated?.count || 0;
      totals.totalInvoicesRaised.value += m.invoicesGenerated?.value || 0;
      totals.totalAmountCollected.count += m.invoicesPaid?.count || 0;
      totals.totalAmountCollected.value += m.invoicesPaid?.value || 0;
      totals.totalRevenueLost.count += m.lossDropped?.count || 0;
      totals.totalRevenueLost.value += m.lossDropped?.value || 0;
      totals.totalAtRisk.count += m.atRiskSustenance?.count || 0;
      totals.totalAtRisk.value += m.atRiskSustenance?.value || 0;
    });
  }

  // Inject totals at the top level, keep the rest of the data (months, analytics)
  return {
    OVERALL_TOTALS: totals,
    ...data
  };
}

export default async function AiChatWrapper() {
  let allVendorsData = null;
  
  try {
    const [workforceResult, descienceResult, doscResult] = await Promise.allSettled([
      getSheetMetrics('workforce'),
      getSheetMetrics('descience'),
      getSheetMetrics('dosc'),
    ]);

    allVendorsData = {
      'Touchmark Workforce': workforceResult.status === 'fulfilled' ? calculateTotals(workforceResult.value, false) : null,
      'Touchmark Descience': descienceResult.status === 'fulfilled' ? calculateTotals(descienceResult.value, true) : null,
      'DOSC Placement': doscResult.status === 'fulfilled' ? calculateTotals(doscResult.value, false) : null,
    };
  } catch (error) {
    console.error("Failed to fetch metrics for AI Chat:", error);
  }

  return <AiChatModal metricsContext={JSON.stringify(allVendorsData)} />;
}
