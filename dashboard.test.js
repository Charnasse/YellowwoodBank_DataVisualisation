'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DATA, DEFAULT_FILTERS, calculate, makeData, validateFilters, exportRows,
  csvString, quarterRange, previousQuarterEnd, managementInsights
} = require('./dashboard.js');
const sum = (rows, field) => rows.reduce((total, row) => total + row[field], 0);
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);
const filters = overrides => ({ ...DEFAULT_FILTERS, ...overrides });

test('two management insights use filtered evidence and pair it with actionable decisions', () => {
  const defaults = filters();
  const insights = managementInsights(calculate(defaults), defaults);
  assert.equal(insights.length, 2);
  assert.ok(insights.every(row => row.title && row.evidence && row.decision));
  const selected = filters({ branch: 'Sandton', accountType: 'Savings', ...quarterRange('2026-Q2') });
  const changed = managementInsights(calculate(selected), selected);
  assert.notDeepEqual(changed, insights);
  assert.ok(changed[0].title.includes('selected segment'));
  assert.ok(!changed[0].title.includes('highest'));
  const noSnapshot = filters({ start: '2026-05-02', end: '2026-05-15' });
  assert.ok(managementInsights(calculate(noSnapshot), noSnapshot)[0].decision.includes('month-end'));
  const resolvedOnly = filters({ sarStatus: 'resolved' });
  assert.ok(managementInsights(calculate(resolvedOnly), resolvedOnly)[1].decision.includes('All reports'));
  const empty = calculate(defaults, { customers: [], loans: [], claims: [], sars: [], snapshots: [] });
  assert.ok(managementInsights(empty, defaults)[1].decision.includes('completeness'));
});

test('sample records are reproducible, referentially complete and cover 12 months', () => {
  assert.deepEqual(makeData(), DATA);
  assert.equal(DATA.customers.length, 320);
  const ids = new Set(DATA.customers.map(row => row.id));
  assert.equal(ids.size, 320);
  for (const rows of [DATA.loans, DATA.claims, DATA.sars, DATA.snapshots]) {
    assert.ok(rows.every(row => ids.has(row.customerId)));
  }
  const result = calculate(filters());
  assert.equal(result.monthlyLoans.length, 12);
  assert.equal(result.monthlyLoans[0].month, '2025-10');
  assert.equal(result.monthlyLoans.at(-1).month, '2026-09');
  assert.equal(result.snapshotDate, '2026-09-30');
  assert.equal(result.accountCount, 320);
});

test('lending monthly and branch totals reconcile to source approval and submission dates', () => {
  const result = calculate(filters());
  const approved = DATA.loans.filter(row => row.status === 'Approved' && row.approvalDate >= DEFAULT_FILTERS.start && row.approvalDate <= DEFAULT_FILTERS.end);
  assert.equal(result.approvedValue, sum(approved, 'approvedAmount'));
  assert.equal(sum(result.monthlyLoans, 'approvedAmount'), result.approvedValue);
  assert.equal(sum(result.branches, 'approvedAmount'), result.approvedValue);
  assert.equal(sum(result.monthlyLoans, 'applications'), result.applicationCount);
  assert.equal(sum(result.branches, 'applications'), result.applicationCount);
  close(sum(result.branches, 'share'), 100);
  assert.ok(result.branches[0].applications >= result.branches.at(-1).applications);
});

test('all lending statuses have visible counts and requested amounts that reconcile to source data', () => {
  const all = calculate(filters());
  let statusTotal = 0;
  for (const [status, field] of [['Approved', 'approvedApplications'], ['Rejected', 'rejectedApplications'], ['Pending', 'pendingApplications']]) {
    const result = calculate(filters({ loanStatus: status }));
    const source = DATA.loans.filter(row => (row.decisionDate > DEFAULT_FILTERS.end ? 'Pending' : row.status) === status);
    assert.ok(result.applicationCount > 0);
    assert.equal(result.applicationCount, source.length);
    assert.equal(sum(result.monthlyLoans, field), source.length);
    assert.equal(sum(result.branches, field), source.length);
    assert.equal(sum(all.monthlyLoans, field), source.length);
    assert.equal(sum(result.monthlyLoans, 'requestedAmount'), sum(source, 'amount'));
    assert.equal(sum(result.branches, 'requestedAmount'), sum(source, 'amount'));
    assert.ok(sum(result.monthlyLoans, 'requestedAmount') > 0);
    if (status !== 'Approved') assert.equal(result.approvedValue, 0);
    const exported = exportRows('loans', result);
    assert.equal(exported[0][9], 'Requested amount ZAR');
    assert.equal(exported[1][9], result.monthlyLoans[0].requestedAmount);
    statusTotal += source.length;
  }
  assert.equal(statusTotal, all.applicationCount);
  for (const row of all.monthlyLoans) assert.equal(row.approvedApplications + row.rejectedApplications + row.pendingApplications, row.applications);
});

