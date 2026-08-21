import { google } from 'googleapis';

export async function getSheetMetrics() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
  });
  
  const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    range: `${sheetName}!A:AA`,
  });

  const rows = response.data.values;
  
  if (!rows || rows.length === 0) {
    throw new Error('No data found in spreadsheet.');
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
    const strVal = val.toString().toUpperCase();
    const num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return 0;
    
    // If the string explicitly contains 'LPA' or 'LAKH', convert it to the actual number.
    // E.g. "30 LPA" -> 3000000. If they type "3000000" without LPA, it stays 3000000.
    if (strVal.includes('LPA') || strVal.includes('LAKH')) {
      return num * 100000;
    }
    return num;
  };

  let currentPipeline = { count: 0, value: 0 };
  const pipelineStatuses = ['Sourced', 'Screened', 'Submitted to Client', 'Shortlisted', 'Interviewing', 'Offer Accepted'];

  const monthlyData: Record<string, {
    monthLabel: string;
    joined: { count: number; value: number };
    profitInvoiced: { count: number; value: number };
    lossDropped: { count: number; value: number };
    atRiskSustenance: { count: number; value: number };
    invoicesGenerated: { count: number; value: number };
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
    
    if (pipelineStatuses.includes(status)) {
      currentPipeline.count++;
      currentPipeline.value += budget;
    }
    
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
          invoicesGenerated: { count: 0, value: 0 },
        };
      }

      const monthBucket = monthlyData[monthInfo.key];
      const terminalStatuses = ['Resigned', 'Absconded', 'Dropped', 'Rejected'];
      
      monthBucket.joined.count++;
      monthBucket.joined.value += budget;

      const invoiceDateStr = row['Invoice Eligibility Date'];
      let passedInvoiceDate = false;
      if (invoiceDateStr) {
        const invDate = new Date(invoiceDateStr);
        if (!isNaN(invDate.getTime()) && invDate <= new Date()) {
          passedInvoiceDate = true;
        }
      }

      const invoiceStatus = row['Invoice Status']?.trim()?.toLowerCase() || '';
      const invoiceGeneratedDate = row['Invoice Generated Date'];
      
      const isInvoiceGenerated = invoiceStatus.includes('generated') || invoiceStatus.includes('paid') || !!invoiceGeneratedDate;

      if (isInvoiceGenerated) {
        monthBucket.invoicesGenerated.count++;
        monthBucket.invoicesGenerated.value += budget;
      }

      if (terminalStatuses.includes(status)) {
        monthBucket.lossDropped.count++;
        monthBucket.lossDropped.value += budget;
      } else if (status === 'Joined') {
        if (passedInvoiceDate) {
          monthBucket.profitInvoiced.count++;
          monthBucket.profitInvoiced.value += budget;
        } else {
          monthBucket.atRiskSustenance.count++;
          monthBucket.atRiskSustenance.value += budget;
        }
      } else if (status === 'Invoiced') {
          monthBucket.profitInvoiced.count++;
          monthBucket.profitInvoiced.value += budget;
      }
    }
  });

  // Analytics Aggregation
  const recruiterStats: Record<string, { name: string; pipelineDeals: number; pipelineValue: number; closedDeals: number; closedValue: number }> = {};
  const clientStats: Record<string, { name: string; deals: number; value: number }> = {};
  const funnelStats: Record<string, number> = {
    'Sourced': 0,
    'Screened': 0,
    'Submitted to Client': 0,
    'Shortlisted': 0,
    'Interviewing': 0,
    'Offered': 0,
    'Offer Accepted': 0,
    'Joined': 0
  };

  data.forEach((row) => {
    const status = row['Candidate Status']?.trim() || '';
    const budget = parseValue(row['Closed budget (LPA)']);
    const recruiter = row['Recruiter name']?.trim() || 'Unknown';
    const company = row['Company']?.trim() || 'Unknown';

    // Funnel
    if (funnelStats[status] !== undefined) {
      funnelStats[status]++;
    }

    // Recruiter
    if (!recruiterStats[recruiter]) {
      recruiterStats[recruiter] = { name: recruiter, pipelineDeals: 0, pipelineValue: 0, closedDeals: 0, closedValue: 0 };
    }
    if (pipelineStatuses.includes(status)) {
      recruiterStats[recruiter].pipelineDeals++;
      recruiterStats[recruiter].pipelineValue += budget;
    } else if (status === 'Joined' || status === 'Invoiced') {
      recruiterStats[recruiter].closedDeals++;
      recruiterStats[recruiter].closedValue += budget;
    }

    // Client
    if (status === 'Joined' || status === 'Invoiced') {
      if (!clientStats[company]) {
        clientStats[company] = { name: company, deals: 0, value: 0 };
      }
      clientStats[company].deals++;
      clientStats[company].value += budget;
    }
  });

  const sortedMonths = Object.keys(monthlyData)
    .sort((a, b) => b.localeCompare(a))
    .map(key => ({
      id: key,
      ...monthlyData[key]
    }));

  const topRecruiters = Object.values(recruiterStats).sort((a, b) => b.closedValue - a.closedValue).slice(0, 10);
  const topClients = Object.values(clientStats).sort((a, b) => b.value - a.value).slice(0, 10);
  const funnelData = Object.entries(funnelStats).map(([name, count]) => ({ name, count })).filter(f => f.count > 0);

  return {
    pipeline: currentPipeline,
    months: sortedMonths,
    analytics: {
      recruiters: topRecruiters,
      clients: topClients,
      funnel: funnelData
    },
    lastUpdated: new Date().toISOString()
  };
}
