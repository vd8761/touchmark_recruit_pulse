import { google } from 'googleapis';

declare global {
  var googleSheetsCache: Record<string, { data: any, timestamp: number }> | undefined;
}

const cache: Record<string, { data: any, timestamp: number }> = globalThis.googleSheetsCache || {};

if (process.env.NODE_ENV !== 'production') {
  globalThis.googleSheetsCache = cache;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes


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
  const pipelineStatuses = ['Sourced', 'Screened', 'Submitted to Client', 'Shortlisted', 'Interviewing', 'Offer Accepted', 'Offered'];

  const monthlyData: Record<string, {
    monthLabel: string;
    joined: { count: number; value: number; expectedRevenue: number };
    profitInvoiced: { count: number; value: number };
    lossDropped: { count: number; value: number };
    atRiskSustenance: { count: number; value: number };
    invoicesGenerated: { count: number; value: number };
    invoicesPaid: { count: number; value: number };
    tdsAmount: { count: number; value: number };
    taxableRevenue: { count: number; value: number };
  }> = {};

  data.forEach((row) => {
    const candidateName = (row['Name of the Candidate'] || row['Candidate Name'] || row['Candidate'] || '').trim();
    if (!candidateName) return;
    const status = row['Candidate Status']?.trim() || '';
    const dealValue = parseValue(row['Closed budget (LPA)']);
    
    // Check for explicit commission or taxable value
    const commissionPct = parseValue(row['Commission (%)']);
    const totalInvoiceAmount = parseValue(row['Total Invoice Amount']);
    const taxableValue = parseValue(row['Taxable Value']);
    
    let revenueAmt = 0;
    if (totalInvoiceAmount > 0) {
      revenueAmt = totalInvoiceAmount;
    } else if (taxableValue > 0) {
      revenueAmt = taxableValue;
    } else if (commissionPct > 0) {
      revenueAmt = dealValue * (commissionPct / 100);
    } else {
      revenueAmt = 0;
    }

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
          joined: { count: 0, value: 0, expectedRevenue: 0 },
          profitInvoiced: { count: 0, value: 0 },
          lossDropped: { count: 0, value: 0 },
          atRiskSustenance: { count: 0, value: 0 },
          invoicesGenerated: { count: 0, value: 0 },
          invoicesPaid: { count: 0, value: 0 },
          tdsAmount: { count: 0, value: 0 },
          taxableRevenue: { count: 0, value: 0 },
        };
      }

      const monthBucket = monthlyData[monthInfo.key];
      const terminalStatuses = ['Resigned', 'Absconded', 'Dropped', 'Rejected'];

      monthBucket.joined.count++;
      monthBucket.joined.value += dealValue;
      monthBucket.joined.expectedRevenue += revenueAmt;

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

      const isInvoiceGenerated = invoiceStatus.includes('generated') || invoiceStatus.includes('paid') || invoiceStatus.includes('received') || !!invoiceGeneratedDate;
      const isPaid = invoiceStatus === 'paid' || invoiceStatus === 'received';
      const isPartiallyPaid = invoiceStatus === 'partially paid';

      let actualPaid = 0;
      if (isPaid || isPartiallyPaid) {
        const receivedAmountStr = row['Received Amount'];
        if (receivedAmountStr !== undefined && receivedAmountStr !== null && receivedAmountStr !== '') {
          actualPaid = parseValue(receivedAmountStr);
        } else {
          actualPaid = isPaid ? revenueAmt : (revenueAmt * 0.5);
        }
      }
      
      const tdsAmount = parseValue(row['Total TDS Amount']);
      const balanceAmt = Math.max(0, revenueAmt - actualPaid - tdsAmount);

      if (isInvoiceGenerated) {
        monthBucket.invoicesGenerated.count++;
        monthBucket.invoicesGenerated.value += revenueAmt;
        if (taxableValue > 0) {
          monthBucket.taxableRevenue.count++;
          monthBucket.taxableRevenue.value += taxableValue;
        }
        if (tdsAmount > 0) {
          monthBucket.tdsAmount.count++;
          monthBucket.tdsAmount.value += tdsAmount;
        }
      }

      if (actualPaid > 0) {
        monthBucket.invoicesPaid.count++;
        monthBucket.invoicesPaid.value += actualPaid;
      }

      if (terminalStatuses.includes(status)) {
        monthBucket.lossDropped.count++;
        monthBucket.lossDropped.value += revenueAmt;
      } else if (status === 'Joined' || status === 'Invoiced') {
        if (actualPaid > 0) {
          monthBucket.profitInvoiced.count++;
          monthBucket.profitInvoiced.value += actualPaid;
        }
        if (balanceAmt > 0) {
          monthBucket.atRiskSustenance.count++;
          monthBucket.atRiskSustenance.value += balanceAmt;
        }
      }
    }
  });

  const recruiterStats: Record<string, { name: string; pipelineDeals: number; pipelineValue: number; closedDeals: number; closedValue: number }> = {};
  const clientStats: Record<string, { name: string; deals: number; value: number; paidValue: number }> = {};
  const funnelStats: Record<string, number> = {
    'Sourced': 0, 'Screened': 0, 'Submitted to Client': 0, 'Shortlisted': 0, 'Interviewing': 0, 'Offered': 0, 'Offer Accepted': 0, 'Joined': 0
  };
  const allCandidates: { 
    date: string; 
    candidate: string; 
    company: string; 
    amount: number; 
    balanceAmount: number; 
    status: string; 
    invoiceStatus: string; 
    recruiter: string;
    invoiceNo?: string;
    [key: string]: any;
  }[] = [];

  data.forEach((row) => {
    const candidateName = (row['Name of the Candidate'] || row['Candidate Name'] || row['Candidate'] || '').trim();
    if (!candidateName) return;
    const status = row['Candidate Status']?.trim() || '';
    const dealValue = parseValue(row['Closed budget (LPA)']);
    const commissionPct = parseValue(row['Commission (%)']);
    const totalInvoiceAmount = parseValue(row['Total Invoice Amount']);
    const taxableValue = parseValue(row['Taxable Value']);
    
    let revenueAmt = 0;
    if (totalInvoiceAmount > 0) {
      revenueAmt = totalInvoiceAmount;
    } else if (taxableValue > 0) {
      revenueAmt = taxableValue;
    } else if (commissionPct > 0) {
      revenueAmt = dealValue * (commissionPct / 100);
    } else {
      revenueAmt = 0;
    }

    const recruiter = row['Recruiter name']?.trim() || 'Unknown';
    const company = row['Company']?.trim() || 'Unknown';

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

      const invoiceStatusStr = row['Invoice Status']?.trim()?.toLowerCase() || '';
      const isPaid = invoiceStatusStr === 'paid' || invoiceStatusStr === 'received';
      const isPartiallyPaid = invoiceStatusStr === 'partially paid';
      
      let actualPaid = 0;
      if (isPaid || isPartiallyPaid) {
        const receivedAmountStr = row['Received Amount'];
        if (receivedAmountStr !== undefined && receivedAmountStr !== null && receivedAmountStr !== '') {
          actualPaid = parseValue(receivedAmountStr);
        } else {
          actualPaid = isPaid ? revenueAmt : (revenueAmt * 0.5);
        }
      }
      
      const tdsAmount = parseValue(row['Total TDS Amount']);
      const balanceAmt = Math.max(0, revenueAmt - actualPaid - tdsAmount);
      if (actualPaid > 0) {
        clientStats[company].paidValue += actualPaid;
      }

      allCandidates.push({
        ...row,
        date: row['Actual D.O.J'] || row['Invoice Eligibility Date'] || row['Invoice Generated Date'] || '',
        candidate: row['Name of the Candidate'] || 'Unknown',
        company,
        amount: revenueAmt,
        balanceAmount: balanceAmt,
        status,
        invoiceStatus: row['Invoice Status']?.trim() || 'Pending',
        recruiter,
        invoiceNo: row['Invoice No']?.trim()
      });
    } else {
      allCandidates.push({
        ...row,
        date: row['Actual D.O.J'] || row['Invoice Eligibility Date'] || row['Invoice Generated Date'] || '',
        candidate: row['Name of the Candidate'] || 'Unknown',
        company,
        amount: revenueAmt,
        balanceAmount: 0,
        status,
        invoiceStatus: row['Invoice Status']?.trim() || 'Pending',
        recruiter,
        invoiceNo: row['Invoice No']?.trim()
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
    // Look for various variations of the invoice amount column
    const amount = parseValue(row['Total Invoice Amount'] || row[' Total Invoice Amount'] || row['Invoice Amount (INR)']);
    let status = row['Invoice Status']?.trim() || '';

    // Normalize display statuses
    if (status.toLowerCase() === 'send') status = 'Pending';
    if (status.toLowerCase() === 'paid') status = 'Received';

    const company = row['Company']?.trim() || 'Unknown';
    const invoiceNo = row['Invoice No']?.trim() || '';

    const monthInfo = getMonthKey(invoiceDateStr);

    if (invoiceDateStr && amount > 0) {
      let invPendingAmount = amount;
      const lowerStatusForInv = status.toLowerCase();
      if (lowerStatusForInv.includes('partially paid')) {
        const received = parseValue(row['Received Amount']);
        invPendingAmount = Math.max(0, amount - received);
      } else if (lowerStatusForInv === 'paid' || lowerStatusForInv === 'received') {
        invPendingAmount = 0;
      }

      recentInvoices.push({
        date: invoiceDateStr,
        monthKey: monthInfo ? monthInfo.key : '',
        company,
        amount,
        pendingAmount: invPendingAmount,
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
      
      const isCollected = lowerStatus === 'paid' || lowerStatus === 'received';
      const isPending = lowerStatus.includes('send') || 
                        lowerStatus.includes('pending') || 
                        lowerStatus.includes('generated') || 
                        lowerStatus.includes('partially paid') || 
                        lowerStatus.includes('overdue');

      let collectedAmount = 0;
      let pendingAmount = 0;

      if (isCollected) {
        collectedAmount = amount;
      } else if (isPending) {
        if (lowerStatus.includes('partially paid')) {
          collectedAmount = parseValue(row['Received Amount']);
          pendingAmount = Math.max(0, amount - collectedAmount);
        } else {
          pendingAmount = amount;
        }
      }

      if (collectedAmount > 0) {
        monthBucket.collected.count++;
        monthBucket.collected.value += collectedAmount;
      }
      
      if (pendingAmount > 0) {
        monthBucket.pending.count++;
        monthBucket.pending.value += pendingAmount;

        if (!clientAgingStats[company]) {
          clientAgingStats[company] = { name: company, '0-30 Days': 0, '31-60 Days': 0, '60-90 Days': 0, '90+ Days': 0, totalPending: 0, invoices: { '0-30 Days': [], '31-60 Days': [], '60-90 Days': [], '90+ Days': [] } };
        }

        // Calculate aging
        if (invoiceDateStr) {
          const invDate = new Date(invoiceDateStr).getTime();
          if (!isNaN(invDate)) {
            const ageDays = (now - invDate) / (1000 * 60 * 60 * 24);
            if (ageDays <= 30) {
              agingStats['0-30 Days'].total += pendingAmount;
              if (invoiceNo) agingStats['0-30 Days'].invoices.push(invoiceNo);
              clientAgingStats[company]['0-30 Days'] += pendingAmount;
              if (invoiceNo) clientAgingStats[company].invoices['0-30 Days'].push(invoiceNo);
            } else if (ageDays <= 60) {
              agingStats['31-60 Days'].total += pendingAmount;
              if (invoiceNo) agingStats['31-60 Days'].invoices.push(invoiceNo);
              clientAgingStats[company]['31-60 Days'] += pendingAmount;
              if (invoiceNo) clientAgingStats[company].invoices['31-60 Days'].push(invoiceNo);
            } else if (ageDays <= 90) {
              agingStats['60-90 Days'].total += pendingAmount;
              if (invoiceNo) agingStats['60-90 Days'].invoices.push(invoiceNo);
              clientAgingStats[company]['60-90 Days'] += pendingAmount;
              if (invoiceNo) clientAgingStats[company].invoices['60-90 Days'].push(invoiceNo);
            } else {
              agingStats['90+ Days'].total += pendingAmount;
              if (invoiceNo) agingStats['90+ Days'].invoices.push(invoiceNo);
              clientAgingStats[company]['90+ Days'] += pendingAmount;
              if (invoiceNo) clientAgingStats[company].invoices['90+ Days'].push(invoiceNo);
            }
            clientAgingStats[company].totalPending += pendingAmount;
          }
        }
      }

      if (amount > 0) {
        if (!clientStats[company]) {
          clientStats[company] = { name: company, billed: 0, collected: 0, pending: 0 };
        }
        clientStats[company].billed += amount;
        if (collectedAmount > 0) {
          clientStats[company].collected += collectedAmount;
        }
        if (pendingAmount > 0) {
          clientStats[company].pending += pendingAmount;
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

function parseDoscMetrics(data: any[]) {
  let currentPipeline = { count: 0, value: 0 };

  const monthlyData: Record<string, {
    monthLabel: string;
    joined: { count: number; value: number; expectedRevenue: number };
    profitInvoiced: { count: number; value: number };
    lossDropped: { count: number; value: number };
    atRiskSustenance: { count: number; value: number };
    invoicesGenerated: { count: number; value: number };
    invoicesPaid: { count: number; value: number };
    tdsAmount: { count: number; value: number };
    taxableRevenue: { count: number; value: number };
  }> = {};

  const recruiterStats: Record<string, { name: string; pipelineDeals: number; pipelineValue: number; closedDeals: number; closedValue: number }> = {};
  const clientStats: Record<string, { name: string; deals: number; value: number; paidValue: number }> = {};
  const funnelStats: Record<string, number> = {
    'Sourced': 0, 'Screened': 0, 'Submitted to Client': 0, 'Shortlisted': 0, 'Interviewing': 0, 'Offered': 0, 'Offer Accepted': 0, 'Joined': 0
  };
  const allCandidates: any[] = [];

  data.forEach((row) => {
    const candidateName = (row['Name of the Candidate'] || row['Candidate Name'] || row['Candidate'] || '').trim();
    if (!candidateName) return;
    const company = row['Company Placed']?.trim() || 'Unknown';
    const collegeName = row['College Name']?.trim() || 'Unknown';
    const placementDate = row['Placement Date'];

    // Status is not explicitly provided, but if they have a placement date, we assume 'Joined'
    const status = row['Candidate Status']?.trim() || row['Status']?.trim() || (placementDate ? 'Joined' : 'Offer Accepted');

    if (funnelStats[status] !== undefined) {
      funnelStats[status]++;
    }

    const packageVal = parseValue(row['Package (LPA)']);
    const revenueAmt = parseValue(row['Amount to Receive from College']);
    const actualPaid = parseValue(row['Amount Received']);
    const balanceAmt = parseValue(row['Balance Amount']) || Math.max(0, revenueAmt - actualPaid);
    const paymentStatus = row['Payment Status']?.trim() || '';

    currentPipeline.count++;
    currentPipeline.value += revenueAmt;

    const monthInfo = getMonthKey(placementDate);

    if (monthInfo) {
      if (!monthlyData[monthInfo.key]) {
        monthlyData[monthInfo.key] = {
          monthLabel: monthInfo.label,
          joined: { count: 0, value: 0, expectedRevenue: 0 },
          profitInvoiced: { count: 0, value: 0 },
          lossDropped: { count: 0, value: 0 },
          atRiskSustenance: { count: 0, value: 0 },
          invoicesGenerated: { count: 0, value: 0 },
          invoicesPaid: { count: 0, value: 0 },
          tdsAmount: { count: 0, value: 0 },
          taxableRevenue: { count: 0, value: 0 },
        };
      }

      const monthBucket = monthlyData[monthInfo.key];
      monthBucket.joined.count++;
      monthBucket.joined.value += packageVal;
      monthBucket.joined.expectedRevenue += revenueAmt;

      const invoiceGeneratedCol = row['Invoice Generated']?.trim()?.toLowerCase() || '';
      const isInvoiceGenerated = invoiceGeneratedCol === 'yes' || invoiceGeneratedCol === 'true' || paymentStatus.length > 0 || actualPaid > 0;

      if (isInvoiceGenerated) {
        monthBucket.invoicesGenerated.count++;
        monthBucket.invoicesGenerated.value += revenueAmt;
        monthBucket.taxableRevenue.count++;
        monthBucket.taxableRevenue.value += revenueAmt; // Dosc doesn't have taxable value, so use revenue
      }

      if (actualPaid > 0) {
        monthBucket.invoicesPaid.count++;
        monthBucket.invoicesPaid.value += actualPaid;
        monthBucket.profitInvoiced.count++;
        monthBucket.profitInvoiced.value += actualPaid;
      }
      if (balanceAmt > 0) {
        monthBucket.atRiskSustenance.count++;
        monthBucket.atRiskSustenance.value += balanceAmt;
        if (isInvoiceGenerated) {
          monthBucket.lossDropped.count++;
          monthBucket.lossDropped.value += balanceAmt;
        }
      }
    }

    // Recruiter (College Name) Stats
    if (!recruiterStats[collegeName]) {
      recruiterStats[collegeName] = { name: collegeName, pipelineDeals: 0, pipelineValue: 0, closedDeals: 0, closedValue: 0 };
    }
    if (status === 'Offer Accepted') {
      recruiterStats[collegeName].pipelineDeals++;
      recruiterStats[collegeName].pipelineValue += packageVal;
    } else if (status === 'Joined') {
      recruiterStats[collegeName].closedDeals++;
      recruiterStats[collegeName].closedValue += revenueAmt;
    }

    // Client Stats
    if (status === 'Joined') {
      if (!clientStats[company]) {
        clientStats[company] = { name: company, deals: 0, value: 0, paidValue: 0 };
      }
      clientStats[company].deals++;
      clientStats[company].value += revenueAmt;
      clientStats[company].paidValue += actualPaid;
    }

    allCandidates.push({
      date: placementDate || '',
      candidate: candidateName,
      company,
      amount: revenueAmt,
      balanceAmount: balanceAmt,
      status,
      invoiceStatus: paymentStatus || 'Pending',
      recruiter: collegeName
    });
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

export async function getSheetMetrics(vendor: 'workforce' | 'descience' | 'dosc' = 'workforce') {
  const now = Date.now();
  if (cache[vendor] && now - cache[vendor].timestamp < CACHE_TTL) {
    return cache[vendor].data;
  }

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
    : vendor === 'dosc'
      ? process.env.GOOGLE_SPREADSHEET_ID_DOSC
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

  let result;
  if (vendor === 'descience') {
    result = parseDescienceMetrics(data);
  } else if (vendor === 'dosc') {
    result = parseDoscMetrics(data);
  } else {
    result = parseWorkforceMetrics(data);
  }

  cache[vendor] = { data: result, timestamp: now };
  return result;
}
