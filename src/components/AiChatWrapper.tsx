import AiChatModal from '@/components/AiChatModal';
import { getSheetMetrics } from '@/lib/sheets';

export default async function AiChatWrapper() {
  let allVendorsData = null;
  
  try {
    const [workforceResult, descienceResult, doscResult] = await Promise.allSettled([
      getSheetMetrics('workforce'),
      getSheetMetrics('descience'),
      getSheetMetrics('dosc'),
    ]);

    allVendorsData = {
      'Touchmark Workforce': workforceResult.status === 'fulfilled' ? workforceResult.value : null,
      'Touchmark Descience': descienceResult.status === 'fulfilled' ? descienceResult.value : null,
      'DOSC Placement': doscResult.status === 'fulfilled' ? doscResult.value : null,
    };
  } catch (error) {
    console.error("Failed to fetch metrics for AI Chat:", error);
  }

  return <AiChatModal metricsContext={JSON.stringify(allVendorsData)} />;
}
