/**
 * Full End-to-End Test Suite for Person 2's Dashboard and Transaction System.
 *
 * Comprehensive Lifecycle Flow:
 * 1. Login / Authentication & Dashboard Initialization
 * 2. Multi-Customer Setup (Customer A: Rohit Sharma, Customer B: Priya Singh, Customer C: Amit Verma)
 * 3. Add Transaction for Customer A (Credit Given ₹15,000) -> Verify appear in history & Financial update
 * 4. Add Transaction for Customer B (Payment Received ₹6,000) -> Verify appear in history & Balance update
 * 5. Verify Global Transaction History contains transactions from ALL customers
 * 6. Search functionality (by customer name and note)
 * 7. Filter functionality (by CREDIT and DEBIT types)
 * 8. Pagination across multiple pages
 * 9. Edit Transaction (Update Customer A amount to ₹18,000) -> Verify Financial update
 * 10. Delete Transaction (Soft-delete Customer B payment) -> Verify Financial update & 404 exclusion
 * 11. Download Invoice (Generate PDF, HTML, JSON invoice)
 */

import { GET as listTransactions, POST as createTransaction } from '../src/app/api/transactions/route';
import { GET as getTransactionById, PUT as updateTransaction, DELETE as deleteTransaction } from '../src/app/api/transactions/[id]/route';
import { GET as getSummary } from '../src/app/api/transactions/summary/route';
import { GET as getInvoice } from '../src/app/api/transactions/[id]/invoice/route';
import { GET as listCustomers, POST as createCustomer } from '../src/app/api/customers/route';
import { CustomerService } from '../src/lib/services/customerService';
import { TransactionService } from '../src/lib/services/transactionService';
import { NextRequest } from 'next/server';

interface TestItem {
  id: string;
  ledgerId: string;
  type: string;
  amount: number;
  note?: string;
  ledger?: { id: string; title: string };
}

let passed = 0;
let failed = 0;
const failures: {
  step: string;
  reproduction: string;
  expected: string;
  actual: string;
  file: string;
  severity: string;
}[] = [];

function assert(condition: boolean, message: string, meta?: { step: string; expected: string; actual: string; file: string; severity: string }) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
    if (meta) {
      failures.push({
        step: meta.step,
        reproduction: message,
        expected: meta.expected,
        actual: meta.actual,
        file: meta.file,
        severity: meta.severity,
      });
    }
  }
}

