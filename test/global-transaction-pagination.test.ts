/**
 * Comprehensive Test Suite for Person 2's Global Transaction History:
 * - Search: customer name, transaction note/text
 * - Filter: transaction type (CREDIT_GIVEN / PAYMENT_RECEIVED), payment method
 * - Clear filters: reset to all transactions
 * - Backend Pagination: page 1 vs page 2, limit, total, totalPages, distinct records
 * - Page Invalidation: out-of-bounds page requests
 * - No results handling: empty array, total 0
 * - Error handling
 */

import { GET, POST } from '../src/app/api/transactions/route';
import { CustomerService } from '../src/lib/services/customerService';
import { TransactionService } from '../src/lib/services/transactionService';
import { NextRequest } from 'next/server';

interface TestTx {
  id: string;
  type: string;
  amount: number;
  note?: string;
  paymentMethod?: string;
  ledger?: {
    title: string;
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('🚀 Running Person 2 Global Transaction History & Pagination Tests');
  console.log('===============================================================\n');

  // Reset store
  TransactionService.resetStore();
  CustomerService.resetStore();

  // Create 3 distinct customers
  const customer1 = await CustomerService.create({
    name: 'Deepak Verma',
    phone: '9810112233',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  const customer2 = await CustomerService.create({
    name: 'Pooja Hegde',
    phone: '9820223344',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  const customer3 = await CustomerService.create({
    name: 'Rohan Joshi',
    phone: '9830334455',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  // Seed 5 transactions across the 3 customers
  const txSeeds = [
    { customerId: customer1.id, type: 'CREDIT_GIVEN', amount: 3000, date: '2026-09-01T10:00:00Z', paymentMethod: 'Cash', description: 'Grocery items batch A' },
    { customerId: customer2.id, type: 'PAYMENT_RECEIVED', amount: 1500, date: '2026-09-02T11:00:00Z', paymentMethod: 'UPI', description: 'UPI transfer invoice #102' },
    { customerId: customer3.id, type: 'CREDIT_GIVEN', amount: 7500, date: '2026-09-03T12:00:00Z', paymentMethod: 'Bank Transfer', description: 'Electronics purchase note' },
    { customerId: customer1.id, type: 'PAYMENT_RECEIVED', amount: 1000, date: '2026-09-04T13:00:00Z', paymentMethod: 'Cash', description: 'Partial settlement cash' },
    { customerId: customer2.id, type: 'CREDIT_GIVEN', amount: 4500, date: '2026-09-05T14:00:00Z', paymentMethod: 'UPI', description: 'Apparel wholesale batch' },
  ];

  for (const seed of txSeeds) {
    const res = await POST(
      new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
        body: JSON.stringify(seed),
      })
    );
    assert(res.status === 201, `Seeded transaction: ${seed.description}`);
  }

  // --- 1. SEARCH TESTS ---
  console.log('\n--- 1. Search Tests ---');
  {
    // Search by customer name "Pooja"
    const req = new NextRequest('http://localhost:3000/api/transactions?search=Pooja', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await GET(req);
    const json = await res.json();
    assert(res.status === 200, 'Search by customer name returns 200 OK');
    assert(json.data.length === 2, 'Found exactly 2 transactions for customer Pooja');
    assert(
      json.data.every((tx: TestTx) => (tx.ledger?.title || '').toLowerCase().includes('pooja')),
      'All returned transactions belong to Pooja'
    );

    // Search by note/text "wholesale"
    const reqText = new NextRequest('http://localhost:3000/api/transactions?search=wholesale', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resText = await GET(reqText);
    const jsonText = await resText.json();
    assert(jsonText.data.length === 1, 'Search by note "wholesale" returns 1 match');
    assert(jsonText.data[0].note.includes('wholesale'), 'Matched record contains note "wholesale"');

    // Case-insensitive search
    const reqCase = new NextRequest('http://localhost:3000/api/transactions?search=GROCERY', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resCase = await GET(reqCase);
    const jsonCase = await resCase.json();
    assert(jsonCase.data.length === 1, 'Case-insensitive search for "GROCERY" returns matching record');
  }

  // --- 2. FILTER TESTS ---
  console.log('\n--- 2. Filter Tests ---');
  {
    // Filter by CREDIT_GIVEN
    const reqCredit = new NextRequest('http://localhost:3000/api/transactions?type=CREDIT_GIVEN&limit=50', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resCredit = await GET(reqCredit);
    const jsonCredit = await resCredit.json();
    assert(jsonCredit.data.length >= 3, 'Filter CREDIT_GIVEN returns at least 3 credit transactions');
    assert(jsonCredit.data.every((tx: TestTx) => tx.type === 'CREDIT'), 'All returned records are CREDIT');

    // Filter by PAYMENT_RECEIVED
    const reqDebit = new NextRequest('http://localhost:3000/api/transactions?type=PAYMENT_RECEIVED&limit=50', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resDebit = await GET(reqDebit);
    const jsonDebit = await resDebit.json();
    assert(jsonDebit.data.length >= 2, 'Filter PAYMENT_RECEIVED returns at least 2 payment transactions');
    assert(jsonDebit.data.every((tx: TestTx) => tx.type === 'DEBIT'), 'All returned records are DEBIT');

    // Filter by paymentMethod UPI
    const reqUPI = new NextRequest('http://localhost:3000/api/transactions?paymentMethod=UPI&limit=50', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resUPI = await GET(reqUPI);
    const jsonUPI = await resUPI.json();
    assert(jsonUPI.data.length >= 2, 'Filter paymentMethod=UPI returns at least 2 UPI records');
    assert(jsonUPI.data.every((tx: TestTx) => tx.paymentMethod === 'UPI'), 'All returned records have paymentMethod UPI');

    // Combined Search + Filter
    const reqCombined = new NextRequest('http://localhost:3000/api/transactions?search=Pooja&type=CREDIT', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resCombined = await GET(reqCombined);
    const jsonCombined = await resCombined.json();
    assert(jsonCombined.data.length === 1, 'Combined search (Pooja) and filter (CREDIT) returns 1 match');
    assert(jsonCombined.data[0].amount === 4500, 'Matched transaction amount is 4500');
  }

  // --- 3. CLEAR FILTER / DEFAULT RESET ---
  console.log('\n--- 3. Clear Filters Test ---');
  {
    const reqAll = new NextRequest('http://localhost:3000/api/transactions?limit=20', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resAll = await GET(reqAll);
    const jsonAll = await resAll.json();
    assert(jsonAll.data.length >= 5, 'Clearing search and filter returns all transactions');
  }

  // --- 4. BACKEND PAGINATION TESTS ---
  console.log('\n--- 4. Backend Pagination Tests ---');
  {
    // Page 1 with limit 2
    const reqP1 = new NextRequest('http://localhost:3000/api/transactions?page=1&limit=2&sortBy=date&sortOrder=desc', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resP1 = await GET(reqP1);
    const jsonP1 = await resP1.json();
    assert(jsonP1.data.length === 2, 'Page 1 returns exactly limit=2 transactions');
    assert(jsonP1.pagination.page === 1, 'Pagination meta: page is 1');
    assert(jsonP1.pagination.limit === 2, 'Pagination meta: limit is 2');
    assert(jsonP1.pagination.total >= 5, 'Pagination meta: total >= 5');
    assert(jsonP1.pagination.totalPages === Math.ceil(jsonP1.pagination.total / 2), 'Pagination meta: totalPages computed accurately');

    // Page 2 with limit 2
    const reqP2 = new NextRequest('http://localhost:3000/api/transactions?page=2&limit=2&sortBy=date&sortOrder=desc', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resP2 = await GET(reqP2);
    const jsonP2 = await resP2.json();
    assert(jsonP2.data.length === 2, 'Page 2 returns next 2 transactions');
    assert(jsonP2.pagination.page === 2, 'Pagination meta: page is 2');

    // Verify distinct data across pages (no duplicate IDs)
    const p1Ids = jsonP1.data.map((t: TestTx) => t.id);
    const p2Ids = jsonP2.data.map((t: TestTx) => t.id);
    const overlap = p1Ids.some((id: string) => p2Ids.includes(id));
    assert(!overlap, 'Page 1 and Page 2 contain mutually distinct records (no duplicate frontend slicing)');
  }

  // --- 5. PAGE INVALIDATION / OUT OF BOUNDS ---
  console.log('\n--- 5. Page Out of Bounds Tests ---');
  {
    // Requesting page 999
    const reqOOB = new NextRequest('http://localhost:3000/api/transactions?page=999&limit=10', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resOOB = await GET(reqOOB);
    const jsonOOB = await resOOB.json();
    assert(resOOB.status === 200, 'Out-of-bounds page returns 200 OK');
    assert(jsonOOB.data.length === 0, 'Out-of-bounds page returns empty data array');
    assert(jsonOOB.pagination.page === 999, 'Pagination metadata preserved');
  }

  // --- 6. NO RESULTS HANDLING ---
  console.log('\n--- 6. No Results Handling Tests ---');
  {
    // Search for non-existent text
    const reqNoMatch = new NextRequest('http://localhost:3000/api/transactions?search=NonExistentQueryXYZ123', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resNoMatch = await GET(reqNoMatch);
    const jsonNoMatch = await resNoMatch.json();
    assert(resNoMatch.status === 200, 'Non-matching search returns 200 OK');
    assert(jsonNoMatch.data.length === 0, 'Non-matching search returns empty array');
    assert(jsonNoMatch.pagination.total === 0, 'Total count is 0');
    assert(jsonNoMatch.pagination.totalPages === 1 || jsonNoMatch.pagination.totalPages === 0, 'Total pages is 1 or 0');
  }

  // --- 7. API ERROR HANDLING ---
  console.log('\n--- 7. API Error Handling Tests ---');
  {
    // Unauthorized access
    const reqUnauth = new NextRequest('http://localhost:3000/api/transactions', {
      headers: { 'x-unauthenticated': 'true' },
    });
    const resUnauth = await GET(reqUnauth);
    assert(resUnauth.status === 401, 'Unauthenticated request returns 401 Unauthorized');
    const jsonUnauth = await resUnauth.json();
    assert(jsonUnauth.success === false, 'Error envelope success is false');
    assert(jsonUnauth.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
  }

  console.log('\n===============================================================');
  console.log(`📊 Global Transaction History & Pagination Summary: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
