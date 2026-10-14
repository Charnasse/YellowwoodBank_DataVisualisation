'use strict';

const BRANCHES = ['Sandton', 'Cape Town', 'Durban', 'Bloemfontein', 'Pretoria', 'Gqeberha', 'Polokwane', 'Nelspruit'];
const TYPES = ['Savings', 'Cheque', 'Business', 'Private'];
const POLICIES = ['Motor', 'Home', 'Life', 'Business'];
const OFFICERS = ['A. Dube', 'B. Mokoena', 'C. Naidoo', 'D. Patel', 'E. Khumalo', 'F. Smith', 'G. Ndlovu', 'H. Jacobs'];
const COLORS = ['#c5a357', '#168478', '#5279a2', '#826b9e', '#b56851', '#728d6d', '#102b46', '#899caf'];
const FIRST_DATE = '2025-10-01';
const LAST_DATE = '2026-09-30';
const PAGE_SIZE = 15;
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
const average = (rows, field) => rows.length ? sum(rows, field) / rows.length : null;
const ratio = (numerator, denominator) => denominator ? numerator / denominator * 100 : null;
const round = value => Math.round(value * 100) / 100;
const money = value => value === null ? 'N/A' : `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortMoney = value => value === null ? 'N/A' : `R ${Intl.NumberFormat('en-ZA', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`;
const percent = value => value === null ? 'N/A' : `${value.toFixed(1)}%`;
const dateLabel = date => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthLabel = month => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const quarterOf = date => `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`;
const quarterLabel = quarter => `${quarter.slice(5)} ${quarter.slice(0, 4)}`;
function monthEnd(year, month) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}
function quarterRange(quarter) {
  const year = Number(quarter.slice(0, 4));
  const endMonth = Number(quarter.slice(-1)) * 3;
  return { start: `${year}-${String(endMonth - 2).padStart(2, '0')}-01`, end: monthEnd(year, endMonth) };
}
function previousQuarterEnd(date) {
  const month = Math.floor((Number(date.slice(5, 7)) - 1) / 3) * 3;
  return new Date(Date.UTC(Number(date.slice(0, 4)), month, 0)).toISOString().slice(0, 10);
}
function reportingMonths(start, end) {
  const months = [];
  for (let year = 2025; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (key >= start.slice(0, 7) && key <= end.slice(0, 7)) months.push(key);
    }
  }
  return months;
}
function makeData() {
  let seed = 24681357;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const customers = [], loans = [], claims = [], sars = [], snapshots = [];
  const firstNames = ['Thandi', 'Kabelo', 'Ayesha', 'Lerato', 'Musa', 'Zanele', 'Sipho', 'Amara', 'Naledi', 'Bongani', 'Palesa', 'Karabo', 'Ayanda', 'Lwazi', 'Nomsa', 'Neo', 'Nandi', 'Vuyo', 'Mariam', 'Tebogo'];
  const surnames = ['Mokoena', 'Dlamini', 'Patel', 'Nkosi', 'Khumalo', 'Maseko', 'Ndlovu', 'Naidoo', 'Molefe', 'Mthembu', 'Pillay', 'Mahlangu', 'Zuma', 'Cele', 'Radebe', 'Ismail'];
  BRANCHES.forEach((branch, branchIndex) => {
    TYPES.forEach((type, typeIndex) => {
      for (let index = 0; index < 10; index++) {
        const id = `C${String(customers.length + 1).padStart(4, '0')}`;
        const customer = {
          id, name: `${firstNames[customers.length % firstNames.length]} ${surnames[Math.floor(customers.length / firstNames.length) % surnames.length]}`,
          branch, type,
          baseBalance: round([14000, 32000, 135000, 220000][typeIndex] * (0.35 + random() * 1.5) * (1.12 - branchIndex * 0.035)),
          openingLoan: random() < 0.56 ? round(25000 + random() * [150000, 250000, 650000, 900000][typeIndex]) : 0,
          premium: random() < 0.72 ? round(1800 + random() * [5000, 8500, 22000, 32000][typeIndex]) : 0,
          portfolio: random() < [0.2, 0.35, 0.55, 0.88][typeIndex] ? round(20000 + random() * [60000, 160000, 450000, 1100000][typeIndex]) : 0,
          policy: POLICIES[Math.floor(random() * POLICIES.length)]
        };
        customer.cover = round(customer.premium * (25 + random() * 65));
        customers.push(customer);
      }
    });
  });
  const eventDate = month => `${month}-${String(1 + Math.floor(random() * 25)).padStart(2, '0')}`;
  const months = reportingMonths(FIRST_DATE, LAST_DATE);
  months.forEach((month, monthIndex) => {
    customers.forEach(customer => {
      const branchIndex = BRANCHES.indexOf(customer.branch);
      const typeIndex = TYPES.indexOf(customer.type);
      if (random() < [0.44, 0.38, 0.34, 0.19, 0.31, 0.25, 0.18, 0.22][branchIndex] * (0.85 + monthIndex * 0.035)) {
        const date = eventDate(month);
        const draw = random();
        const status = draw < 0.52 + typeIndex * 0.04 - branchIndex * 0.012 ? 'Approved' : draw < 0.84 ? 'Rejected' : 'Pending';
        const requested = Math.round((20000 + random() * [160000, 300000, 850000, 1000000][typeIndex]) / 1000) * 1000;
        const approvalDate = status === 'Approved' ? new Date(new Date(`${date}T00:00:00Z`).getTime() + (1 + Math.floor(random() * 5)) * 86400000).toISOString().slice(0, 10) : null;
        const decisionDate = status === 'Approved' ? approvalDate : status === 'Rejected' ? new Date(new Date(`${date}T00:00:00Z`).getTime() + (2 + Math.floor(random() * 10)) * 86400000).toISOString().slice(0, 10) : null;
        loans.push({ id: `LN${loans.length + 1}`, customerId: customer.id, date, approvalDate, decisionDate, status, amount: requested, approvedAmount: status === 'Approved' ? requested : 0 });
      }
      if (customer.premium && random() < 0.09 + (monthIndex % 4) * 0.016) {
        const draw = random();
        const date = eventDate(month);
        const status = draw < [0.66, 0.58, 0.8, 0.62][POLICIES.indexOf(customer.policy)] ? 'Approved' : draw < 0.86 ? 'Rejected' : 'Pending';
        const decisionDate = status === 'Pending' ? null : new Date(new Date(`${date}T00:00:00Z`).getTime() + (2 + Math.floor(random() * 24)) * 86400000).toISOString().slice(0, 10);
        claims.push({
          id: `CL${claims.length + 1}`, customerId: customer.id, date, decisionDate, policy: customer.policy,
          officer: OFFICERS[Math.floor(random() * OFFICERS.length)],
          status,
          amount: round((2500 + random() * 80000) * [1, 2.5, 4, 5][POLICIES.indexOf(customer.policy)])
        });
      }
      if (random() < 0.045 + branchIndex * 0.004 + monthIndex * 0.001) {
        const date = eventDate(month), hours = Math.floor(4 + random() * 350);
        const resolvedAt = random() < 0.77 ? new Date(new Date(`${date}T00:00:00Z`).getTime() + hours * 3600000).toISOString() : null;
        sars.push({ id: `SAR${sars.length + 1}`, customerId: customer.id, date, resolvedAt, hours });
      }
    });
  });
  // Prior quarter snapshots are retained for comparable-cohort baselines only.
  reportingMonths('2025-07-01', LAST_DATE).forEach((month, monthIndex) => {
    const date = monthEnd(Number(month.slice(0, 4)), Number(month.slice(5)));
    customers.forEach(customer => {
      const typeIndex = TYPES.indexOf(customer.type);
      const t = monthIndex - 2;
      const growth = [0.009, 0.005, 0.015, 0.011][typeIndex];
      const seasonal = Math.sin(monthIndex * 0.85 + typeIndex) * [0.05, 0.035, 0.09, 0.06][typeIndex];
      const accountBalance = round(customer.baseBalance * (1 + t * growth + seasonal));
      const approved = loans.filter(loan => loan.customerId === customer.id && loan.approvalDate && loan.approvalDate <= date);
      const loanPrincipal = round(customer.openingLoan * Math.max(0, 1 - Math.max(t, 0) * 0.018) + approved.reduce((total, loan) => {
        const age = (Number(month.slice(0, 4)) - Number(loan.approvalDate.slice(0, 4))) * 12 + Number(month.slice(5)) - Number(loan.approvalDate.slice(5, 7));
        return total + loan.approvedAmount * Math.max(0, 1 - age / 36);
      }, 0));
      const portfolioValue = round(customer.portfolio * (1 + t * 0.008 + Math.sin(monthIndex * 0.7) * 0.025));
      const annualPremium = round(customer.premium * (1 + Math.floor(Math.max(t, 0) / 6) * 0.04));
      const products = ['Account'];
      if (loanPrincipal > 0) products.push('Loan');
      if (annualPremium > 0) products.push('Insurance');
      if (portfolioValue > 0) products.push('Portfolio');
      snapshots.push({
        customerId: customer.id, date, accountBalance, loanPrincipal, portfolioValue, annualPremium,
        insuranceCover: customer.cover, products,
        combinedValue: round(accountBalance + loanPrincipal + portfolioValue + annualPremium)
      });
    });
  });
  return { customers, loans, claims, sars, snapshots };
}
const DATA = makeData();
const DEFAULT_FILTERS = {
  start: FIRST_DATE, end: LAST_DATE, branch: 'all', accountType: 'all',
  loanStatus: 'all', policy: 'all', officer: 'all', sarStatus: 'all',
  relationship: 'multi', customerSearch: '', customerSort: 'value'
};
function validateFilters(filters) {
  const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  if (!validDate(filters.start) || !validDate(filters.end)) return 'Choose valid start and end dates.';
  if (filters.start > filters.end) return 'The start date must be on or before the end date.';
  if (filters.start < FIRST_DATE || filters.end > LAST_DATE) return 'Available activity runs from 1 Oct 2025 to 30 Sep 2026.';
  return null;
}
function calculate(filters, data = DATA) {
  const error = validateFilters(filters);
  if (error) throw new Error(error);
  const customers = data.customers.filter(customer => (filters.branch === 'all' || customer.branch === filters.branch) && (filters.accountType === 'all' || customer.type === filters.accountType));
  const customerMap = new Map(customers.map(customer => [customer.id, customer]));
  const cohort = rows => rows.filter(row => customerMap.has(row.customerId));
  const inPeriod = date => date >= filters.start && date <= filters.end;
  const statusAsOf = row => row.decisionDate && row.decisionDate > filters.end ? { ...row, status: 'Pending' } : row;
  const loanCohort = cohort(data.loans).map(statusAsOf).filter(loan => filters.loanStatus === 'all' || loan.status === filters.loanStatus);
  const applications = loanCohort.filter(loan => inPeriod(loan.date));
  const approvals = loanCohort.filter(loan => loan.status === 'Approved' && inPeriod(loan.approvalDate));
  const applicationMetrics = rows => ({
    approvedApplications: rows.filter(row => row.status === 'Approved').length,
    rejectedApplications: rows.filter(row => row.status === 'Rejected').length,
    pendingApplications: rows.filter(row => row.status === 'Pending').length,
    requestedAmount: sum(rows, 'amount')
  });
  const months = reportingMonths(filters.start, filters.end);
  const monthlyLoans = months.map(month => {
    const submitted = applications.filter(loan => loan.date.startsWith(month));
    const approved = approvals.filter(loan => loan.approvalDate.startsWith(month));
    return { month, applications: submitted.length, ...applicationMetrics(submitted), approvals: approved.length, approvedAmount: sum(approved, 'approvedAmount') };
  });
  const branches = (filters.branch === 'all' ? BRANCHES : [filters.branch]).map(branch => {
    const belongs = loan => customerMap.get(loan.customerId).branch === branch;
    const submitted = applications.filter(belongs);
    return { branch, applications: submitted.length, ...applicationMetrics(submitted), share: ratio(submitted.length, applications.length), approvedAmount: sum(approvals.filter(belongs), 'approvedAmount') };
  }).sort((a, b) => b.applications - a.applications);
  const snapshots = cohort(data.snapshots);
  const dates = [...new Set(data.snapshots.map(row => row.date))].filter(inPeriod).sort();
  const snapshotDate = dates.at(-1) || null;
  const currentBalances = snapshots.filter(row => row.date === snapshotDate);
  const types = filters.accountType === 'all' ? TYPES : [filters.accountType];
  const balances = types.map(type => {
    const rows = currentBalances.filter(row => customerMap.get(row.customerId).type === type);
    return { type, accounts: rows.length, average: average(rows, 'accountBalance') };
  }).sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  const comparisonCustomers = new Map(data.customers.filter(customer => types.includes(customer.type)).map(customer => [customer.id, customer]));
  const comparisonGroups = new Map();
  data.snapshots.filter(row => row.date === snapshotDate && comparisonCustomers.has(row.customerId)).forEach(row => {
    const customer = comparisonCustomers.get(row.customerId);
    const key = `${customer.branch}:${customer.type}`;
    if (!comparisonGroups.has(key)) comparisonGroups.set(key, []);
    comparisonGroups.get(key).push(row);
  });
  const largestBranchAverage = Math.max(0, ...Array.from(comparisonGroups.values(), rows => average(rows, 'accountBalance')));
  const balanceAxisMax = largestBranchAverage ? Math.ceil(largestBranchAverage / 50000) * 50000 : null;
  const quarters = [...new Set(months.map(month => quarterOf(`${month}-01`)))];
  const quarterlyBalances = quarters.flatMap(quarter => {
    const endpoint = dates.filter(date => quarterOf(date) === quarter).at(-1);
    const baseline = previousQuarterEnd(quarterRange(quarter).end);
    return types.map(type => {
      const typed = snapshots.filter(row => customerMap.get(row.customerId).type === type);
      const rows = typed.filter(row => row.date === endpoint);
      const prior = typed.filter(row => row.date === baseline);
      const avg = average(rows, 'accountBalance'), previous = average(prior, 'accountBalance');
      return { quarter, date: endpoint || null, partial: endpoint !== quarterRange(quarter).end, type, accounts: rows.length, average: avg, previous, change: avg === null || previous === null || previous === 0 ? null : (avg - previous) / previous * 100 };
    });
  });
  const claims = cohort(data.claims).filter(claim => inPeriod(claim.date) && (filters.policy === 'all' || claim.policy === filters.policy) && (filters.officer === 'all' || claim.officer === filters.officer)).map(statusAsOf);
  const policyRows = (filters.policy === 'all' ? POLICIES : [filters.policy]).map(policy => {
    const rows = claims.filter(claim => claim.policy === policy);
    const approved = rows.filter(claim => claim.status === 'Approved').length;
    const rejected = rows.filter(claim => claim.status === 'Rejected').length;
    return { policy, approved, rejected, pending: rows.length - approved - rejected, rate: ratio(approved, approved + rejected) };
  });
  const officerRows = (filters.officer === 'all' ? OFFICERS : [filters.officer]).map(officer => {
    const rows = claims.filter(claim => claim.officer === officer);
    return { officer, claims: rows.length, total: sum(rows, 'amount'), average: average(rows, 'amount') };
  }).sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  const resolved = report => report.resolvedAt !== null && report.resolvedAt <= `${filters.end}T23:59:59.999Z`;
  const sars = cohort(data.sars).filter(report => inPeriod(report.date) && (filters.sarStatus === 'all' || (filters.sarStatus === 'resolved' ? resolved(report) : !resolved(report))));
  const sarRows = quarters.map(quarter => {
    const rows = sars.filter(report => quarterOf(report.date) === quarter);
    const closed = rows.filter(resolved);
    return { quarter, raised: rows.length, resolved: closed.length, open: rows.length - closed.length, rate: ratio(closed.length, rows.length), within24: ratio(closed.filter(report => report.hours <= 24).length, rows.length) };
  });
  const search = filters.customerSearch.trim().toLowerCase();
  const relationships = currentBalances.map(row => ({ ...row, ...customerMap.get(row.customerId) })).filter(row =>
    (filters.relationship === 'all' || (filters.relationship === 'allFour' ? row.products.length === 4 : row.products.length >= 2)) &&
    (!search || row.name.toLowerCase().includes(search) || row.id.toLowerCase().includes(search))
  ).sort((a, b) => filters.customerSort === 'name' ? a.name.localeCompare(b.name) || a.id.localeCompare(b.id) : filters.customerSort === 'products' ? b.products.length - a.products.length || b.combinedValue - a.combinedValue : b.combinedValue - a.combinedValue);
  const decided = claims.filter(claim => claim.status !== 'Pending');
  return {
    customers, monthlyLoans, branches, balances, balanceAxisMax, quarterlyBalances, quarters, snapshotDate, policyRows, officerRows, sarRows, relationships,
    approvedValue: sum(approvals, 'approvedAmount'), approvalCount: approvals.length, applicationCount: applications.length,
    averageBalance: average(currentBalances, 'accountBalance'), accountCount: currentBalances.length,
    claimRate: ratio(decided.filter(claim => claim.status === 'Approved').length, decided.length), claimCount: claims.length, decidedCount: decided.length,
    pendingClaims: claims.length - decided.length, sarCount: sars.length, resolvedCount: sars.filter(resolved).length,
    relationshipValue: sum(relationships, 'combinedValue')
  };
}
function managementInsights(model, filters) {
  const highest = model.balances.find(row => row.average !== null);
  const comparison = highest ? model.quarterlyBalances.filter(row => row.type === highest.type && row.date).at(-1) : null;
  const multipleTypes = model.balances.filter(row => row.average !== null).length > 1;
  const declining = comparison?.change !== null && comparison?.change < 0;
  const unresolved = model.sarCount - model.resolvedCount;
  return [
    {
      title: highest ? `${highest.type} ${multipleTypes ? 'has the highest average deposit balance' : 'deposit balance in the selected segment'}` : 'Deposit insight requires a month-end snapshot',
      evidence: highest
        ? `${highest.type} accounts average ${money(highest.average)} across ${highest.accounts} accounts at ${dateLabel(model.snapshotDate)}. ${comparison?.change !== null && comparison?.change !== undefined ? `${quarterLabel(comparison.quarter)} changed ${percent(comparison.change)} against the previous quarter-end${comparison.partial ? ' (partial-quarter comparison)' : ''}.` : 'No comparable quarter-over-quarter change is available.'} This reflects the selected branch and account-type cohort, not necessarily the whole bank.`
        : 'The selected window contains no account balance snapshot, so a deposit ranking or trend cannot be established.',
      decision: highest
        ? declining
          ? `Ask the ${highest.type} relationship team to investigate the balance decline, contact customers showing material outflows, and test targeted retention offers. Track the next full quarter-end average before expanding the intervention.`
          : `Prioritise retention and relationship reviews for ${highest.type} customers, and test targeted deposit offers in this segment. Evaluate funding cost and balance retention before allocating additional budget; a high average balance alone does not prove profitability.`
        : 'Select a reporting window containing a month-end date before deciding on deposit retention or growth campaigns.'
    },
    {
      title: model.sarCount ? `${unresolved} of ${model.sarCount} selected suspicious activity reports remain unresolved` : 'No suspicious activity reports in this selection',
      evidence: model.sarCount
        ? `${model.resolvedCount} reports were resolved (${percent(ratio(model.resolvedCount, model.sarCount))}) by ${dateLabel(filters.end)}. ${filters.sarStatus === 'all' ? 'The cohort includes all resolution statuses.' : 'A resolution-status filter is active; this subset must not be interpreted as the overall resolution rate.'} Report volume alone does not establish severity or a regulatory breach.`
        : 'There are no matching reports from which to assess resolution performance; this does not establish that the bank has no financial-crime risk.',
      decision: !model.sarCount
        ? 'Broaden the reporting window or cohort and confirm reporting completeness before changing compliance staffing or controls.'
        : filters.sarStatus !== 'all'
          ? 'Switch the resolution-status filter to All reports before assessing team performance or staffing needs. Review unresolved cases by age and risk to prioritise follow-up.'
          : unresolved > 0
            ? 'Have the compliance manager review unresolved cases by age and risk, assign accountable owners, and prioritise high-risk investigations. Allocate additional capacity only after validating case complexity and monitor the backlog and resolution rate weekly.'
            : 'Maintain current investigation controls and review closure quality through case sampling. Monitor newly raised reports before reducing compliance capacity.'
    }
  ];
}
function exportRows(section, model) {
  switch (section) {
    case 'loans': return [
      ['Group', 'Period / branch', 'Applications', 'Approvals by approval date', 'Approved principal ZAR', 'Application share %', 'Approved applications by submission date', 'Rejected applications', 'Pending applications', 'Requested amount ZAR'],
      ...model.monthlyLoans.map(row => ['Monthly', row.month, row.applications, row.approvals, row.approvedAmount, null, row.approvedApplications, row.rejectedApplications, row.pendingApplications, row.requestedAmount]),
      ...model.branches.map(row => ['Branch', row.branch, row.applications, null, row.approvedAmount, row.share, row.approvedApplications, row.rejectedApplications, row.pendingApplications, row.requestedAmount])
    ];
    case 'accounts': return [['Quarter', 'Snapshot date', 'Partial quarter', 'Account type', 'Accounts', 'Average ZAR', 'Prior quarter average ZAR', 'QoQ %'], ...model.quarterlyBalances.map(row => [row.quarter, row.date, row.partial, row.type, row.accounts, row.average, row.previous, row.change])];
    case 'claims': return [
      ['Group', 'Policy / officer', 'Approved', 'Rejected', 'Pending', 'Approval %', 'Claim count', 'Total submitted ZAR', 'Average submitted ZAR'],
      ...model.policyRows.map(row => ['Policy', row.policy, row.approved, row.rejected, row.pending, row.rate, row.approved + row.rejected + row.pending, null, null]),
      ...model.officerRows.map(row => ['Officer', row.officer, null, null, null, null, row.claims, row.total, row.average])
    ];
    case 'sars': return [['Quarter', 'Raised', 'Resolved', 'Unresolved', 'Resolved %', 'Within 24h %'], ...model.sarRows.map(row => [row.quarter, row.raised, row.resolved, row.open, row.rate, row.within24])];
    case 'relationships': return [['Customer ID', 'Customer', 'Branch', 'Account type', 'Snapshot date', 'Products', 'Deposits ZAR', 'Outstanding loans ZAR', 'Portfolio ZAR', 'Annual premium ZAR', 'Insurance coverage ZAR (excluded)', 'Combined footprint ZAR'], ...model.relationships.map(row => [row.id, row.name, row.branch, row.type, row.date, row.products.join(' + '), row.accountBalance, row.loanPrincipal, row.portfolioValue, row.annualPremium, row.insuranceCover, row.combinedValue])];
    default: throw new Error(`Unknown export section: ${section}`);
  }
}
function csvString(rows) {
  return rows.map(row => row.map(value => {
    let text = value === null ? 'N/A' : String(value);
    if (/^[=+@\t\r-]/.test(text) && typeof value !== 'number') text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}

function mountDashboard() {
  const $ = id => document.getElementById(id);
  const charts = new Map();
  let model, activeFilters, page = 0;
  const appendOptions = (id, options) => options.forEach(value => $(id).add(new Option(value, value)));
  appendOptions('branch', BRANCHES);
  appendOptions('accountType', TYPES);
  appendOptions('policy', POLICIES);
  appendOptions('officer', OFFICERS);
  const readFilters = () => Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(key => [key, $(key).value]));
  const table = (id, rows, columns) => {
    $(id).innerHTML = rows.length ? rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${columns}" class="empty">No matching records for this selection.</td></tr>`;
  };
  const escapeHTML = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const chart = (id, labels, datasets, options = {}) => {
    if (charts.has(id)) charts.get(id).destroy();
    if (typeof Chart === 'undefined') {
      const canvas = $(id);
      if (!canvas.parentElement.querySelector('.chart-error')) {
        const notice = document.createElement('p');
        notice.className = 'chart-error';
        notice.textContent = 'Chart library unavailable. Exact metrics remain available in the tables.';
        canvas.hidden = true;
        canvas.parentElement.append(notice);
      }
      return;
    }
    charts.set(id, new Chart($(id), {
      type: 'bar', data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: datasets.length > 1, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${context.raw === null ? 'N/A' : context.dataset.format === 'money' ? money(context.raw) : context.dataset.format === 'percent' ? percent(context.raw) : context.raw}` } } },
        scales: { x: { grid: { display: false }, ticks: { color: '#60758a', font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: '#edf1f5' }, ticks: { color: '#60758a', font: { size: 10 } } } },
        ...options
      }
    }));
  };
  const bar = (label, data, color, format = 'money') => ({ label, data, backgroundColor: color, borderRadius: 4, format });
  const moneyScale = { beginAtZero: true, ticks: { callback: shortMoney, font: { size: 10 } }, grid: { color: '#edf1f5' } };
  const percentageScale = { min: 0, max: 100, ticks: { callback: value => `${value}%`, font: { size: 10 } } };
  function renderRelationships() {
    const rows = model.relationships.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    table('relationshipTable', rows.map(row => [
      `${escapeHTML(row.name)}<small>${row.id}</small>`, `${row.branch}<small>${row.type}</small>`,
      row.products.map(product => `<span class="product">${product}</span>`).join(''),
      money(row.accountBalance), money(row.loanPrincipal), money(row.portfolioValue), money(row.annualPremium), money(row.insuranceCover), `<strong>${money(row.combinedValue)}</strong>`
    ]), 9);
    $('relationshipSummary').innerHTML = `<span><strong>${model.relationships.length}</strong> matching customers</span><span><strong>${money(model.relationshipValue)}</strong> combined footprint</span><span><strong>${model.relationships.filter(row => row.products.length === 4).length}</strong> with all four products</span><span>Snapshot: <strong>${model.snapshotDate ? dateLabel(model.snapshotDate) : 'Not available'}</strong></span>`;
    $('pageInfo').textContent = rows.length ? `${page * PAGE_SIZE + 1}-${page * PAGE_SIZE + rows.length} of ${model.relationships.length} customers` : '0 matching customers';
    $('prevPage').disabled = page === 0;
    $('nextPage').disabled = (page + 1) * PAGE_SIZE >= model.relationships.length;
  }
  function render() {
    $('scope').textContent = `${dateLabel(activeFilters.start)} - ${dateLabel(activeFilters.end)}  |  ${activeFilters.branch === 'all' ? 'All branches' : activeFilters.branch}  |  ${activeFilters.accountType === 'all' ? 'All account types' : activeFilters.accountType}  |  ${model.customers.length} customers in cohort`;
    $('asOf').textContent = dateLabel(activeFilters.end);
    $('balanceDate').textContent = `${activeFilters.branch === 'all' ? 'All branches' : activeFilters.branch} / ${model.snapshotDate ? `Snapshot: ${dateLabel(model.snapshotDate)} / ${model.accountCount} accounts` : 'No month-end snapshot in the selected window'}. Chart scale is consistent across branches for this date and account-type selection.`;
    const cards = [
      ['Approved loan principal', shortMoney(model.approvedValue), `${model.approvalCount} approvals / ${model.applicationCount} submitted applications. Lending status filter applied.`],
      ['Average account balance', shortMoney(model.averageBalance), `${model.accountCount} accounts / latest selected month-end.`],
      ['Claim approval rate', percent(model.claimRate), `${model.decidedCount} decided / ${model.pendingClaims} pending. Policy and officer filters applied.`],
      ['Multi-product customers', model.relationships.filter(row => row.products.length > 1).length, `${model.relationships.length} matching customers / relationship and search filters applied.`]
    ];
    $('kpis').innerHTML = cards.map(([label, value, note]) => `<article class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></article>`).join('');
    const leader = model.branches.find(row => row.applications > 0);
    const highest = model.balances.find(row => row.average !== null);
    const quarter = model.quarterlyBalances.filter(row => row.type === highest?.type && row.date).at(-1);
    $('insights').innerHTML = [
      [leader ? `${leader.branch} leads application volume` : 'No applications in this selection', leader ? `${leader.applications} applications (${percent(leader.share)} of selected volume). Approved principal across the cohort: ${money(model.approvedValue)}.` : 'Broaden the date, branch, account type or status selection.'],
      [highest ? `${highest.type} holds the highest average balance` : 'No balance snapshot in this selection', highest ? `${money(highest.average)} per account. Latest selected quarter comparison: ${percent(quarter?.change ?? null)}${quarter?.partial ? ' (partial quarter)' : ''}.` : 'Choose a window containing a month-end date to analyse holdings.'],
      [`${model.sarCount - model.resolvedCount} suspicious activity reports unresolved`, `${model.resolvedCount} of ${model.sarCount} selected reports resolved (${percent(ratio(model.resolvedCount, model.sarCount))}) by ${dateLabel(activeFilters.end)}. ${activeFilters.sarStatus === 'all' ? 'All report statuses included.' : 'Resolution status filter is active; this is a subset, not the overall rate.'}`]
    ].map(([title, body]) => `<article class="insight"><strong>${title}</strong><span>${body}</span></article>`).join('');
    $('managementInsights').innerHTML = managementInsights(model, activeFilters).map((insight, index) => `
      <article class="management-card">
        <div class="eyebrow">INSIGHT 0${index + 1}</div>
        <h3>${escapeHTML(insight.title)}</h3>
        <p>${escapeHTML(insight.evidence)}</p>
        <div class="management-decision"><div class="eyebrow">SUPPORTING MANAGEMENT DECISION</div><p>${escapeHTML(insight.decision)}</p></div>
      </article>`).join('');
    const requestedView = activeFilters.loanStatus === 'Rejected' || activeFilters.loanStatus === 'Pending';
    $('loanMonthlyTitle').textContent = requestedView ? `Monthly ${activeFilters.loanStatus.toLowerCase()} requested amount` : 'Monthly approved loan amount';
    $('loanMonthlySubtitle').textContent = requestedView
      ? 'Requested principal by submission date; these applications are not approved loans.'
      : 'Approved principal by approval date. Application status counts below use submission dates.';
    $('loanMonthly').setAttribute('aria-label', `${$('loanMonthlyTitle').textContent}; exact amounts and status counts in the monthly register below`);
    table('loanMonthsTable', model.monthlyLoans.map(row => [monthLabel(row.month), row.applications, row.approvedApplications, row.rejectedApplications, row.pendingApplications, money(row.requestedAmount), row.approvals, money(row.approvedAmount)]), 8);
    table('loanBranchesTable', model.branches.map(row => [row.branch, row.applications, row.approvedApplications, row.rejectedApplications, row.pendingApplications, percent(row.share), money(row.requestedAmount), money(row.approvedAmount)]), 8);
    table('accountAverageTable', model.balances.map(row => [row.type, row.accounts, money(row.average)]), 3);
    table('accountTable', model.quarterlyBalances.map(row => [
      `${quarterLabel(row.quarter)}<small>${row.date ? dateLabel(row.date) : 'No snapshot'}${row.partial ? ' / partial' : ''}</small>`,
      row.type, row.accounts, money(row.average), money(row.previous),
      `<span class="${row.change === null ? '' : row.change >= 0 ? 'positive' : 'negative'}">${row.change !== null && row.change > 0 ? '+' : ''}${percent(row.change)}</span>`
    ]), 6);
    table('policyTable', model.policyRows.map(row => [row.policy, row.approved, row.rejected, row.pending, percent(row.rate)]), 5);
    table('officerTable', model.officerRows.map(row => [row.officer, row.claims, money(row.total), money(row.average)]), 4);
    table('sarTable', model.sarRows.map(row => [quarterLabel(row.quarter), row.raised, row.resolved, row.open, percent(row.rate), percent(row.within24)]), 6);
    renderRelationships();
    chart('loanMonthly', model.monthlyLoans.map(row => monthLabel(row.month)), [bar(requestedView ? `${activeFilters.loanStatus} requested principal` : 'Approved principal', model.monthlyLoans.map(row => requestedView ? row.requestedAmount : row.approvedAmount), requestedView ? activeFilters.loanStatus === 'Rejected' ? COLORS[4] : COLORS[0] : COLORS[0])], { scales: { y: moneyScale } });
    chart('loanBranch', model.branches.map(row => row.branch), [
      ['Approved', 'approvedApplications', COLORS[1]], ['Rejected', 'rejectedApplications', COLORS[4]], ['Pending', 'pendingApplications', COLORS[0]]
    ].filter(([status]) => activeFilters.loanStatus === 'all' || activeFilters.loanStatus === status)
      .map(([status, field, color]) => bar(`${status} applications`, model.branches.map(row => row[field]), color, 'count')),
    { indexAxis: 'y', scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }, y: { stacked: true } } });
    chart('accountAverage', model.balances.map(row => row.type), [bar('Average balance', model.balances.map(row => row.average), COLORS)], { scales: { y: { ...moneyScale, ...(model.balanceAxisMax === null ? {} : { max: model.balanceAxisMax }) } } });
    chart('accountQuarter', model.quarters.map(quarterLabel), (activeFilters.accountType === 'all' ? TYPES : [activeFilters.accountType]).map((type, index) => ({
      label: type, type: 'line', data: model.quarters.map(quarter => model.quarterlyBalances.find(row => row.quarter === quarter && row.type === type).average),
      borderColor: COLORS[index], backgroundColor: COLORS[index], tension: .2, pointRadius: 4, format: 'money'
    })), { scales: { y: moneyScale } });
    chart('claimPolicy', model.policyRows.map(row => row.policy), [bar('Approval rate', model.policyRows.map(row => row.rate), COLORS, 'percent')], { scales: { y: percentageScale } });
    chart('claimOfficer', model.officerRows.map(row => row.officer), [bar('Average submitted amount', model.officerRows.map(row => row.average), COLORS[3])], { indexAxis: 'y', scales: { x: moneyScale } });
    chart('sarQuarter', model.sarRows.map(row => quarterLabel(row.quarter)), [
      { ...bar('Reports raised', model.sarRows.map(row => row.raised), COLORS[0], 'count'), yAxisID: 'y' },
      { label: 'Resolved %', type: 'line', data: model.sarRows.map(row => row.rate), borderColor: COLORS[1], backgroundColor: COLORS[1], yAxisID: 'y1', format: 'percent' },
      { label: 'Within 24h %', type: 'line', data: model.sarRows.map(row => row.within24), borderColor: COLORS[2], backgroundColor: COLORS[2], yAxisID: 'y1', format: 'percent' }
    ], { scales: { y: { beginAtZero: true, title: { display: true, text: 'Reports raised' }, ticks: { precision: 0 } }, y1: { ...percentageScale, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Resolution %' } } } });
  }
  function update() {
    const filters = readFilters();
    const error = validateFilters(filters);
    $('error').hidden = !error;
    $('error').textContent = error || '';
    document.querySelectorAll('[data-export]').forEach(button => { button.disabled = Boolean(error); });
    $('filters').setAttribute('aria-invalid', String(Boolean(error)));
    if (error) {
      $('scope').textContent = 'Invalid reporting window. Results below remain the last valid selection; exports are disabled.';
      return;
    }
    activeFilters = filters;
    model = calculate(filters);
    page = 0;
    render();
  }
  $('filters').addEventListener('submit', event => event.preventDefault());
  $('period').addEventListener('change', () => {
    const value = $('period').value;
    if (value !== 'custom') {
      const range = value === 'year' ? { start: FIRST_DATE, end: LAST_DATE } : quarterRange(value);
      $('start').value = range.start;
      $('end').value = range.end;
    }
    update();
  });
  Object.keys(DEFAULT_FILTERS).forEach(id => $(id).addEventListener(id === 'customerSearch' ? 'input' : 'change', () => {
    if (id === 'start' || id === 'end') $('period').value = 'custom';
    update();
  }));
  $('reset').addEventListener('click', () => {
    Object.entries(DEFAULT_FILTERS).forEach(([key, value]) => { $(key).value = value; });
    $('period').value = 'year';
    update();
  });
  $('prevPage').addEventListener('click', () => { if (page > 0) { page--; renderRelationships(); } });
  $('nextPage').addEventListener('click', () => { if ((page + 1) * PAGE_SIZE < model.relationships.length) { page++; renderRelationships(); } });
  document.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', () => {
    const section = button.dataset.export;
    const metadata = [['Reporting start', activeFilters.start], ['Reporting end', activeFilters.end], ['Branch', activeFilters.branch], ['Customer account type', activeFilters.accountType], ['Source', 'Deterministic sample data']];
    const localKeys = { loans: ['loanStatus'], accounts: [], claims: ['policy', 'officer'], sars: ['sarStatus'], relationships: ['relationship', 'customerSearch', 'customerSort'] };
    localKeys[section].forEach(key => metadata.push([key, activeFilters[key]]));
    const blob = new Blob(['\uFEFF', csvString([...metadata, [], ...exportRows(section, model)])], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = `yellowwood-${section}-${activeFilters.start}-${activeFilters.end}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
  function updateNavigation() {
    let current = 'overview';
    document.querySelectorAll('section').forEach(section => {
      if (section.getBoundingClientRect().top <= window.innerHeight * 0.3) current = section.id;
    });
    document.querySelectorAll('nav a').forEach(link => link.classList.toggle('active', link.hash === `#${current}`));
  }
  window.addEventListener('scroll', updateNavigation, { passive: true });
  update();
  updateNavigation();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DATA, DEFAULT_FILTERS, calculate, makeData, validateFilters, exportRows, csvString, quarterRange, previousQuarterEnd, managementInsights };
}
if (typeof document !== 'undefined') mountDashboard();
