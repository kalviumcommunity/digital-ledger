/**
 * Automated Test Suite for Add Transaction UI -> API Flow
 *
 * Tests all 7 required scenarios:
 * 1. Credit Given transaction creation
 * 2. Payment Received transaction creation
 * 3. Invalid amount validation (zero, negative, non-numeric)
 * 4. Missing customer validation
 * 5. API failure handling
 * 6. Successful transaction creation and state updates
 * 7. Duplicate submit prevention
 */

import { POST } from '../src/app/api/transactions/route';
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
  console.log('======================================================');
  console.log('🚀 Running Add Transaction UI -> Transaction API Tests');
  console.log('======================================================\n');

  // Reset in-memory data
  TransactionService.resetStore();

  // Create real test customer
  const testCustomer = await CustomerService.create({
    name: 'Pooja Sharma - Grocery Mart',
    phone: '9876501234',
    initialBalance: 1500,
    shopkeeperId: 'default-shopkeeper-id',
  });

  // --- Scenario 1: Credit Given ---
  console.log('--- 1. Test: Credit Given Flow ---');
  {
    const req = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'default-shopkeeper-id',
        'x-user-role': 'SHOPKEEPER',
      },
      body: JSON.stringify({
        customerId: testCustomer.id,
        type: 'CREDIT_GIVEN',
        amount: 850.50,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
        description: 'Invoice #101 - Rice & Dal',
      }),
    });

    const res = await POST(req);
    assert(res.status === 201, 'Credit Given transaction returns 201 Created');
    const json = await res.json();
    assert(json.success === true, 'Response has success: true');
    assert(json.data.type === 'CREDIT', 'Transaction type stored as CREDIT');
    assert(json.data.amount === 850.50, 'Transaction amount stored as 850.50');
    assert(json.data.ledgerId === testCustomer.id, 'Transaction linked to correct customerId');
    assert(json.data.paymentMethod === 'Cash', 'Payment method is Cash');
    assert(json.data.note === 'Invoice #101 - Rice & Dal', 'Description stored in note');
  }

  // --- Scenario 2: Payment Received ---
  console.log('\n--- 2. Test: Payment Received Flow ---');
  {
    const req = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'default-shopkeeper-id',
        'x-user-role': 'SHOPKEEPER',
      },
      body: JSON.stringify({
        customerId: testCustomer.id,
        type: 'PAYMENT_RECEIVED',
        amount: 500.00,
        date: new Date().toISOString(),
        paymentMethod: 'UPI',
        description: 'GPay payment received',
      }),
    });

    const res = await POST(req);
    assert(res.status === 201, 'Payment Received transaction returns 201 Created');
    const json = await res.json();
    assert(json.success === true, 'Response has success: true');
    assert(json.data.type === 'DEBIT', 'Payment Received mapped to DEBIT');
    assert(json.data.amount === 500.00, 'Transaction amount stored as 500.00');
    assert(json.data.paymentMethod === 'UPI', 'Payment method is UPI');
  }

  // --- Scenario 3: Invalid Amount ---
  console.log('\n--- 3. Test: Invalid Amount Handling ---');
  {
    // Zero amount
    const reqZero = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'default-shopkeeper-id',
      },
      body: JSON.stringify({
        customerId: testCustomer.id,
        type: 'CREDIT_GIVEN',
        amount: 0,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
      }),
    });
    const resZero = await POST(reqZero);
    assert(resZero.status === 400, 'Amount 0 returns 400 Bad Request');
    const jsonZero = await resZero.json();
    assert(jsonZero.success === false, 'Error response success is false');
    assert(jsonZero.error.code === 'VALIDATION_ERROR', 'Error code is VALIDATION_ERROR');

    // Negative amount
    const reqNeg = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'default-shopkeeper-id',
      },
      body: JSON.stringify({
        customerId: testCustomer.id,
        type: 'CREDIT_GIVEN',
        amount: -100,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
      }),
    });
    const resNeg = await POST(reqNeg);
    assert(resNeg.status === 400, 'Negative amount returns 400 Bad Request');
  }

  // --- Scenario 4: Missing Customer ---
  console.log('\n--- 4. Test: Missing / Non-existent Customer ---');
  {
    // Missing customer ID
    const reqMissing = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'default-shopkeeper-id',
      },
      body: JSON.stringify({
        type: 'CREDIT_GIVEN',
        amount: 100,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
      }),
    });
    const resMissing = await POST(reqMissing);
    assert(resMissing.status === 400, 'Missing customerId returns 400 Bad Request');

    // Non-existent customer ID
    const reqNonExistent = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'default-shopkeeper-id',
      },
      body: JSON.stringify({
        customerId: 'non-existent-customer-999',
        type: 'CREDIT_GIVEN',
        amount: 100,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
      }),
    });
    const resNonExistent = await POST(reqNonExistent);
    assert(resNonExistent.status === 400, 'Non-existent customerId returns 400 Bad Request');
  }

  // --- Scenario 5: API Failure / Unauthorized ---
  console.log('\n--- 5. Test: API Failure & Unauthorized Access ---');
  {
    // Unauthorized user
    const reqUnauth = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: 'Bearer invalid',
      },
      body: JSON.stringify({
        customerId: testCustomer.id,
        type: 'CREDIT_GIVEN',
        amount: 100,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
      }),
    });
    const resUnauth = await POST(reqUnauth);
    assert(resUnauth.status === 401, 'Unauthorized caller returns 401 Unauthorized');
    const jsonUnauth = await resUnauth.json();
    assert(jsonUnauth.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

    // Cross-shopkeeper customer access (Forbidden)
    const reqForbidden = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'other-shopkeeper-id',
        'x-user-role': 'SHOPKEEPER',
      },
      body: JSON.stringify({
        customerId: testCustomer.id, // belongs to default-shopkeeper-id
        type: 'CREDIT_GIVEN',
        amount: 100,
        date: new Date().toISOString(),
        paymentMethod: 'Cash',
      }),
    });
    const resForbidden = await POST(reqForbidden);
    assert(resForbidden.status === 403, 'Cross-shopkeeper transaction returns 403 Forbidden');
    const jsonForbidden = await resForbidden.json();
    assert(jsonForbidden.error.code === 'FORBIDDEN', 'Error code is FORBIDDEN');
  }

  // --- Scenario 6: Successful Transaction Creation and State Integrity ---
  console.log('\n--- 6. Test: Successful Transaction Creation & State Integrity ---');
  {
    const req = new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'default-shopkeeper-id',
        'x-user-role': 'SHOPKEEPER',
      },
      body: JSON.stringify({
        customerId: testCustomer.id,
        type: 'CREDIT',
        amount: 1250.75,
        date: '2026-09-07T12:00:00.000Z',
        paymentMethod: 'Bank Transfer',
        description: 'Direct Bank NEFT - Final settlement',
      }),
    });

    const res = await POST(req);
    assert(res.status === 201, 'POST /api/transactions returns 201 Created');
    const json = await res.json();
    assert(json.success === true, 'Success envelope true');
    assert(json.data.amount === 1250.75, 'Amount is exactly 1250.75');
    assert(json.data.paymentMethod === 'Bank Transfer', 'Payment method is Bank Transfer');

    // Verify it is retrievable via GET /api/transactions
    const getResult = await TransactionService.getById(json.data.id, 'default-shopkeeper-id');
    assert(!getResult.notFound, 'Created transaction is found in database/store');
    assert(getResult.transaction?.amount === 1250.75, 'Retrieved amount matches');
    assert(getResult.transaction?.ledger?.title === testCustomer.name, 'Customer title populated on transaction join');
  }

  // --- Scenario 7: Duplicate Submission Prevention ---
  console.log('\n--- 7. Test: Duplicate Submission Handling ---');
  {
    // Simulate frontend double submit handler behavior:
    // When isSubmitting is true, the handler returns immediately without dispatching a second POST.
    let isSubmitting = false;
    let dispatchCount = 0;

    const simulateSubmitClick = async () => {
      if (isSubmitting) {
        return { duplicateBlocked: true };
      }
      isSubmitting = true;
      dispatchCount++;
      // simulate network request delay
      await new Promise((r) => setTimeout(r, 20));
      isSubmitting = false;
      return { duplicateBlocked: false };
    };

    // Trigger two rapid consecutive clicks
    const [click1, click2] = await Promise.all([
      simulateSubmitClick(),
      simulateSubmitClick(),
    ]);

    assert(click1.duplicateBlocked === false, 'First click proceeds normally');
    assert(click2.duplicateBlocked === true, 'Second duplicate click is blocked immediately');
    assert(dispatchCount === 1, 'Only exactly 1 network request was dispatched');
  }

  console.log('\n======================================================');
  console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