test('branch, account segment and period meaningfully filter every product domain', () => {
  const all = calculate(filters());
  const sandton = calculate(filters({ branch: 'Sandton' }));
  const savings = calculate(filters({ accountType: 'Savings' }));
  const q2 = calculate(filters(quarterRange('2026-Q2')));
  for (const result of [sandton, savings, q2]) {
    for (const field of ['approvedValue', 'applicationCount', 'claimCount', 'sarCount', 'relationshipValue']) {
      assert.notEqual(result[field], all[field], field);
    }
    assert.notEqual(result.averageBalance, all.averageBalance);
  }
  assert.ok(sandton.customers.every(row => row.branch === 'Sandton'));
  assert.ok(savings.relationships.every(row => row.type === 'Savings'));
  assert.equal(q2.monthlyLoans.length, 3);
  assert.equal(q2.sarRows.length, 1);
  assert.equal(sandton.branches.length, 1);
});

test('account average is a stock at latest month-end; QoQ uses prior full quarter for the same cohort', () => {
  const result = calculate(filters({ branch: 'Cape Town', ...quarterRange('2026-Q2') }));
  const ids = new Set(result.customers.map(row => row.id));
  const balances = DATA.snapshots.filter(row => ids.has(row.customerId) && row.date === '2026-06-30');
  close(result.averageBalance, sum(balances, 'accountBalance') / balances.length);
  for (const row of result.quarterlyBalances) {
    const typedIds = new Set(result.customers.filter(customer => customer.type === row.type).map(customer => customer.id));
    const previous = DATA.snapshots.filter(snapshot => typedIds.has(snapshot.customerId) && snapshot.date === '2026-03-31');
    close(row.previous, sum(previous, 'accountBalance') / previous.length);
    close(row.change, (row.average - row.previous) / row.previous * 100);
  }
  const early = calculate(filters(quarterRange('2025-Q4')));
  assert.ok(early.quarterlyBalances.every(row => row.previous !== null));
});

test('each branch has source-derived account-type averages on a shared comparison scale', () => {
  const all = calculate(filters());
  for (const branch of new Set(DATA.customers.map(row => row.branch))) {
    const result = calculate(filters({ branch }));
    assert.equal(result.balanceAxisMax, all.balanceAxisMax);
    for (const row of result.balances) {
      const ids = new Set(DATA.customers.filter(customer => customer.branch === branch && customer.type === row.type).map(customer => customer.id));
      const source = DATA.snapshots.filter(snapshot => ids.has(snapshot.customerId) && snapshot.date === result.snapshotDate);
      assert.equal(row.accounts, 10);
      close(row.average, sum(source, 'accountBalance') / source.length);
      assert.notEqual(row.average, all.balances.find(balance => balance.type === row.type).average);
      assert.ok(row.average <= result.balanceAxisMax);
    }
  }
  const sandton = calculate(filters({ branch: 'Sandton', accountType: 'Private', ...quarterRange('2026-Q2') }));
  const capeTown = calculate(filters({ branch: 'Cape Town', accountType: 'Private', ...quarterRange('2026-Q2') }));
  assert.equal(sandton.balanceAxisMax, capeTown.balanceAxisMax);
  assert.notEqual(sandton.balances[0].average, capeTown.balances[0].average);
});

test('partial quarters are labeled; windows without snapshots do not fabricate balances', () => {
  const partial = calculate(filters({ start: '2026-04-01', end: '2026-05-15' }));
  assert.equal(partial.snapshotDate, '2026-04-30');
  assert.ok(partial.quarterlyBalances.every(row => row.partial));
  const noSnapshot = calculate(filters({ start: '2026-05-02', end: '2026-05-15' }));
  assert.equal(noSnapshot.snapshotDate, null);
  assert.equal(noSnapshot.averageBalance, null);
  assert.equal(noSnapshot.relationships.length, 0);
  assert.ok(noSnapshot.balances.every(row => row.average === null));
});

