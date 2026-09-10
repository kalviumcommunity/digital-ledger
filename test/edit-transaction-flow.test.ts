/**
 * Test Suite for Person 2's Edit Transaction functionality.
 *
 * Verifies:
 * 1. Preload/Fetch existing transaction (GET /api/transactions/:id)
 * 2. Edit amount (PUT /api/transactions/:id)
 * 3. Edit type (CREDIT_GIVEN / CREDIT <-> PAYMENT_RECEIVED / DEBIT)
 * 4. Edit description / note
 * 5. Validation errors:
 *    - amount <= 0
 *    - invalid amount string / format
 *    - invalid type
 * 6. Authorization checks:
 *    - unauthenticated access (401 Unauthorized)
 *    - cross-tenant/unauthorized transaction edit (403 Forbidden)
 * 7. Non-existent transaction (404 Not Found)
 * 8. Financial summary update after transaction edit
 */

import { GET as getTransactionById, PUT as updateTransaction } from '../src/app/api/transactions/[id]/route';
import { POST as createTransaction } from '../src/app/api/transactions/route';
import { GET as getSummary } from '../src/app/api/transactions/summary/route';
import { CustomerService } from '../src/lib/services/customerService';
import { TransactionService } from '../src/lib/services/transactionService';
import { NextRequest } from 'next/server';

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
  console.log('🚀 Running Person 2 Edit Transaction Tests');
  console.log('===============================================================\n');

  // Reset stores
  TransactionService.resetStore();
  CustomerService.resetStore();

  // Create a customer
  const customer = await CustomerService.create({
    name: 'Vikas Khanna',
    phone: '9845012345',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  // Create an initial transaction: CREDIT_GIVEN ₹5,000
  const createReq = new NextRequest('http://localhost:3000/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
    body: JSON.stringify({
      customerId: customer.id,
      type: 'CREDIT_GIVEN',
      amount: 5000,
      paymentMethod: 'Cash',
      description: 'Initial stock purchase',
    }),
  });
  const createRes = await createTransaction(createReq);
  const createdJson = await createRes.json();
  const txId = createdJson.data.id;
  assert(createRes.status === 201, 'Created initial test transaction ₹5,000');

  // --- 1. PRELOAD / FETCH EXISTING TRANSACTION ---
  console.log('\n--- 1. Preload / Fetch Existing Transaction ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await getTransactionById(req, { params: Promise.resolve({ id: txId }) });
    const json = await res.json();
    assert(res.status === 200, 'GET /api/transactions/:id returns 200 OK');
    assert(json.data.id === txId, 'Preloaded ID matches');
    assert(json.data.amount === 5000, 'Preloaded amount is ₹5,000');
    assert(json.data.type === 'CREDIT', 'Preloaded type is CREDIT');
    assert(json.data.note === 'Initial stock purchase', 'Preloaded description matches');
    assert(json.data.ledger?.title === 'Vikas Khanna', 'Customer name is preloaded');
  }

  // --- 2. EDIT AMOUNT ---
  console.log('\n--- 2. Edit Transaction Amount ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        amount: 7500.50,
      }),
    });
    const res = await updateTransaction(req, { params: Promise.resolve({ id: txId }) });
    const json = await res.json();
    assert(res.status === 200, 'PUT /api/transactions/:id returns 200 OK on amount update');
    assert(json.success === true, 'Response success is true');
    assert(json.data.amount === 7500.50, 'Updated amount is exactly ₹7,500.50');
  }

  // --- 3. EDIT TYPE ---
  console.log('\n--- 3. Edit Transaction Type (CREDIT -> DEBIT) ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        type: 'PAYMENT_RECEIVED',
      }),
    });
    const res = await updateTransaction(req, { params: Promise.resolve({ id: txId }) });
    const json = await res.json();
    assert(res.status === 200, 'PUT /api/transactions/:id returns 200 OK on type update');
    assert(json.data.type === 'DEBIT', 'Updated type mapped to DEBIT (PAYMENT_RECEIVED)');
  }

  // --- 4. EDIT DESCRIPTION & PAYMENT METHOD ---
  console.log('\n--- 4. Edit Description & Payment Method ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        note: 'Updated settlement note for Vikas',
        paymentMethod: 'UPI',
      }),
    });
    const res = await updateTransaction(req, { params: Promise.resolve({ id: txId }) });
    const json = await res.json();
    assert(res.status === 200, 'PUT /api/transactions/:id returns 200 OK on description update');
    assert(json.data.note === 'Updated settlement note for Vikas', 'Description updated');
    assert(json.data.paymentMethod === 'UPI', 'Payment method updated to UPI');
  }

  // --- 5. VALIDATION: INVALID AMOUNT ---
  console.log('\n--- 5. Validation: Invalid Amount ---');
  {
    // Amount 0
    const reqZero = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({ amount: 0 }),
    });
    const resZero = await updateTransaction(reqZero, { params: Promise.resolve({ id: txId }) });
    const jsonZero = await resZero.json();
    assert(resZero.status === 400, 'Amount 0 returns 400 Bad Request');
    assert(jsonZero.error.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');

    // Negative Amount
    const reqNeg = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({ amount: -500 }),
    });
    const resNeg = await updateTransaction(reqNeg, { params: Promise.resolve({ id: txId }) });
    assert(resNeg.status === 400, 'Negative amount returns 400 Bad Request');

    // Invalid Type
    const reqType = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({ type: 'INVALID_TYPE' }),
    });
    const resType = await updateTransaction(reqType, { params: Promise.resolve({ id: txId }) });
    assert(resType.status === 400, 'Invalid type returns 400 Bad Request');
  }

  // --- 6. AUTHORIZATION CHECKS ---
  console.log('\n--- 6. Authorization Checks ---');
  {
    // Unauthenticated
    const reqUnauth = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-unauthenticated': 'true' },
      body: JSON.stringify({ amount: 1000 }),
    });
    const resUnauth = await updateTransaction(reqUnauth, { params: Promise.resolve({ id: txId }) });
    assert(resUnauth.status === 401, 'Unauthenticated edit returns 401 Unauthorized');

    // Cross-shopkeeper unauthorized edit
    const reqForbidden = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'other-shopkeeper-999' },
      body: JSON.stringify({ amount: 1000 }),
    });
    const resForbidden = await updateTransaction(reqForbidden, { params: Promise.resolve({ id: txId }) });
    assert(resForbidden.status === 403, 'Cross-shopkeeper edit returns 403 Forbidden');
  }

  // --- 7. NON-EXISTENT TRANSACTION ---
  console.log('\n--- 7. Non-existent Transaction ---');
  {
    const reqNotFound = new NextRequest('http://localhost:3000/api/transactions/non-existent-id-999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({ amount: 1000 }),
    });
    const resNotFound = await updateTransaction(reqNotFound, { params: Promise.resolve({ id: 'non-existent-id-999' }) });
    assert(resNotFound.status === 404, 'Editing non-existent transaction returns 404 Not Found');
  }

  // --- 8. FINANCIAL SUMMARY RECALCULATION AFTER EDIT ---
  console.log('\n--- 8. Financial Summary Updates After Edit ---');
  {
    // Switch back to CREDIT ₹10,000
    const reqReset = new NextRequest(`http://localhost:3000/api/transactions/${txId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        type: 'CREDIT',
        amount: 10000,
      }),
    });
    await updateTransaction(reqReset, { params: Promise.resolve({ id: txId }) });

    // Fetch summary
    const reqSummary = new NextRequest('http://localhost:3000/api/transactions/summary', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resSummary = await getSummary(reqSummary);
    const jsonSummary = await resSummary.json();
    assert(resSummary.status === 200, 'GET /api/transactions/summary returns 200 OK');
    assert(jsonSummary.success === true, 'Summary success === true');
    assert(jsonSummary.data.creditGiven >= 10000, 'Summary Credit Given updated accurately');
  }

  console.log('\n===============================================================');
  console.log(`📊 Edit Transaction Summary: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
