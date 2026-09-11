/**
 * Automated Test Suite for Person 2's Dashboard Financial Calculations
 *
 * Tests:
 * 1. Base Scenario: Credit ₹10,000 + Payment ₹4,000 => Balance: ₹6,000, Credit Given: ₹10,000
 * 2. Multiple credits accumulation
 * 3. Multiple payments deduction
 * 4. Editing a transaction (modifying amount/type dynamically updates balance)
 * 5. Deleting a transaction (soft deletion excludes amount from balance)
 * 6. Zero transactions (empty state returns 0 balance and 0 credit given)
 * 7. Decimal precision (eliminating floating-point inaccuracies like 0.1 + 0.2)
 * 8. End-to-end API integration via GET /api/transactions/summary
 */

import { PUT, DELETE } from '../src/app/api/transactions/[id]/route';
import { POST as createTransaction } from '../src/app/api/transactions/route';
import { GET as getSummary } from '../src/app/api/transactions/summary/route';
import { CustomerService } from '../src/lib/services/customerService';
import { TransactionService } from '../src/lib/services/transactionService';
import { calculateFinancialSummary, toPaise, fromPaise } from '../src/lib/utils/financial';
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
  console.log('🚀 Running Person 2 Financial Calculations Test Suite');
  console.log('===============================================================\n');

  // --- 1. Unit Test: Precision Math Helpers ---
  console.log('--- 1. Floating-point Currency Precision Tests ---');
  {
    const paise1 = toPaise(0.1);
    const paise2 = toPaise(0.2);
    const sumRupees = fromPaise(paise1 + paise2);
    assert(sumRupees === 0.3, '0.1 + 0.2 evaluates to exact 0.3 without float artifact (0.30000000000000004)');

    const fractionalSum = calculateFinancialSummary([
      { type: 'CREDIT', amount: 10000.1 },
      { type: 'CREDIT', amount: 5000.2 },
      { type: 'DEBIT', amount: 4000.15 },
      { type: 'DEBIT', amount: 2000.15 },
    ]);
    assert(fractionalSum.creditGiven === 15000.3, 'Credit Given with decimals is exact 15000.3');
    assert(fractionalSum.totalPaid === 6000.3, 'Total Paid with decimals is exact 6000.3');
    assert(fractionalSum.balance === 9000.0, 'Balance with decimals is exact 9000.0');
  }

  // --- 2. Zero Transactions Test ---
  console.log('\n--- 2. Zero Transactions State ---');
  {
    const emptySummary = calculateFinancialSummary([]);
    assert(emptySummary.balance === 0, 'Zero transactions => balance is 0');
    assert(emptySummary.creditGiven === 0, 'Zero transactions => creditGiven is 0');
    assert(emptySummary.totalPaid === 0, 'Zero transactions => totalPaid is 0');
  }

  // --- 3. Base Required Scenario: Credit ₹10,000 + Payment ₹4,000 ---
  console.log('\n--- 3. Required Test Scenario: Credit ₹10,000 & Payment ₹4,000 ---');
  {
    const baseSummary = calculateFinancialSummary([
      { type: 'CREDIT', amount: 10000 },
      { type: 'DEBIT', amount: 4000 },
    ]);

    assert(baseSummary.creditGiven === 10000, 'Credit Given is ₹10,000');
    assert(baseSummary.totalPaid === 4000, 'Total Paid is ₹4,000');
    assert(baseSummary.balance === 6000, 'Project-defined Balance is ₹6,000 (10,000 - 4,000)');
  }

  // --- 4. Multiple Credits & Multiple Payments Test ---
  console.log('\n--- 4. Multiple Credits & Multiple Payments Accumulation ---');
  {
    const multiSummary = calculateFinancialSummary([
      { type: 'CREDIT_GIVEN', amount: 10000 },
      { type: 'CREDIT_GIVEN', amount: 5000 },
      { type: 'CREDIT_GIVEN', amount: 2500 },
      { type: 'PAYMENT_RECEIVED', amount: 4000 },
      { type: 'PAYMENT_RECEIVED', amount: 3500 },
    ]);

    assert(multiSummary.creditGiven === 17500, 'Multiple Credits: Credit Given is ₹17,500 (10k + 5k + 2.5k)');
    assert(multiSummary.totalPaid === 7500, 'Multiple Payments: Total Paid is ₹7,500 (4k + 3.5k)');
    assert(multiSummary.balance === 10000, 'Balance is ₹10,000 (17,500 - 7,500)');
  }

  // --- 5. End-to-End API Integration & Dynamic State Updates ---
  console.log('\n--- 5. End-to-End API Integration (Add -> Edit -> Delete -> Summary) ---');
  {
    TransactionService.resetStore();

    const customer = await CustomerService.create({
      name: 'Ramesh Stores - Financial Test',
      phone: '9877001122',
      initialBalance: 0,
      shopkeeperId: 'financial-test-shopkeeper',
    });

    // Step A: Add Credit ₹10,000
    const addTx1 = await createTransaction(
      new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'financial-test-shopkeeper' },
        body: JSON.stringify({
          customerId: customer.id,
          type: 'CREDIT_GIVEN',
          amount: 10000,
          date: new Date().toISOString(),
          paymentMethod: 'Cash',
          description: 'Initial wholesale credit',
        }),
      })
    );
    assert(addTx1.status === 201, 'Added Credit transaction ₹10,000');
    const tx1Data = (await addTx1.json()).data;

    // Step B: Add Payment ₹4,000
    const addTx2 = await createTransaction(
      new NextRequest('http://localhost:3000/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'financial-test-shopkeeper' },
        body: JSON.stringify({
          customerId: customer.id,
          type: 'PAYMENT_RECEIVED',
          amount: 4000,
          date: new Date().toISOString(),
          paymentMethod: 'UPI',
          description: 'Customer UPI payment',
        }),
      })
    );
    assert(addTx2.status === 201, 'Added Payment transaction ₹4,000');
    const tx2Data = (await addTx2.json()).data;

    // Verify Summary via API
    const summaryReq1 = new NextRequest('http://localhost:3000/api/transactions/summary', {
      headers: { 'x-user-id': 'financial-test-shopkeeper' },
    });
    const summaryRes1 = await getSummary(summaryReq1);
    assert(summaryRes1.status === 200, 'GET /api/transactions/summary returns 200 OK');
    const summaryData1 = (await summaryRes1.json()).data;

    assert(summaryData1.creditGiven === 10000, 'API Summary: Credit Given is ₹10,000');
    assert(summaryData1.totalPaid === 4000, 'API Summary: Total Paid is ₹4,000');
    assert(summaryData1.balance === 6000, 'API Summary: Balance is ₹6,000');

    // Step C: Edit Transaction (Change Credit from ₹10,000 to ₹12,500)
    const editRes = await PUT(
      new NextRequest(`http://localhost:3000/api/transactions/${tx1Data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'financial-test-shopkeeper' },
        body: JSON.stringify({
          amount: 12500,
        }),
      }),
      { params: Promise.resolve({ id: tx1Data.id }) }
    );
    assert(editRes.status === 200, 'PUT /api/transactions/:id updated Credit to ₹12,500');

    const summaryRes2 = await getSummary(summaryReq1);
    const summaryData2 = (await summaryRes2.json()).data;
    assert(summaryData2.creditGiven === 12500, 'After Edit: Credit Given updated to ₹12,500');
    assert(summaryData2.balance === 8500, 'After Edit: Balance updated to ₹8,500 (12,500 - 4,000)');

    // Step D: Delete Transaction (Soft-delete Payment of ₹4,000)
    const deleteRes = await DELETE(
      new NextRequest(`http://localhost:3000/api/transactions/${tx2Data.id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'financial-test-shopkeeper' },
      }),
      { params: Promise.resolve({ id: tx2Data.id }) }
    );
    assert(deleteRes.status === 200, 'DELETE /api/transactions/:id soft-deleted Payment');

    const summaryRes3 = await getSummary(summaryReq1);
    const summaryData3 = (await summaryRes3.json()).data;
    assert(summaryData3.totalPaid === 0, 'After Delete: Total Paid updated to 0');
    assert(summaryData3.balance === 12500, 'After Delete: Balance updated to ₹12,500 (12,500 - 0)');
  }

  console.log('\n===============================================================');
  console.log(`📊 Financial Calculations Summary: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Financial test suite failed:', err);
  process.exit(1);
});
