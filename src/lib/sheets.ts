import { google } from 'googleapis';

const parseValue = (val: string | undefined | null) => {
  if (!val) return 0;
  const strVal = val.toString().toUpperCase();
  const num = parseFloat(strVal.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return 0;
  
  if (strVal.includes('LPA') || strVal.includes('LAKH')) {
    return num * 100000;
  }
  return num;
};

const getMonthKey = (dateString: string | undefined | null) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`
  };
};

function parseWorkforceMetrics(data: any[]) {
  let currentPipeline = { count: 0, value: 0 };
  const pipelineStatuses = ['Sourced', 'Screened', 'Submitted to Client', 'Shortlisted', 'Interviewing', 'Offer Accepted'];

  const monthlyData: Record<string, {
    monthLabel: string;
    joined: { count: number; value: number };
    profitInvoiced: { count: number; value: number };
    lossDropped: { count: number; value: number };
    atRiskSustenance: { count: number; value: number };
    invoicesGenerated: { count: number; value: number };
    invoicesPaid: { count: number; value: number };
  }> = {};

  data.forEach((row) => {
    const status = row['Candidate Status']?.trim() || '';
    const dealValue = parseValue(row['Closed budget (LPA)']);
    const invoiceAmt = parseValue(row['Total Amount / Invoice Amount (INR)']);
    const revenueAmt = invoiceAmt > 0 ? invoiceAmt : (dealValue * 0.0833);
    
    if (pipelineStatuses.includes(status)) {
      currentPipeline.count++;
      currentPipeline.value += dealValue;
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
          invoicesPaid: { count: 0, value: 0 },
        };
      }

      const monthBucket = monthlyData[monthInfo.key];
      const terminalStatuses = ['Resigned', 'Absconded', 'Dropped', 'Rejected'];
      
      monthBucket.joined.count++;
      monthBucket.joined.value += dealValue;

      const invoiceDateStr = row['Invoice Eligibility Date'];
      let passedInvoiceDate = false;
      if (invoiceDateStr) {
        const invDate = new Date(invoiceDateStr);
        if (!isNaN(invDate.getTime()) && invDate <= new Date()) {
          passedInvoiceDate = true;
        }
      }

      const invoiceStatus = row['Invoice Status']?.trim()?.toLowerCase() || '';
      const paymentStatus = row['Payment Status']?.trim()?.toLowerCase() || '';
      const invoiceGeneratedDate = row['Invoice Generated Date'];
      
      const isInvoiceGenerated = invoiceStatus.includes('generated') || invoiceStatus.includes('paid') || paymentStatus.includes('received') || !!invoiceGeneratedDate;
      const isPaid = paymentStatus.includes('fully received') || paymentStatus.includes('partially received') || invoiceStatus.includes('paid') || invoiceStatus.includes('received');

      if (isInvoiceGenerated) {
        monthBucket.invoicesGenerated.count++;
        monthBucket.invoicesGenerated.value += revenueAmt;
      }
      
      if (isPaid) {
        monthBucket.invoicesPaid.count++;
        const amtReceived = parseValue(row['Amount Received']);
        let actualPaid = 0;
        if (amtReceived > 0) {
            actualPaid = amtReceived;
        } else if (paymentStatus.includes('fully received') || invoiceStatus.includes('paid')) {
            actualPaid = revenueAmt;
        }
        monthBucket.invoicesPaid.value += actualPaid;
      }

      if (terminalStatuses.includes(status)) {
        monthBucket.lossDropped.count++;
        monthBucket.lossDropped.value += revenueAmt;
      } else if (status === 'Joined') {
        if (passedInvoiceDate || isInvoiceGenerated) {
          monthBucket.profitInvoiced.count++;
          monthBucket.profitInvoiced.value += revenueAmt;
        } else {
          monthBucket.atRiskSustenance.count++;
          monthBucket.atRiskSustenance.value += revenueAmt;
        }
      } else if (status === 'Invoiced') {
          monthBucket.profitInvoiced.count++;
          monthBucket.profitInvoiced.value += revenueAmt;
      }
    }
  });

  const recruiterStats: Record<string, { name: string; pipelineDeals: number; pipelineValue: number; closedDeals: number; closedValue: number }> = {};
  const clientStats: Record<string, { name: string; deals: number; value: number; paidValue: number }> = {};
  const funnelStats: Record<string, number> = {
    'Sourced': 0, 'Screened': 0, 'Submitted to Client': 0, 'Shortlisted': 0, 'Interviewing': 0, 'Offered': 0, 'Offer Accepted': 0, 'Joined': 0
  };
  const allCandidates: { date: string; candidate: string; company: string; amount: number; balanceAmount: number; status: string; invoiceStatus: string; recruiter: string }[] = [];

  data.forEach((row) => {
    const status = row['Candidate Status']?.trim() || '';
    const dealValue = parseValue(row['Closed budget (LPA)']);
    const invoiceAmt = parseValue(row['Total Amount / Invoice Amount (INR)']);
    const revenueAmt = invoiceAmt > 0 ? invoiceAmt : (dealValue * 0.0833);

    const recruiter = row['Recruiter name']?.trim() || 'Unknown';
    const company = row['Client Name']?.trim() || row['Company']?.trim() || 'Unknown';

    if (funnelStats[status] !== undefined) {
      funnelStats[status]++;
    }

    if (!recruiterStats[recruiter]) {
      recruiterStats[recruiter] = { name: recruiter, pipelineDeals: 0, pipelineValue: 0, closedDeals: 0, closedValue: 0 };
    }
    if (pipelineStatuses.includes(status)) {
      recruiterStats[recruiter].pipelineDeals++;
      recruiterStats[recruiter].pipelineValue += dealValue;
    } else if (status === 'Joined' || status === 'Invoiced') {
      recruiterStats[recruiter].closedDeals++;
      recruiterStats[recruiter].closedValue += revenueAmt;
    }

    if (status === 'Joined' || status === 'Invoiced') {
      if (!clientStats[company]) {
        clientStats[company] = { name: company, deals: 0, value: 0, paidValue: 0 };
      }
      clientStats[company].deals++;
      clientStats[company].value += revenueAmt;
      
      const paymentStatus = row['Payment Status']?.trim()?.toLowerCase() || '';
      const invoiceStatusStr = row['Invoice Status']?.trim()?.toLowerCase() || '';
      const isPaid = paymentStatus.includes('fully received') || paymentStatus.includes('partially received') || invoiceStatusStr.includes('paid') || invoiceStatusStr.includes('received');
      let balanceAmt = revenueAmt;
      let actualPaid = 0;
      
      if (isPaid) {
        const amtReceived = parseValue(row['Amount Received']);
        
        // Only assume full payment if they explicitly marked it Fully Received and left amount blank
        if (amtReceived > 0) {
            actualPaid = amtReceived;
        } else if (paymentStatus.includes('fully received') || invoiceStatusStr === 'paid') {
            actualPaid = revenueAmt;
        }
        
        clientStats[company].paidValue += actualPaid;
        balanceAmt = Math.max(0, revenueAmt - actualPaid);
      }

      allCandidates.push({
        date: row['Actual D.O.J'] || row['Invoice Eligibility Date'] || row['Invoice Generated Date'] || '',
        candidate: row['Name of the Candidate'] || row['Candidate Name'] || row['Candidate name'] || row['Name'] || 'Unknown',
        company,
        amount: revenueAmt,
        balanceAmount: parseValue(row['Balance Amount']) || balanceAmt,
        status,
        invoiceStatus: row['Payment Status']?.trim() || row['Invoice Status']?.trim() || 'Pending',
        recruiter
      });
    } else {
      allCandidates.push({
        date: row['Actual D.O.J'] || row['Invoice Eligibility Date'] || row['Invoice Generated Date'] || '',
        candidate: row['Name of the Candidate'] || row['Candidate Name'] || row['Candidate name'] || row['Name'] || 'Unknown',
        company,
        amount: revenueAmt,
        balanceAmount: 0,
        status,
        invoiceStatus: row['Payment Status']?.trim() || row['Invoice Status']?.trim() || 'Pending',
        recruiter
      });
    }
  });

  const sortedMonths = Object.keys(monthlyData)
    .sort((a, b) => a.localeCompare(b))
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
    allCandidates,
    lastUpdated: new Date().toISOString()
  };
}

function parseDescienceMetrics(data: any[]) {
  const monthlyData: Record<string, {
    monthLabel: string;
    salesBilled: { count: number; value: number };
    collected: { count: number; value: number };
    pending: { count: number; value: number };
  }> = {};

  const clientStats: Record<string, { name: string; billed: number; collected: number; pending: number }> = {};
  const recentInvoices: any[] = [];
  
  const agingStats: Record<string, { total: number; invoices: string[] }> = {
    '0-30 Days': { total: 0, invoices: [] },
    '31-60 Days': { total: 0, invoices: [] },
    '60-90 Days': { total: 0, invoices: [] },
    '90+ Days': { total: 0, invoices: [] }
  };

  const clientAgingStats: Record<string, { 
    name: string; 
    '0-30 Days': number; 
    '31-60 Days': number; 
    '60-90 Days': number; 
    '90+ Days': number; 
    totalPending: number;
    invoices: Record<string, string[]>;
  }> = {};
  
  const now = Date.now();

  data.forEach((row) => {
    const invoiceDateStr = row['Invoice Date'];
    const amount = parseValue(row['Invoice Amount (INR)']);
    let status = row['Invoice Status']?.trim() || '';
    
    // Normalize display statuses
    if (status.toLowerCase() === 'send') status = 'Pending';
    if (status.toLowerCase() === 'paid') status = 'Received';

    const company = row['Company']?.trim() || 'Unknown';
    const invoiceNo = row['Invoice No']?.trim() || '';

    const monthInfo = getMonthKey(invoiceDateStr);

    if (invoiceDateStr && amount > 0) {
      recentInvoices.push({
        date: invoiceDateStr,
        monthKey: monthInfo ? monthInfo.key : '',
        company,
        amount,
        status,
        invoiceNo,
        timestamp: new Date(invoiceDateStr).getTime()
      });
    }

    if (monthInfo) {
      if (!monthlyData[monthInfo.key]) {
        monthlyData[monthInfo.key] = {
          monthLabel: monthInfo.label,
          salesBilled: { count: 0, value: 0 },
          collected: { count: 0, value: 0 },
          pending: { count: 0, value: 0 },
        };
      }

      const monthBucket = monthlyData[monthInfo.key];
      monthBucket.salesBilled.count++;
      monthBucket.salesBilled.value += amount;

      const lowerStatus = status.toLowerCase();
      const isCollected = lowerStatus.includes('paid') || lowerStatus.includes('received');
      const isPending = lowerStatus.includes('send') || lowerStatus.includes('pending') || lowerStatus.includes('overdue');

      if (isCollected) {
        monthBucket.collected.count++;
        monthBucket.collected.value += amount;
      } else if (isPending) {
        monthBucket.pending.count++;
        monthBucket.pending.value += amount;
        
        if (!clientAgingStats[company]) {
          clientAgingStats[company] = { name: company, '0-30 Days': 0, '31-60 Days': 0, '60-90 Days': 0, '90+ Days': 0, totalPending: 0, invoices: { '0-30 Days': [], '31-60 Days': [], '60-90 Days': [], '90+ Days': [] } };
        }

        // Calculate aging
        if (invoiceDateStr) {
          const invDate = new Date(invoiceDateStr).getTime();
          if (!isNaN(invDate)) {
            const ageDays = (now - invDate) / (1000 * 60 * 60 * 24);
            if (ageDays <= 30) {
              agingStats['0-30 Days'].total += amount;
              if (invoiceNo) agingStats['0-30 Days'].invoices.push(invoiceNo);
              clientAgingStats[company]['0-30 Days'] += amount;
              if (invoiceNo) clientAgingStats[company].invoices['0-30 Days'].push(invoiceNo);
            } else if (ageDays <= 60) {
              agingStats['31-60 Days'].total += amount;
              if (invoiceNo) agingStats['31-60 Days'].invoices.push(invoiceNo);
              clientAgingStats[company]['31-60 Days'] += amount;
              if (invoiceNo) clientAgingStats[company].invoices['31-60 Days'].push(invoiceNo);
            } else if (ageDays <= 90) {
              agingStats['60-90 Days'].total += amount;
              if (invoiceNo) agingStats['60-90 Days'].invoices.push(invoiceNo);
              clientAgingStats[company]['60-90 Days'] += amount;
              if (invoiceNo) clientAgingStats[company].invoices['60-90 Days'].push(invoiceNo);
            } else {
              agingStats['90+ Days'].total += amount;
              if (invoiceNo) agingStats['90+ Days'].invoices.push(invoiceNo);
              clientAgingStats[company]['90+ Days'] += amount;
              if (invoiceNo) clientAgingStats[company].invoices['90+ Days'].push(invoiceNo);
            }
            clientAgingStats[company].totalPending += amount;
          }
        }
      }

      if (amount > 0) {
        if (!clientStats[company]) {
          clientStats[company] = { name: company, billed: 0, collected: 0, pending: 0 };
        }
        clientStats[company].billed += amount;
        if (isCollected) {
          clientStats[company].collected += amount;
        } else if (isPending) {
          clientStats[company].pending += amount;
        }
      }
    }
  });

  const sortedMonths = Object.keys(monthlyData)
    .sort((a, b) => a.localeCompare(b))
    .map(key => ({
      id: key,
      ...monthlyData[key]
    }));

  const topClients = Object.values(clientStats).sort((a, b) => b.billed - a.billed).slice(0, 10);
  const topDebtors = Object.values(clientStats).filter(c => c.pending > 0).sort((a, b) => b.pending - a.pending).slice(0, 10);
  const clientAging = Object.values(clientAgingStats).filter(c => c.totalPending > 0).sort((a, b) => b.totalPending - a.totalPending).slice(0, 10);
  
  const agingData = Object.entries(agingStats).map(([name, data]) => ({ name, value: data.total, invoices: data.invoices })).filter(a => a.value > 0);

  recentInvoices.sort((a, b) => {
    const d1 = new Date(a.date).getTime();
    const d2 = new Date(b.date).getTime();
    if (isNaN(d1) || isNaN(d2)) return 0;
    return d2 - d1;
  });

  return {
    months: sortedMonths,
    allInvoices: recentInvoices.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)),
    analytics: {
      clients: topClients,
      topDebtors: topDebtors,
      aging: agingData,
      clientAging: clientAging,
      recentInvoices: recentInvoices.slice(0, 20)
    },
    lastUpdated: new Date().toISOString()
  };
}

export async function getSheetMetrics(vendor: 'workforce' | 'descience' = 'workforce') {
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
    throw new Error(`Spreadsheet ID not found for vendor: ${vendor}`);
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

  if (vendor === 'descience') {
    return parseDescienceMetrics(data);
  }

  return parseWorkforceMetrics(data);
}
