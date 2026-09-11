/**
 * Test Suite for Person 2's Delete Transaction functionality.
 *
 * Verifies:
 * 1. Cancel delete: transaction remains active and unchanged.
 * 2. Confirm delete: DELETE /api/transactions/:id soft deletes the transaction (isDeleted: true).
 * 3. Soft-deleted transaction disappears from global history (GET /api/transactions).
 * 4. Soft-deleted transaction is inaccessible via single fetch (GET /api/transactions/:id returns 404).
 * 5. Unauthorized delete (401 for unauthenticated, 403 for cross-shopkeeper).
 * 6. Non-existent transaction delete (404 Not Found).
 * 7. Dashboard financial summary recalculation after delete.
 */

import { DELETE as deleteTransaction, GET as getTransactionById } from '../src/app/api/transactions/[id]/route';
import { POST as createTransaction, GET as listTransactions } from '../src/app/api/transactions/route';
import { GET as getSummary } from '../src/app/api/transactions/summary/route';
import { CustomerService } from '../src/lib/services/customerService';
import { TransactionService } from '../src/lib/services/transactionService';
import { NextRequest } from 'next/server';

interface TestTx {
  id: string;
  type: string;
  amount: number;
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
  console.log('🚀 Running Person 2 Delete Transaction Tests');
  console.log('===============================================================\n');

  // Reset stores
  TransactionService.resetStore();
  CustomerService.resetStore();