async function runE2ETests() {
  console.log('======================================================================');
  console.log('🚀 Running Person 2 Full E2E Dashboard & Transaction Lifecycle Tests');
  console.log('======================================================================\n');

  // Reset stores to clean state
  TransactionService.resetStore();
  CustomerService.resetStore();

  const shopkeeperId = 'default-shopkeeper-id';

  // --------------------------------------------------------------------------
  // STEP 1: Login & Initial Dashboard State
  // --------------------------------------------------------------------------
  console.log('--- STEP 1: Login & Initial Dashboard State ---');
  {
    const summaryRes = await getSummary(
      new NextRequest('http://localhost:3000/api/transactions/summary', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    assert(summaryRes.status === 200, 'Dashboard summary accessible with authentication', {
      step: 'Login & Init',
      expected: 'Status 200 OK',
      actual: `Status ${summaryRes.status}`,
      file: 'src/app/api/transactions/summary/route.ts',
      severity: 'CRITICAL',
    });

    const summaryJson = await summaryRes.json();
    assert(summaryJson.success === true, 'Dashboard summary envelope has success: true');
    assert(typeof summaryJson.data.balance === 'number', 'Summary balance is numeric');
    assert(typeof summaryJson.data.creditGiven === 'number', 'Summary creditGiven is numeric');
  }

  // --------------------------------------------------------------------------
  // STEP 2: Multi-Customer Existence & Creation
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 2: Multi-Customer Setup ---');
  let customerAId = '';
  let customerBId = '';
  let customerCId = '';

  {
    // Customer A: Rohit Sharma
    const resA = await createCustomer(
      new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': shopkeeperId },
        body: JSON.stringify({
          name: 'Rohit Sharma',
          phone: '9811223344',
          initialBalance: 0,
        }),
      })
    );
    const jsonA = await resA.json();
    customerAId = jsonA.data.id;

    // Customer B: Priya Singh
    const resB = await createCustomer(
      new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': shopkeeperId },
        body: JSON.stringify({
          name: 'Priya Singh',
          phone: '9822334455',
          initialBalance: 0,
        }),
      })
    );
    const jsonB = await resB.json();
    customerBId = jsonB.data.id;

    // Customer C: Amit Verma
    const resC = await createCustomer(
      new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': shopkeeperId },
        body: JSON.stringify({
          name: 'Amit Verma',
          phone: '9833445566',
          initialBalance: 0,
        }),
      })
    );
    const jsonC = await resC.json();
    customerCId = jsonC.data.id;

    assert(Boolean(customerAId && customerBId && customerCId), 'Successfully verified/created 3 distinct customers (Rohit, Priya, Amit)');

    // Verify all 3 appear in GET /api/customers
    const custListRes = await listCustomers(
      new NextRequest('http://localhost:3000/api/customers', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const custListJson = await custListRes.json();
    const customerNames = custListJson.data.map((c: { name: string }) => c.name);
    assert(
      customerNames.includes('Rohit Sharma') &&
      customerNames.includes('Priya Singh') &&
      customerNames.includes('Amit Verma'),
      'All 3 customers exist in Customer directory'
    );
  }

  // --------------------------------------------------------------------------
  // STEP 3: Add Transaction for Customer A (Credit Given ₹15,000)
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 3: Add Transaction for Customer A (Credit Given ₹15,000) ---');
  let txAId = '';
  let initialBalance = 0;
  let initialCreditGiven = 0;

  {
    const summaryBefore = await (await getSummary(new NextRequest('http://localhost:3000/api/transactions/summary', { headers: { 'x-user-id': shopkeeperId } }))).json();
    initialBalance = summaryBefore.data.balance;
    initialCreditGiven = summaryBefore.data.creditGiven;

    const createTxRes = await createTransaction(
      new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': shopkeeperId },
        body: JSON.stringify({
          customerId: customerAId,
          type: 'CREDIT_GIVEN',
          amount: 15000,
          paymentMethod: 'Cash',
          note: 'Bulk electronics order #A101',
        }),
      })
    );
    assert(createTxRes.status === 201, 'POST /api/transactions returns 201 Created for Customer A');
    const txAJson = await createTxRes.json();
    txAId = txAJson.data.id;

    // Verify transaction appears in list
    const listRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?limit=20', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const listJson = await listRes.json();
    const createdTx = listJson.data.find((t: TestItem) => t.id === txAId);
    assert(Boolean(createdTx), 'Customer A transaction appears in Global Transaction History');
    assert(createdTx?.ledger?.title === 'Rohit Sharma', 'Transaction accurately associates Customer A (Rohit Sharma)');

    // Verify Dashboard financial values update
    const summaryAfter = await (await getSummary(new NextRequest('http://localhost:3000/api/transactions/summary', { headers: { 'x-user-id': shopkeeperId } }))).json();
    assert(summaryAfter.data.creditGiven === initialCreditGiven + 15000, `Dashboard Credit Given updated (+₹15,000 -> ₹${summaryAfter.data.creditGiven})`);
    assert(summaryAfter.data.balance === initialBalance + 15000, `Dashboard Balance updated (+₹15,000 -> ₹${summaryAfter.data.balance})`);
  }

  // --------------------------------------------------------------------------
  // STEP 4: Add Transaction for Customer B (Payment Received ₹6,000)
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 4: Add Transaction for Customer B (Payment Received ₹6,000) ---');
  let txBId = '';

  {
    const summaryBefore = await (await getSummary(new NextRequest('http://localhost:3000/api/transactions/summary', { headers: { 'x-user-id': shopkeeperId } }))).json();

    const createTxRes = await createTransaction(
      new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': shopkeeperId },
        body: JSON.stringify({
          customerId: customerBId,
          type: 'PAYMENT_RECEIVED',
          amount: 6000,
          paymentMethod: 'UPI',
          note: 'UPI Payment received via GPay',
        }),
      })
    );
    assert(createTxRes.status === 201, 'POST /api/transactions returns 201 Created for Customer B');
    const txBJson = await createTxRes.json();
    txBId = txBJson.data.id;

    // Verify Dashboard financial values update: Balance decreases by ₹6,000
    const summaryAfter = await (await getSummary(new NextRequest('http://localhost:3000/api/transactions/summary', { headers: { 'x-user-id': shopkeeperId } }))).json();
    assert(summaryAfter.data.totalPaid === summaryBefore.data.totalPaid + 6000, `Total Paid updated (+₹6,000 -> ₹${summaryAfter.data.totalPaid})`);
    assert(summaryAfter.data.balance === summaryBefore.data.balance - 6000, `Dashboard Balance updated (-₹6,000 -> ₹${summaryAfter.data.balance})`);
  }

  // --------------------------------------------------------------------------
  // STEP 5: Global Transaction History Multi-Customer Verification
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 5: Verify Global Transaction History Contains ALL Customers ---');
  {
    // Also add a third transaction for Customer C (Amit Verma)
    const txCRes = await createTransaction(
      new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': shopkeeperId },
        body: JSON.stringify({
          customerId: customerCId,
          type: 'CREDIT_GIVEN',
          amount: 2500,
          paymentMethod: 'Bank Transfer',
          note: 'Stationery invoice #C303',
        }),
      })
    );
    assert(txCRes.status === 201, 'Added transaction for Customer C (Amit Verma)');

    // Query global transaction stream
    const listRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?limit=50', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const listJson = await listRes.json();
    const customerNamesInHistory = new Set(listJson.data.map((t: TestItem) => t.ledger?.title));

    assert(customerNamesInHistory.has('Rohit Sharma'), 'Global history contains transactions from Customer A (Rohit Sharma)');
    assert(customerNamesInHistory.has('Priya Singh'), 'Global history contains transactions from Customer B (Priya Singh)');
    assert(customerNamesInHistory.has('Amit Verma'), 'Global history contains transactions from Customer C (Amit Verma)');
  }

  // --------------------------------------------------------------------------
  // STEP 6: Search Functionality
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 6: Search Functionality ---');
  {
    // Search by customer name "Rohit"
    const searchRohitRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?search=Rohit', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const rohitJson = await searchRohitRes.json();
    assert(rohitJson.data.length > 0, 'Search for "Rohit" returns matching records');
    assert(rohitJson.data.every((t: TestItem) => t.ledger?.title?.includes('Rohit') || t.note?.includes('Rohit')), 'All returned items match search term "Rohit"');

    // Search by note text "GPay"
    const searchGPayRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?search=GPay', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const gpayJson = await searchGPayRes.json();
    assert(gpayJson.data.length > 0, 'Search for note text "GPay" returns matching records');
    assert(gpayJson.data.some((t: TestItem) => t.id === txBId), 'Search returned Customer B transaction by note');
  }

  // --------------------------------------------------------------------------
  // STEP 7: Filtering Functionality
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 7: Filtering Functionality ---');
  {
    // Filter by CREDIT
    const creditFilterRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?type=CREDIT', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const creditJson = await creditFilterRes.json();
    assert(creditJson.data.every((t: TestItem) => t.type === 'CREDIT'), 'Filter by type=CREDIT only returns CREDIT records');

    // Filter by DEBIT
    const debitFilterRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?type=DEBIT', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const debitJson = await debitFilterRes.json();
    assert(debitJson.data.every((t: TestItem) => t.type === 'DEBIT'), 'Filter by type=DEBIT only returns DEBIT records');

    // Filter by Payment Method "UPI"
    const upiFilterRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?paymentMethod=UPI', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const upiJson = await upiFilterRes.json();
    assert(upiJson.data.every((t: TestItem) => t.paymentMethod === 'UPI'), 'Filter by paymentMethod=UPI only returns UPI records');
  }

  // --------------------------------------------------------------------------
  // STEP 8: Pagination Functionality
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 8: Pagination Functionality ---');
  {
    const page1Res = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?page=1&limit=2', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const page1Json = await page1Res.json();
    assert(page1Json.data.length <= 2, 'Page 1 returns max 2 items');
    assert(page1Json.pagination.page === 1, 'Pagination meta page is 1');
    assert(page1Json.pagination.totalPages >= 2, 'Pagination meta indicates multiple pages');

    const page2Res = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?page=2&limit=2', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const page2Json = await page2Res.json();
    assert(page2Json.pagination.page === 2, 'Pagination meta page is 2');
    assert(page1Json.data[0].id !== page2Json.data[0]?.id, 'Page 1 and Page 2 contain non-overlapping items');
  }

  // --------------------------------------------------------------------------
  // STEP 9: Edit Transaction & Financial Values Update
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 9: Edit Transaction & Financial Update ---');
  {
    const summaryBefore = await (await getSummary(new NextRequest('http://localhost:3000/api/transactions/summary', { headers: { 'x-user-id': shopkeeperId } }))).json();

    // Edit Customer A's credit transaction from ₹15,000 to ₹18,000 (+₹3,000)
    const updateRes = await updateTransaction(
      new NextRequest(`http://localhost:3000/api/transactions/${txAId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': shopkeeperId },
        body: JSON.stringify({
          amount: 18000,
          note: 'Updated bulk electronics order #A101 (revised price)',
        }),
      }),
      { params: Promise.resolve({ id: txAId }) }
    );
    assert(updateRes.status === 200, 'PUT /api/transactions/:id returns 200 OK');
    const updateJson = await updateRes.json();
    assert(updateJson.data.amount === 18000, 'Transaction amount updated to 18,000');

    // Verify Dashboard Financial values recalculated
    const summaryAfter = await (await getSummary(new NextRequest('http://localhost:3000/api/transactions/summary', { headers: { 'x-user-id': shopkeeperId } }))).json();
    assert(summaryAfter.data.creditGiven === summaryBefore.data.creditGiven + 3000, `Credit Given increased by ₹3,000 -> ₹${summaryAfter.data.creditGiven}`);
    assert(summaryAfter.data.balance === summaryBefore.data.balance + 3000, `Balance increased by ₹3,000 -> ₹${summaryAfter.data.balance}`);
  }

  // --------------------------------------------------------------------------
  // STEP 10: Delete Transaction & Financial Values Update
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 10: Delete Transaction & Financial Update ---');
  {
    const summaryBefore = await (await getSummary(new NextRequest('http://localhost:3000/api/transactions/summary', { headers: { 'x-user-id': shopkeeperId } }))).json();

    // Soft delete Customer B's payment transaction (₹6,000)
    const deleteRes = await deleteTransaction(
      new NextRequest(`http://localhost:3000/api/transactions/${txBId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': shopkeeperId },
      }),
      { params: Promise.resolve({ id: txBId }) }
    );
    assert(deleteRes.status === 200, 'DELETE /api/transactions/:id returns 200 OK');

    // Verify transaction disappeared from history
    const listRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?limit=50', {
        headers: { 'x-user-id': shopkeeperId },
      })
    );
    const listJson = await listRes.json();
    const ids = listJson.data.map((t: TestItem) => t.id);
    assert(!ids.includes(txBId), 'Deleted transaction is removed from Global Transaction History');

    // Verify single-item fetch returns 404
    const getDeletedRes = await getTransactionById(
      new NextRequest(`http://localhost:3000/api/transactions/${txBId}`, {
        headers: { 'x-user-id': shopkeeperId },
      }),
      { params: Promise.resolve({ id: txBId }) }
    );
    assert(getDeletedRes.status === 404, 'Direct fetch for deleted transaction returns 404 Not Found');

    // Verify Dashboard Financial values recalculated (Total Paid reduced by ₹6,000, Balance increased by ₹6,000)
    const summaryAfter = await (await getSummary(new NextRequest('http://localhost:3000/api/transactions/summary', { headers: { 'x-user-id': shopkeeperId } }))).json();
    assert(summaryAfter.data.totalPaid === summaryBefore.data.totalPaid - 6000, `Total Paid decreased by ₹6,000 -> ₹${summaryAfter.data.totalPaid}`);
    assert(summaryAfter.data.balance === summaryBefore.data.balance + 6000, `Balance increased by ₹6,000 -> ₹${summaryAfter.data.balance}`);
  }

  // --------------------------------------------------------------------------
  // STEP 11: Download Invoice
  // --------------------------------------------------------------------------
  console.log('\n--- STEP 11: Download Invoice ---');
  {
    // PDF format
    const invoicePdfRes = await getInvoice(
      new NextRequest(`http://localhost:3000/api/transactions/${txAId}/invoice`, {
        headers: { 'x-user-id': shopkeeperId },
      }),
      { params: Promise.resolve({ id: txAId }) }
    );
    assert(invoicePdfRes.status === 200, 'GET /api/transactions/:id/invoice returns 200 OK');
    assert(invoicePdfRes.headers.get('content-type') === 'application/pdf', 'Invoice Content-Type is application/pdf');

    const arrayBuf = await invoicePdfRes.arrayBuffer();
    const pdfBuf = Buffer.from(arrayBuf);
    assert(pdfBuf.toString('latin1').startsWith('%PDF-1.4'), 'Generated Invoice is valid PDF-1.4 binary');
    assert(pdfBuf.toString('latin1').includes('18,000.00'), 'Invoice PDF reflects edited amount (₹18,000.00)');

    // JSON format
    const invoiceJsonRes = await getInvoice(
      new NextRequest(`http://localhost:3000/api/transactions/${txAId}/invoice?format=json`, {
        headers: { 'x-user-id': shopkeeperId },
      }),
      { params: Promise.resolve({ id: txAId }) }
    );
    const invoiceJson = await invoiceJsonRes.json();
    assert(invoiceJson.data.customerName === 'Rohit Sharma', 'Invoice metadata customerName is Rohit Sharma');
    assert(invoiceJson.data.amount === 18000, 'Invoice metadata amount is 18000');
  }

  console.log('\n======================================================================');
  console.log(`📊 E2E Lifecycle Summary: ${passed} passed, ${failed} failed`);
  console.log('======================================================================');

  if (failed > 0) {
    console.error(`\n🚨 Identified ${failures.length} Failures:`);
    failures.forEach((f, idx) => {
      console.error(`\nFailure #${idx + 1}: [${f.severity}] ${f.step}`);
      console.error(`  Reproduction: ${f.reproduction}`);
      console.error(`  Expected: ${f.expected}`);
      console.error(`  Actual: ${f.actual}`);
      console.error(`  File: ${f.file}`);
    });
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
