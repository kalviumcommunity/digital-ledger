import { GET as getCustomers, POST as createCustomer } from '../src/app/api/customers/route';
import { GET as getCustomerById } from '../src/app/api/customers/[id]/route';
import { POST as createTransaction, GET as listTransactions } from '../src/app/api/transactions/route';
import { GET as getTransactionById } from '../src/app/api/transactions/[id]/route';
import { NextRequest } from 'next/server';
import { CustomerService } from '../src/lib/services/customerService';
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

interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  amountDue: number;
}

async function runCustomerIntegrationTests() {
  console.log('======================================================');
  console.log('🚀 Running Person 1 Customer API & Person 2 Integration Tests');
  console.log('======================================================\n');

  CustomerService.resetStore();
  TransactionService.resetStore();

  let realCustomerId = '';
  const realCustomerName = 'Vikas Verma Enterprises';

  // ─── 1. TEST GET /api/customers ──────────────────────────────────────────────

  console.log('--- 1. Customer API: GET /api/customers ---');
  {
    const req = createMockRequest('http://localhost:3000/api/customers', 'GET');
    const res = await getCustomers(req);
    const json = await res.json();
    assert(res.status === 200, 'GET /api/customers returns 200 OK');
    assert(json.success === true, 'Response envelope has success: true');
    assert(Array.isArray(json.data), 'Customer data is an array');
    assert(json.data.length > 0, 'Customers returned');
    assert(typeof json.data[0].id === 'string', 'Customer ID format is string');
    assert(typeof json.data[0].name === 'string', 'Customer response format contains name');
    assert(typeof json.data[0].amountDue === 'number', 'Customer response format contains amountDue');
  }

  // ─── 2. CREATE A REAL CUSTOMER ───────────────────────────────────────────────

  console.log('\n--- 2. Create Real Customer: POST /api/customers ---');
  {
    const req = createMockRequest('http://localhost:3000/api/customers', 'POST', {
      name: realCustomerName,
      phone: '9845123456',
      initialBalance: 2500.0,
    });
    const res = await createCustomer(req);
    const json = await res.json();
    assert(res.status === 201, 'POST /api/customers returns 201 Created');
    assert(json.success === true, 'Response envelope has success: true');
    assert(json.data.name === realCustomerName, 'Created customer name matches');
    assert(json.data.amountDue === 2500.0, 'Created customer initial balance matches');
    assert(Boolean(json.data.id), 'Created customer has non-empty ID');
    realCustomerId = json.data.id;
  }

  // ─── 3. CONFIRM REAL CUSTOMER APPEARS IN CUSTOMER SELECTION ──────────────────

  console.log('\n--- 3. Confirm Real Customer Appears in Selection (GET /api/customers) ---');
  {
    const req = createMockRequest('http://localhost:3000/api/customers', 'GET');
    const res = await getCustomers(req);
    const json = await res.json();
    assert(res.status === 200, 'GET /api/customers returns 200 OK');
    const foundCustomer = json.data.find((c: CustomerItem) => c.id === realCustomerId);
    assert(foundCustomer !== undefined, 'Real customer found in customer selection list');
    assert(foundCustomer?.name === realCustomerName, 'Customer selection name matches real customer');
  }

  // ─── 4. TEST GET /api/customers/:id ──────────────────────────────────────────

  console.log('\n--- 4. Customer API: GET /api/customers/:id ---');
  {
    const req = createMockRequest(`http://localhost:3000/api/customers/${realCustomerId}`, 'GET');
    const res = await getCustomerById(req, { params: Promise.resolve({ id: realCustomerId }) });
    const json = await res.json();
    assert(res.status === 200, 'GET /api/customers/:id returns 200 OK');
    assert(json.data.id === realCustomerId, 'Customer ID matches');
    assert(json.data.name === realCustomerName, 'Customer name matches');

    // Non-existent ID
    const reqInvalid = createMockRequest('http://localhost:3000/api/customers/invalid-cust-999', 'GET');
    const resInvalid = await getCustomerById(reqInvalid, { params: Promise.resolve({ id: 'invalid-cust-999' }) });
    assert(resInvalid.status === 404, 'GET with invalid customer ID returns 404 Not Found');
  }

  // ─── 5. CREATE TRANSACTION FOR REAL CUSTOMER ─────────────────────────────────

  console.log('\n--- 5. Add Transaction for Real Customer (POST /api/transactions) ---');
  let createdTxId = '';
  {
    const req = createMockRequest('http://localhost:3000/api/transactions', 'POST', {
      customerId: realCustomerId,
      type: 'CREDIT',
      amount: 14250.75,
      date: '2026-09-07T14:30:00.000Z',
      paymentMethod: 'UPI',
      note: 'Bulk supplies order for Vikas Verma Enterprises',
    });
    const res = await createTransaction(req);
    const json = await res.json();
    assert(res.status === 201, 'POST /api/transactions returns 201 Created');
    assert(json.success === true, 'Transaction creation success === true');
    assert(json.data.ledgerId === realCustomerId, 'Transaction API received and stored correct real customerId (ledgerId)');
    assert(json.data.amount === 14250.75, 'Transaction amount matches');
    assert(json.data.type === 'CREDIT', 'Transaction type is CREDIT');
    assert(json.data.paymentMethod === 'UPI', 'Transaction paymentMethod is UPI');
    createdTxId = json.data.id;
  }

  // ─── 6. VERIFY TRANSACTION QUERY & JOIN FOR REAL CUSTOMER ────────────────────

  console.log('\n--- 6. Verify Transaction Query and Customer JOIN ---');
  {
    const req = createMockRequest(`http://localhost:3000/api/transactions/${createdTxId}`, 'GET');
    const res = await getTransactionById(req, { params: Promise.resolve({ id: createdTxId }) });
    const json = await res.json();
    assert(res.status === 200, 'GET /api/transactions/:id returns 200 OK');
    assert(json.data.id === createdTxId, 'Transaction ID matches');
    assert(json.data.ledgerId === realCustomerId, 'Transaction references real customerId');

    // Filter transactions by real customer ID
    const reqList = createMockRequest(`http://localhost:3000/api/transactions?customerId=${realCustomerId}`, 'GET');
    const resList = await listTransactions(reqList);
    const jsonList = await resList.json();
    assert(resList.status === 200, 'GET /api/transactions?customerId=... returns 200 OK');
    assert(jsonList.data.some((tx: { id: string; ledgerId: string }) => tx.id === createdTxId && tx.ledgerId === realCustomerId), 'Transaction found when filtering by real customerId');
  }

  console.log('\n======================================================');
  console.log(`📊 Integration Test Summary: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runCustomerIntegrationTests().catch((err) => {
  console.error('Fatal error running customer integration tests:', err);
  process.exit(1);
});
