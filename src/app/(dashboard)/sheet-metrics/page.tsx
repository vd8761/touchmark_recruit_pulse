import { getSheetMetrics } from '@/lib/sheets';
import SheetMetricsClient from './SheetMetricsClient';
import DescienceClient from './DescienceClient';
import Link from 'next/link';

// export const revalidate = 300; // Cache for 5 minutes

export default async function SheetMetricsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  try {
    const searchParams = await props.searchParams;
    const vendorParam = searchParams?.vendor;
    const vendor = vendorParam === 'descience' ? 'descience' : 'workforce';

    const data = await getSheetMetrics(vendor);
    
    if (vendor === 'descience') {
      return <DescienceClient data={data as any} vendor={vendor} />;
    }

    return <SheetMetricsClient data={data as any} vendor={vendor} />;
  } catch (error: any) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-500 p-6 rounded-lg border border-red-200">
          <h2 className="text-xl font-bold mb-2">Error loading Google Sheets Data</h2>
          <p className="mb-4">{error.message}</p>
          <div className="text-sm space-y-2 mb-6">
            <p className="font-semibold text-slate-800">Troubleshooting Steps:</p>
            <ul className="list-disc pl-5 text-slate-700">
              <li>Ensure you have shared your Google Sheet with the Service Account email.</li>
              <li>Verify that your <code className="bg-white px-1 py-0.5 rounded border border-slate-200">.env</code> file contains the correct <code className="bg-white px-1 py-0.5 rounded border border-slate-200">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> and <code className="bg-white px-1 py-0.5 rounded border border-slate-200">GOOGLE_PRIVATE_KEY</code>.</li>
              <li>Check if the Google Sheet ID is correct.</li>
            </ul>
          </div>
          <Link href="/sheet-metrics?vendor=workforce" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-slate-900 text-white shadow hover:bg-slate-800 h-9 px-4 py-2">
            &larr; Switch back to Touchmark Workforce
          </Link>
        </div>
      </div>
    );
  }
}