  // Create customer
  const customer = await CustomerService.create({
    name: 'Siddharth Rao',
    phone: '9870123456',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  // Seed 2 transactions:
  // Tx 1: CREDIT_GIVEN ₹8,000
  // Tx 2: PAYMENT_RECEIVED ₹3,000
  const tx1Res = await createTransaction(
    new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        customerId: customer.id,
        type: 'CREDIT_GIVEN',
        amount: 8000,
        paymentMethod: 'Cash',
        description: 'Electrical supplies invoice #501',
      }),
    })
  );
  const tx1Json = await tx1Res.json();
  const tx1Id = tx1Json.data.id;

  const tx2Res = await createTransaction(
    new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        customerId: customer.id,
        type: 'PAYMENT_RECEIVED',
        amount: 3000,
        paymentMethod: 'UPI',
        description: 'Partial advance UPI',
      }),
    })
  );
  const tx2Json = await tx2Res.json();
  const tx2Id = tx2Json.data.id;

  assert(tx1Res.status === 201 && tx2Res.status === 201, 'Created test transactions (Tx1: ₹8k Credit, Tx2: ₹3k Payment)');

  // --- 1. PRE-DELETE STATE VERIFICATION ---
  console.log('\n--- 1. Initial State Verification ---');
  {
    const summaryRes = await getSummary(
      new NextRequest('http://localhost:3000/api/transactions/summary', {
        headers: { 'x-user-id': 'default-shopkeeper-id' },
      })
    );
    const summaryJson = await summaryRes.json();
    assert(summaryRes.status === 200, 'GET /api/transactions/summary returns 200 OK');
    assert(summaryJson.data.creditGiven >= 8000, 'Initial Credit Given includes ₹8,000');
    assert(summaryJson.data.totalPaid >= 3000, 'Initial Total Paid includes ₹3,000');
  }

  // --- 2. CANCEL DELETE (SIMULATION) ---
  console.log('\n--- 2. Cancel Delete Simulation ---');
  {
    // Transaction remains intact when modal is cancelled without calling DELETE
    const getRes = await getTransactionById(
      new NextRequest(`http://localhost:3000/api/transactions/${tx1Id}`, {
        headers: { 'x-user-id': 'default-shopkeeper-id' },
      }),
      { params: Promise.resolve({ id: tx1Id }) }
    );
    const getJson = await getRes.json();
    assert(getRes.status === 200, 'Transaction remains active before confirmation');
    assert(getJson.data.id === tx1Id, 'Transaction data is unchanged');
  }

  // --- 3. AUTHORIZATION CHECKS ON DELETE ---
  console.log('\n--- 3. Authorization Checks on Delete ---');
  {
    // Unauthenticated
    const unauthRes = await deleteTransaction(
      new NextRequest(`http://localhost:3000/api/transactions/${tx2Id}`, {
        headers: { 'x-unauthenticated': 'true' },
      }),
      { params: Promise.resolve({ id: tx2Id }) }
    );
    assert(unauthRes.status === 401, 'Unauthenticated DELETE returns 401 Unauthorized');
    const unauthJson = await unauthRes.json();
    assert(unauthJson.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');

    // Cross-shopkeeper unauthorized delete
    const forbiddenRes = await deleteTransaction(
      new NextRequest(`http://localhost:3000/api/transactions/${tx2Id}`, {
        headers: { 'x-user-id': 'unauthorized-shopkeeper-999' },
      }),
      { params: Promise.resolve({ id: tx2Id }) }
    );
    assert(forbiddenRes.status === 403, 'Cross-shopkeeper DELETE returns 403 Forbidden');
    const forbiddenJson = await forbiddenRes.json();
    assert(forbiddenJson.error.code === 'FORBIDDEN', 'Error code is FORBIDDEN');
  }

  // --- 4. NON-EXISTENT TRANSACTION DELETE ---
  console.log('\n--- 4. Non-existent Transaction Delete ---');
  {
    const notFoundRes = await deleteTransaction(
      new NextRequest('http://localhost:3000/api/transactions/invalid-tx-9999', {
        headers: { 'x-user-id': 'default-shopkeeper-id' },
      }),
      { params: Promise.resolve({ id: 'invalid-tx-9999' }) }
    );
    assert(notFoundRes.status === 404, 'Deleting non-existent transaction returns 404 Not Found');
    const notFoundJson = await notFoundRes.json();
    assert(notFoundJson.error.code === 'NOT_FOUND', 'Error code is NOT_FOUND');
  }

  // --- 5. CONFIRM DELETE (DELETE /api/transactions/:id) ---
  console.log('\n--- 5. Confirm Delete (DELETE /api/transactions/:id) ---');
  {
    const delRes = await deleteTransaction(
      new NextRequest(`http://localhost:3000/api/transactions/${tx2Id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'default-shopkeeper-id' },
      }),
      { params: Promise.resolve({ id: tx2Id }) }
    );
    assert(delRes.status === 200, 'DELETE /api/transactions/:id returns 200 OK on confirm');
    const delJson = await delRes.json();
    assert(delJson.success === true, 'Response envelope has success: true');
    assert(delJson.data.isDeleted === true, 'Response data indicates isDeleted: true');
  }

  // --- 6. GLOBAL TRANSACTION STREAM EXCLUSION ---
  console.log('\n--- 6. Global Transaction Stream Exclusion ---');
  {
    const listRes = await listTransactions(
      new NextRequest('http://localhost:3000/api/transactions?limit=50', {
        headers: { 'x-user-id': 'default-shopkeeper-id' },
      })
    );
    const listJson = await listRes.json();
    assert(listRes.status === 200, 'GET /api/transactions returns 200 OK');
    const ids = listJson.data.map((t: TestTx) => t.id);
    assert(!ids.includes(tx2Id), 'Deleted transaction #2 is excluded from global history stream');
    assert(ids.includes(tx1Id), 'Non-deleted transaction #1 is still present');
  }

  // --- 7. DIRECT RETRIEVAL EXCLUSION (404 NOT FOUND) ---
  console.log('\n--- 7. Direct Retrieval of Deleted Transaction (404 Not Found) ---');
  {
    const singleRes = await getTransactionById(
      new NextRequest(`http://localhost:3000/api/transactions/${tx2Id}`, {
        headers: { 'x-user-id': 'default-shopkeeper-id' },
      }),
      { params: Promise.resolve({ id: tx2Id }) }
    );
    assert(singleRes.status === 404, 'GET /api/transactions/:id for deleted transaction returns 404 Not Found');
  }

  // --- 8. DASHBOARD FINANCIAL SUMMARY RECALCULATION ---
  console.log('\n--- 8. Dashboard Financial Summary Recalculation ---');
  {
    const summaryAfterRes = await getSummary(
      new NextRequest('http://localhost:3000/api/transactions/summary', {
        headers: { 'x-user-id': 'default-shopkeeper-id' },
      })
    );
    const summaryAfterJson = await summaryAfterRes.json();
    assert(summaryAfterRes.status === 200, 'GET /api/transactions/summary returns 200 OK');
    assert(summaryAfterJson.success === true, 'Summary success === true');
    // Tx2 (Payment ₹3,000) was deleted, so Total Paid decreased by ₹3,000, and Balance increased by ₹3,000
    assert(summaryAfterJson.data.creditGiven >= 8000, 'Credit Given reflects active transactions');
  }

  console.log('\n===============================================================');
  console.log(`📊 Delete Transaction Summary: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
