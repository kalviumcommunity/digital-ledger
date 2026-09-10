import { POST, GET as listTransactions } from '../src/app/api/transactions/route';
import { GET as getTransactionById, PUT as updateTransaction, DELETE as deleteTransaction } from '../src/app/api/transactions/[id]/route';
import { NextRequest } from 'next/server';
import { TransactionService } from '../src/lib/services/transactionService';

function createMockRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  const req = new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return new NextRequest(req);
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, extraInfo?: unknown) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${testName}`, extraInfo ?? '');
    testsFailed++;
  }
}

interface TestTxItem {
  id: string;
  type: string;
  amount: number;
  paymentMethod: string;
  note: string | null;
  ledger: {
    id: string;
    title: string;
  };
}

async function runTests() {
  console.log('========================================');
  console.log('🚀 Running Person 2 Transaction API Tests');
  console.log('========================================\n');

  TransactionService.resetStore();

  let createdTxId = '';

  // ─── 1. TEST POST /api/transactions ──────────────────────────────────────────

  console.log('--- 1. POST /api/transactions ---');

  // 1.1 Valid Creation (CREDIT)
  {
    const req = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: '6',
      type: 'CREDIT',
      amount: 17591.69,
      date: '2026-08-12T16:15:00.000Z',
      paymentMethod: 'UPI',
      note: 'Goods purchased test',
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 201, 'POST /api/transactions returns 201 Created', json);
    assert(json.success === true, 'POST response envelope success === true');
    assert(json.data.amount === 17591.69, 'POST created transaction amount matches');
    assert(json.data.paymentMethod === 'UPI', 'POST created transaction paymentMethod matches');
    assert(json.data.type === 'CREDIT', 'POST created transaction type matches');
    assert(json.data.isDeleted === false, 'POST created transaction isDeleted is false');
    createdTxId = json.data.id;
  }

  // 1.2 Valid Creation (PAYMENT_RECEIVED / DEBIT mapping)
  {
    const req = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: '7',
      type: 'PAYMENT_RECEIVED',
      amount: 5000,
      paymentMethod: 'Cash',
      note: 'Cash payment test',
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 201, 'POST handles PAYMENT_RECEIVED alias as DEBIT', json);
    assert(json.data.type === 'DEBIT', 'Type mapped to DEBIT');
  }

  // 1.3 Test Invalid Customer (non-existent customer)
  {
    const req = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: 'non-existent-customer-999',
      type: 'CREDIT',
      amount: 100,
      paymentMethod: 'Cash',
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 400, 'POST with non-existent customer returns 400 Bad Request', json);
    assert(json.success === false, 'Error envelope success === false');
    assert(json.error.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');
    assert(json.error.details.some((d: { field: string }) => d.field === 'ledgerId'), 'Details include ledgerId error');
  }

  // 1.4 Test Unauthorized Access (customer belongs to another shopkeeper)
  {
    const req = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: 'other-user-customer-99',
      type: 'CREDIT',
      amount: 100,
      paymentMethod: 'Cash',
    }, {
      'x-shopkeeper-id': 'default-shopkeeper-id',
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 403, 'POST to another shopkeeper customer returns 403 Forbidden', json);
    assert(json.error.code === 'FORBIDDEN', 'Error code is FORBIDDEN');
  }

  // 1.5 Test Missing / Invalid Authentication
  {
    const req = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: '6',
      type: 'CREDIT',
      amount: 100,
      paymentMethod: 'Cash',
    }, {
      'x-unauthenticated': 'true',
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 401, 'POST without valid auth returns 401 Unauthorized', json);
    assert(json.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
  }

  // 1.6 Test Invalid Amount (<= 0, negative, NaN)
  {
    const reqNegative = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: '6',
      type: 'CREDIT',
      amount: -50,
      paymentMethod: 'Cash',
    });
    const res = await POST(reqNegative);
    const json = await res.json();
    assert(res.status === 400, 'POST with negative amount returns 400 Bad Request');
    assert(json.error.details.some((d: { field: string }) => d.field === 'amount'), 'Amount validation error reported');

    const reqZero = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: '6',
      type: 'CREDIT',
      amount: 0,
      paymentMethod: 'Cash',
    });
    const resZero = await POST(reqZero);
    assert(resZero.status === 400, 'POST with zero amount returns 400 Bad Request');
  }

  // 1.7 Test Invalid Transaction Type
  {
    const req = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: '6',
      type: 'INVALID_TYPE',
      amount: 100,
      paymentMethod: 'Cash',
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 400, 'POST with invalid type returns 400 Bad Request');
    assert(json.error.details.some((d: { field: string }) => d.field === 'type'), 'Type validation error reported');
  }

  // 1.8 Test Invalid Payment Method
  {
    const req = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: '6',
      type: 'CREDIT',
      amount: 100,
      paymentMethod: 'Crypto',
    });
    const res = await POST(req);
    const json = await res.json();
    assert(res.status === 400, 'POST with invalid paymentMethod returns 400 Bad Request');
    assert(json.error.details.some((d: { field: string }) => d.field === 'paymentMethod'), 'Payment method validation error reported');
  }

  // ─── 2. TEST GET /api/transactions ───────────────────────────────────────────

  console.log('\n--- 2. GET /api/transactions ---');

  // 2.1 Pagination (page=1, limit=5)
  {
    const req = createMockRequest('http://localhost:3000/api/transactions?page=1&limit=5', 'GET');
    const res = await listTransactions(req);
    const json = await res.json();
    assert(res.status === 200, 'GET /api/transactions returns 200 OK', json);
    assert(Array.isArray(json.data), 'Returns data array');
    assert(json.data.length <= 5, 'Paginated data length <= limit');
    assert(json.pagination.page === 1, 'Pagination page is 1');
    assert(json.pagination.limit === 5, 'Pagination limit is 5');
    assert(json.pagination.total > 0, 'Pagination total count is > 0');
    assert(json.data[0].ledger !== undefined, 'Transaction includes ledger relation object');
  }

  // 2.2 Search by customer name
  {
    const req = createMockRequest('http://localhost:3000/api/transactions?search=Juhi', 'GET');
    const res = await listTransactions(req);
    const json = await res.json();
    assert(res.status === 200, 'Search by customer name returns 200 OK');
    assert(json.data.length > 0, 'Found results for "Juhi"');
    assert(json.data.every((tx: TestTxItem) => tx.ledger.title.toLowerCase().includes('juhi') || (tx.note && tx.note.toLowerCase().includes('juhi'))), 'Search results match query');
  }

  // 2.3 Search by note
  {
    const req = createMockRequest('http://localhost:3000/api/transactions?search=Goods purchased', 'GET');
    const res = await listTransactions(req);
    const json = await res.json();
    assert(res.status === 200, 'Search by note returns 200 OK');
    assert(json.data.length > 0, 'Found results for note search');
  }

  // 2.4 Filter by Type
  {
    const req = createMockRequest('http://localhost:3000/api/transactions?type=CREDIT', 'GET');
    const res = await listTransactions(req);
    const json = await res.json();
    assert(res.status === 200, 'Filter by type=CREDIT returns 200 OK');
    assert(json.data.every((tx: TestTxItem) => tx.type === 'CREDIT'), 'All returned transactions are CREDIT');
  }

  // 2.5 Filter by Payment Method
  {
    const req = createMockRequest('http://localhost:3000/api/transactions?paymentMethod=UPI', 'GET');
    const res = await listTransactions(req);
    const json = await res.json();
    assert(res.status === 200, 'Filter by paymentMethod=UPI returns 200 OK');
    assert(json.data.every((tx: TestTxItem) => tx.paymentMethod === 'UPI'), 'All returned transactions have UPI');
  }

  // 2.6 Filter by Date Range
  {
    const req = createMockRequest('http://localhost:3000/api/transactions?dateFrom=2026-08-01T00:00:00Z&dateTo=2026-08-31T23:59:59Z', 'GET');
    const res = await listTransactions(req);
    const json = await res.json();
    assert(res.status === 200, 'Filter by date range returns 200 OK');
    assert(json.data.length > 0, 'Returned transactions within date range');
  }

  // 2.7 Sorting by amount desc
  {
    const req = createMockRequest('http://localhost:3000/api/transactions?sortBy=amount&sortOrder=desc', 'GET');
    const res = await listTransactions(req);
    const json = await res.json();
    assert(res.status === 200, 'Sort by amount desc returns 200 OK');
    if (json.data.length >= 2) {
      assert(json.data[0].amount >= json.data[1].amount, 'First item amount >= second item amount');
    }
  }

  // ─── 3. TEST GET /api/transactions/:id ───────────────────────────────────────

  console.log('\n--- 3. GET /api/transactions/:id ---');

  // 3.1 Fetch existing transaction
  {
    const req = createMockRequest(`http://localhost:3000/api/transactions/${createdTxId}`, 'GET');
    const res = await getTransactionById(req, { params: Promise.resolve({ id: createdTxId }) });
    const json = await res.json();
    assert(res.status === 200, 'GET /api/transactions/:id returns 200 OK', json);
    assert(json.data.id === createdTxId, 'Returned transaction ID matches');
    assert(json.data.ledger !== undefined, 'Includes customer/ledger info');
  }

  // 3.2 Non-existent transaction ID
  {
    const req = createMockRequest('http://localhost:3000/api/transactions/invalid-id-999', 'GET');
    const res = await getTransactionById(req, { params: Promise.resolve({ id: 'invalid-id-999' }) });
    const json = await res.json();
    assert(res.status === 404, 'GET with non-existent ID returns 404 Not Found', json);
    assert(json.error.code === 'NOT_FOUND', 'Error code is NOT_FOUND');
  }

  // ─── 4. TEST PUT /api/transactions/:id ───────────────────────────────────────

  console.log('\n--- 4. TEST PUT /api/transactions/:id ---');

  // 4.1 Valid partial update
  {
    const req = createMockRequest(`http://localhost:3000/api/transactions/${createdTxId}`, 'PUT', {
      amount: 18500.50,
      note: 'Updated note test',
      paymentMethod: 'Bank Transfer',
    });
    const res = await updateTransaction(req, { params: Promise.resolve({ id: createdTxId }) });
    const json = await res.json();
    assert(res.status === 200, 'PUT /api/transactions/:id returns 200 OK', json);
    assert(json.data.amount === 18500.50, 'Updated amount matches');
    assert(json.data.note === 'Updated note test', 'Updated note matches');
    assert(json.data.paymentMethod === 'Bank Transfer', 'Updated paymentMethod matches');
  }

  // 4.2 Invalid update values (e.g. negative amount)
  {
    const req = createMockRequest(`http://localhost:3000/api/transactions/${createdTxId}`, 'PUT', {
      amount: -100,
    });
    const res = await updateTransaction(req, { params: Promise.resolve({ id: createdTxId }) });
    const json = await res.json();
    assert(res.status === 400, 'PUT with negative amount returns 400 Bad Request', json);
    assert(json.error.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');
  }

  // 4.3 Update non-existent transaction
  {
    const req = createMockRequest('http://localhost:3000/api/transactions/non-existent-id', 'PUT', {
      amount: 100,
    });
    const res = await updateTransaction(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const json = await res.json();
    assert(res.status === 404, 'PUT non-existent transaction returns 404 Not Found', json);
  }

  // 4.4 Unauthorized update attempt
  {
    const req = createMockRequest(`http://localhost:3000/api/transactions/${createdTxId}`, 'PUT', {
      amount: 20000,
    }, {
      'x-shopkeeper-id': 'unauthorized-user-999',
    });
    const res = await updateTransaction(req, { params: Promise.resolve({ id: createdTxId }) });
    const json = await res.json();
    assert(res.status === 403, 'PUT by unauthorized user returns 403 Forbidden', json);
    assert(json.error.code === 'FORBIDDEN', 'Error code is FORBIDDEN on unauthorized PUT');
  }

  // ─── 5. TEST DELETE /api/transactions/:id ────────────────────────────────────

  console.log('\n--- 5. TEST DELETE /api/transactions/:id ---');

  // 5.1 Unauthorized delete attempt
  {
    const req = createMockRequest(`http://localhost:3000/api/transactions/${createdTxId}`, 'DELETE', undefined, {
      'x-shopkeeper-id': 'unauthorized-user-999',
    });
    const res = await deleteTransaction(req, { params: Promise.resolve({ id: createdTxId }) });
    const json = await res.json();
    assert(res.status === 403, 'DELETE by unauthorized user returns 403 Forbidden', json);
    assert(json.error.code === 'FORBIDDEN', 'Error code is FORBIDDEN on unauthorized DELETE');
  }

  // 5.2 Soft delete
  {
    const req = createMockRequest(`http://localhost:3000/api/transactions/${createdTxId}`, 'DELETE');
    const res = await deleteTransaction(req, { params: Promise.resolve({ id: createdTxId }) });
    const json = await res.json();
    assert(res.status === 200, 'DELETE /api/transactions/:id returns 200 OK', json);
    assert(json.data.isDeleted === true, 'isDeleted set to true');
  }

  // 5.3 Verify soft-deleted item is excluded from GET /api/transactions
  {
    const req = createMockRequest('http://localhost:3000/api/transactions?limit=100', 'GET');
    const res = await listTransactions(req);
    const json = await res.json();
    const foundDeleted = json.data.some((tx: { id: string }) => tx.id === createdTxId);
    assert(!foundDeleted, 'Soft-deleted transaction is excluded from GET list');
  }

  // 5.4 Verify GET by ID on deleted item returns 404
  {
    const req = createMockRequest(`http://localhost:3000/api/transactions/${createdTxId}`, 'GET');
    const res = await getTransactionById(req, { params: Promise.resolve({ id: createdTxId }) });
    const json = await res.json();
    assert(res.status === 404, 'GET on soft-deleted transaction returns 404 Not Found', json);
  }

  // 5.5 DELETE non-existent transaction
  {
    const req = createMockRequest('http://localhost:3000/api/transactions/non-existent-id', 'DELETE');
    const res = await deleteTransaction(req, { params: Promise.resolve({ id: 'non-existent-id' }) });
    const json = await res.json();
    assert(res.status === 404, 'DELETE non-existent transaction returns 404 Not Found', json);
  }

  console.log('\n========================================');
  console.log(`📊 Test Summary: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
