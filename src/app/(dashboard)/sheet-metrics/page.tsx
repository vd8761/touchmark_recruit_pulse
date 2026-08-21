import { getSheetMetrics } from '@/lib/sheets';
import SheetMetricsClient from './SheetMetricsClient';

export const revalidate = 300; // Cache for 5 minutes

export default async function SheetMetricsPage() {
  try {
    const data = await getSheetMetrics();
    
    return <SheetMetricsClient data={data} />;
  } catch (error: any) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-500 p-6 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold mb-2">Error loading Google Sheets Data</h2>
          <p className="mb-4">{error.message}</p>
          <div className="text-sm space-y-2">
            <p className="font-semibold text-slate-800">Troubleshooting Steps:</p>
            <ul className="list-disc pl-5 text-slate-700">
              <li>Ensure you have shared your Google Sheet with the Service Account email.</li>
              <li>Verify that your <code className="bg-white px-1 py-0.5 rounded border border-slate-200">.env</code> file contains the correct <code className="bg-white px-1 py-0.5 rounded border border-slate-200">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> and <code className="bg-white px-1 py-0.5 rounded border border-slate-200">GOOGLE_PRIVATE_KEY</code>.</li>
              <li>Check if the Google Sheet ID is correct.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
