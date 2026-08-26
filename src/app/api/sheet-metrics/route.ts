import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// export const revalidate = 300; // Cache for 5 minutes (300 seconds)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vendor = searchParams.get('vendor') === 'descience' ? 'descience' : 'workforce';
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheetId = vendor === 'descience' 
      ? process.env.GOOGLE_SPREADSHEET_ID_DESCIENCE 
      : process.env.GOOGLE_SPREADSHEET_ID_WORKFORCE;

    if (!spreadsheetId) {
      return NextResponse.json({ error: `Spreadsheet ID not found for vendor: ${vendor}` }, { status: 500 });
    }

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AZ`,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No data found in spreadsheet.' }, { status: 404 });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    const data = dataRows.map((row) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header.trim()] = row[index] || null;
      });
      return obj;
    });

    const parseValue = (val: string) => {
      if (!val) return 0;
      const num = parseFloat(val.toString().replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    // Global Pipeline Snapshot
    let currentPipeline = { count: 0, value: 0 };
    const pipelineStatuses = ['Sourced', 'Screened', 'Submitted to Client', 'Shortlisted', 'Interviewing', 'Offer Accepted']; // Pipeline = everything before Joined

    // Monthly Data structure
    // Key: "YYYY-MM" (Based on Actual D.O.J)
    const monthlyData: Record<string, {
      monthLabel: string;
      joined: { count: number; value: number };
      profitInvoiced: { count: number; value: number };
      lossDropped: { count: number; value: number };
      atRiskSustenance: { count: number; value: number };
    }> = {};

    const getMonthKey = (dateString: string) => {
      if (!dateString) return null;
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return null;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      };
    };

    data.forEach((row) => {
      const status = row['Candidate Status']?.trim() || '';
      const budget = parseValue(row['Closed budget (LPA)']);
      
      // 1. Calculate Global Pipeline (snapshot of right now)
      if (pipelineStatuses.includes(status)) {
        currentPipeline.count++;
        currentPipeline.value += budget;
      }
      
      // 2. Process Deals that have actually Joined (to build Monthly P&L)
      const doj = row['Actual D.O.J'];
      const monthInfo = getMonthKey(doj);
      
      if (monthInfo) {
        if (!monthlyData[monthInfo.key]) {
          monthlyData[monthInfo.key] = {
            monthLabel: monthInfo.label,
            joined: { count: 0, value: 0 },
            profitInvoiced: { count: 0, value: 0 },
            lossDropped: { count: 0, value: 0 },
            atRiskSustenance: { count: 0, value: 0 },
          };
        }

        const monthBucket = monthlyData[monthInfo.key];
        
        // Anyone with a DOJ is considered "Joined" originally
        // Note: Even if they resigned later, they still started in this month.
        // We look at their *current* status to figure out the P&L outcome.
        const terminalStatuses = ['Resigned', 'Absconded', 'Dropped', 'Rejected'];
        
        // Let's assume anyone who has a DOJ was technically a "Joined" deal at some point.
        // But for cleaner logic, if they reached DOJ, they count towards Gross Joined.
        monthBucket.joined.count++;
        monthBucket.joined.value += budget;

        // Has the Invoice Date passed?
        const invoiceDateStr = row['Invoice Eligibility Date'];
        let passedInvoiceDate = false;
        if (invoiceDateStr) {
          const invDate = new Date(invoiceDateStr);
          if (!isNaN(invDate.getTime()) && invDate <= new Date()) {
            passedInvoiceDate = true;
          }
        }

        // P&L Logic
        if (terminalStatuses.includes(status)) {
          // LOSS: They dropped out.
          monthBucket.lossDropped.count++;
          monthBucket.lossDropped.value += budget;
        } else if (status === 'Joined') {
          // Still Active
          if (passedInvoiceDate) {
            // PROFIT: They survived the sustenance period and are billable!
            monthBucket.profitInvoiced.count++;
            monthBucket.profitInvoiced.value += budget;
          } else {
            // AT RISK: They are still in the sustenance period (e.g., 60 days haven't passed yet).
            monthBucket.atRiskSustenance.count++;
            monthBucket.atRiskSustenance.value += budget;
          }
        } else if (status === 'Invoiced') {
            // If you use an explicit 'Invoiced' status
            monthBucket.profitInvoiced.count++;
            monthBucket.profitInvoiced.value += budget;
        }
      }
    });

    // Sort months descending (newest first)
    const sortedMonths = Object.keys(monthlyData)
      .sort((a, b) => b.localeCompare(a))
      .map(key => ({
        id: key,
        ...monthlyData[key]
      }));

    return NextResponse.json({
      pipeline: currentPipeline,
      months: sortedMonths,
      lastUpdated: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Google Sheets API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