test('insurance rates exclude pending; officer averages include all submitted claims', () => {
  const result = calculate(filters({ policy: 'Motor', officer: 'A. Dube' }));
  const source = DATA.claims.filter(row => row.policy === 'Motor' && row.officer === 'A. Dube').map(row => row.decisionDate > DEFAULT_FILTERS.end ? { ...row, status: 'Pending' } : row);
  const approved = source.filter(row => row.status === 'Approved').length;
  const rejected = source.filter(row => row.status === 'Rejected').length;
  const pending = source.filter(row => row.status === 'Pending').length;
  assert.equal(result.policyRows[0].approved, approved);
  assert.equal(result.policyRows[0].rejected, rejected);
  assert.equal(result.policyRows[0].pending, pending);
  close(result.claimRate, approved / (approved + rejected) * 100);
  close(result.officerRows[0].average, sum(source, 'amount') / source.length);
  const all = calculate(filters());
  assert.equal(result.approvedValue, all.approvedValue);
  assert.equal(result.averageBalance, all.averageBalance);
  assert.equal(result.sarCount, all.sarCount);
});

test('SAR overall resolution is not the 24-hour rate; as-of status does not look into future', () => {
  const fixture = {
    customers: [{ id: 'C1', name: 'Test', branch: 'Sandton', type: 'Savings' }],
    loans: [], claims: [], snapshots: [],
    sars: [
      { customerId: 'C1', date: '2026-01-02', resolvedAt: '2026-01-02T06:00:00.000Z', hours: 6 },
      { customerId: 'C1', date: '2026-01-03', resolvedAt: '2026-01-05T00:00:00.000Z', hours: 48 },
      { customerId: 'C1', date: '2026-01-30', resolvedAt: '2026-02-02T00:00:00.000Z', hours: 72 },
      { customerId: 'C1', date: '2026-01-15', resolvedAt: null, hours: 40 }
    ]
  };
  const result = calculate(filters({ start: '2026-01-01', end: '2026-01-31' }), fixture);
  assert.equal(result.sarRows[0].raised, 4);
  assert.equal(result.sarRows[0].resolved, 2);
  assert.equal(result.sarRows[0].rate, 50);
  assert.equal(result.sarRows[0].within24, 25);
  const unresolved = calculate(filters({ start: '2026-01-01', end: '2026-01-31', sarStatus: 'open' }), fixture);
  assert.equal(unresolved.sarCount, 2);
  assert.equal(unresolved.resolvedCount, 0);
});

test('approvals in a different month from submission follow approval date', () => {
  const fixture = {
    customers: [{ id: 'C1', name: 'Test', branch: 'Sandton', type: 'Savings' }], snapshots: [], sars: [], claims: [],
    loans: [{ customerId: 'C1', date: '2025-12-29', approvalDate: '2026-01-04', status: 'Approved', amount: 12345, approvedAmount: 12345 }]
  };
  const result = calculate(filters({ start: '2026-01-01', end: '2026-01-31' }), fixture);
  assert.equal(result.applicationCount, 0);
  assert.equal(result.approvedValue, 12345);
  assert.equal(result.approvalCount, 1);
});

test('all-four relationships are complete, unique and reconcile without insurance cover', () => {
  const result = calculate(filters({ relationship: 'allFour' }));
  assert.ok(result.relationships.length > 0);
  assert.ok(result.relationships.length < DATA.customers.length);
  assert.equal(new Set(result.relationships.map(row => row.id)).size, result.relationships.length);
  result.relationships.forEach(row => {
    assert.equal(row.products.length, 4);
    close(row.combinedValue, Math.round((row.accountBalance + row.loanPrincipal + row.portfolioValue + row.annualPremium) * 100) / 100);
  });
  assert.equal(result.relationshipValue, sum(result.relationships, 'combinedValue'));
  const id = result.relationships[0].id;
  const searched = calculate(filters({ relationship: 'allFour', customerSearch: id.toLowerCase() }));
  assert.equal(searched.relationships.length, 1);
  assert.equal(searched.relationships[0].id, id);
});

test('local filters do not leak into unrelated sections and reset defaults reproduce totals', () => {
  const all = calculate(filters());
  const rejected = calculate(filters({ loanStatus: 'Rejected' }));
  assert.equal(rejected.approvedValue, 0);
  assert.equal(rejected.claimRate, all.claimRate);
  assert.equal(rejected.sarCount, all.sarCount);
  assert.equal(rejected.relationshipValue, all.relationshipValue);
  const searched = calculate(filters({ customerSearch: 'does not exist' }));
  assert.equal(searched.relationships.length, 0);
  assert.equal(searched.claimCount, all.claimCount);
  assert.deepEqual(calculate(filters()), all);
});

test('different flow windows ending at the same date preserve the same stock balances', () => {
  const year = calculate(filters());
  const q3 = calculate(filters(quarterRange('2026-Q3')));
  assert.equal(q3.averageBalance, year.averageBalance);
  assert.equal(q3.relationshipValue, year.relationshipValue);
  assert.notEqual(q3.approvedValue, year.approvedValue);
});

test('loan and claim decisions after the reporting cutoff are pending, not approved', () => {
  const fixture = {
    customers: [{ id: 'C1', name: 'Test', branch: 'Sandton', type: 'Savings' }], snapshots: [], sars: [],
    loans: [{ customerId: 'C1', date: '2026-01-28', decisionDate: '2026-02-03', approvalDate: '2026-02-03', status: 'Approved', amount: 10000, approvedAmount: 10000 }],
    claims: [{ customerId: 'C1', date: '2026-01-28', decisionDate: '2026-02-04', status: 'Approved', policy: 'Motor', officer: 'A. Dube', amount: 5000 }]
  };
  const result = calculate(filters({ start: '2026-01-01', end: '2026-01-31', loanStatus: 'Pending' }), fixture);
  assert.equal(result.applicationCount, 1);
  assert.equal(result.monthlyLoans[0].pendingApplications, 1);
  assert.equal(result.monthlyLoans[0].requestedAmount, 10000);
  assert.equal(result.approvedValue, 0);
  assert.equal(result.pendingClaims, 1);
  assert.equal(result.claimRate, null);
  assert.equal(result.policyRows[0].approved, 0);
});

test('empty cohorts have N/A rates and averages, not false zero-percent results', () => {
  const result = calculate(filters(), { customers: [], loans: [], claims: [], sars: [], snapshots: [] });
  assert.equal(result.claimRate, null);
  assert.equal(result.averageBalance, null);
  assert.ok(result.policyRows.every(row => row.rate === null));
  assert.ok(result.sarRows.every(row => row.rate === null));
  assert.ok(result.officerRows.every(row => row.average === null));
});

test('invalid ranges are explicitly rejected and quarter boundaries span years correctly', () => {
  for (const overrides of [
    { start: '2026-08-01', end: '2026-07-01' },
    { start: '' }, { end: '2026-02-30' }, { start: '2025-09-30' }, { end: '2026-10-01' }
  ]) {
    assert.ok(validateFilters(filters(overrides)));
    assert.throws(() => calculate(filters(overrides)));
  }
  assert.equal(previousQuarterEnd('2026-01-31'), '2025-12-31');
  assert.deepEqual(quarterRange('2025-Q4'), { start: '2025-10-01', end: '2025-12-31' });
});

test('exports include every matching customer and both insurance aggregate views', () => {
  const result = calculate(filters());
  assert.ok(result.relationships.length > 15);
  const rows = exportRows('relationships', result);
  assert.equal(rows.length, result.relationships.length + 1);
  assert.equal(rows[1][11], result.relationships[0].combinedValue);
  assert.equal(exportRows('claims', result).length, 1 + result.policyRows.length + result.officerRows.length);
  assert.equal(exportRows('loans', result).length, 1 + result.monthlyLoans.length + result.branches.length);
  assert.ok(csvString([['a,b', '"quoted"', '=FORMULA', -2, null]]).includes('"a,b","""quoted""","\'=FORMULA","-2","N/A"'));
});

test('all 32 branch/type combinations reconcile and produce valid filtered customer joins', () => {
  for (const branch of new Set(DATA.customers.map(row => row.branch))) {
    for (const accountType of new Set(DATA.customers.map(row => row.type))) {
      const result = calculate(filters({ branch, accountType }));
      assert.equal(result.customers.length, 10);
      assert.equal(result.accountCount, 10);
      assert.equal(sum(result.monthlyLoans, 'approvedAmount'), result.approvedValue);
      assert.ok(result.relationships.every(row => row.branch === branch && row.type === accountType));
      const ids = new Set(result.customers.map(row => row.id));
      const source = DATA.loans.filter(row => ids.has(row.customerId) && row.approvalDate >= DEFAULT_FILTERS.start && row.approvalDate <= DEFAULT_FILTERS.end);
      assert.equal(sum(source, 'approvedAmount'), result.approvedValue);
    }
  }
});
