/**
 * Test Suite for Person 2 Global Transaction History with Real Transaction API
 *
 * Verifies:
 * 1. Global history queries GET /api/transactions
 * 2. Cross-customer transaction streams (multiple customers appearing in global history)
 * 3. Server pagination (page, limit, total, totalPages)
 * 4. Search by customer name, note/description
 * 5. Filter by type (CREDIT / DEBIT) and payment method
 * 6. Sorting by date and amount
 */

import { GET } from '../src/app/api/transactions/route';
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
  console.log('===============================================================');
  console.log('🚀 Running Person 2 Global Transaction History API Tests');
  console.log('===============================================================\n');

  // Reset store
  TransactionService.resetStore();

  // Create 3 distinct customers under the default shopkeeper
  const customerA = await CustomerService.create({
    name: 'Aarav Patel - Stationary',
    phone: '9811001122',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  const customerB = await CustomerService.create({
    name: 'Bhavna Joshi - Textiles',
    phone: '9822003344',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  const customerC = await CustomerService.create({
    name: 'Chirag Mehta - Electronics',
    phone: '9833005566',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  // Create transactions for each customer
  const tx1 = await POST(
    new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        customerId: customerA.id,
        type: 'CREDIT_GIVEN',
        amount: 2500,
        date: '2026-09-01T10:00:00Z',
        paymentMethod: 'Cash',
        description: 'Office stationery supplies',
      }),
    })
  );
  assert(tx1.status === 201, 'Created transaction for Customer A');

  const tx2 = await POST(
    new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        customerId: customerB.id,
        type: 'PAYMENT_RECEIVED',
        amount: 5000,
        date: '2026-09-02T11:00:00Z',
        paymentMethod: 'UPI',
        description: 'Cotton roll partial payment',
      }),
    })
  );
  assert(tx2.status === 201, 'Created transaction for Customer B');

  const tx3 = await POST(
    new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        customerId: customerC.id,
        type: 'CREDIT_GIVEN',
        amount: 15000,
        date: '2026-09-03T12:00:00Z',
        paymentMethod: 'Bank Transfer',
        description: 'Smart display inventory',
      }),
    })
  );
  assert(tx3.status === 201, 'Created transaction for Customer C');

  // --- 1. Global Transaction History Cross-Customer Check ---
  console.log('\n--- 1. Multi-Customer Global Transaction Stream ---');
  {
    const req = new NextRequest('http://localhost:3000/api/transactions?limit=20', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await GET(req);
    assert(res.status === 200, 'GET /api/transactions returns 200 OK');
    const json = await res.json();
    assert(json.success === true, 'Response success is true');
    assert(Array.isArray(json.data), 'Data is array');

    const customerIdsInStream = new Set(json.data.map((tx: { ledgerId: string }) => tx.ledgerId));
    assert(customerIdsInStream.has(customerA.id), 'Customer A transactions present in global stream');
    assert(customerIdsInStream.has(customerB.id), 'Customer B transactions present in global stream');
    assert(customerIdsInStream.has(customerC.id), 'Customer C transactions present in global stream');
    assert(customerIdsInStream.size >= 3, 'Global stream contains transactions from multiple distinct customers');
  }

  // --- 2. Pagination Check ---
  console.log('\n--- 2. Pagination (Page 1 vs Page 2) ---');
  {
    const reqPage1 = new NextRequest('http://localhost:3000/api/transactions?page=1&limit=2', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resPage1 = await GET(reqPage1);
    const jsonPage1 = await resPage1.json();
    assert(jsonPage1.data.length === 2, 'Page 1 returns exactly limit=2 items');
    assert(jsonPage1.pagination.page === 1, 'Pagination meta page is 1');
    assert(jsonPage1.pagination.limit === 2, 'Pagination meta limit is 2');
    assert(jsonPage1.pagination.total >= 3, 'Total items count >= 3');
    assert(jsonPage1.pagination.totalPages >= 2, 'Total pages >= 2');

    const reqPage2 = new NextRequest('http://localhost:3000/api/transactions?page=2&limit=2', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resPage2 = await GET(reqPage2);
    const jsonPage2 = await resPage2.json();
    assert(jsonPage2.data.length >= 1, 'Page 2 returns remaining items');
    assert(jsonPage2.pagination.page === 2, 'Pagination meta page is 2');
    assert(jsonPage1.data[0].id !== jsonPage2.data[0].id, 'Page 1 and Page 2 contain distinct transactions');
  }

  // --- 3. Search Filter Check ---
  console.log('\n--- 3. Search by Customer Name & Note ---');
  {
    // Search by Customer Name
    const reqName = new NextRequest('http://localhost:3000/api/transactions?search=Bhavna', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resName = await GET(reqName);
    const jsonName = await resName.json();
    assert(jsonName.data.length >= 1, 'Search for "Bhavna" returns matches');
    assert(
      jsonName.data.every((tx: { ledger?: { title: string } }) =>
        (tx.ledger?.title || '').toLowerCase().includes('bhavna')
      ),
      'All matched items belong to Bhavna'
    );

    // Search by Note
    const reqNote = new NextRequest('http://localhost:3000/api/transactions?search=stationery', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resNote = await GET(reqNote);
    const jsonNote = await resNote.json();
    assert(jsonNote.data.length >= 1, 'Search for "stationery" returns matches');
    assert(
      jsonNote.data.some((tx: { note?: string }) =>
        (tx.note || '').toLowerCase().includes('stationery')
      ),
      'Matched item note contains "stationery"'
    );
  }

  // --- 4. Filter by Type and Payment Method ---
  console.log('\n--- 4. Filter by Type (CREDIT / DEBIT) & Payment Method ---');
  {
    // Filter CREDIT
    const reqCredit = new NextRequest('http://localhost:3000/api/transactions?type=CREDIT', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resCredit = await GET(reqCredit);
    const jsonCredit = await resCredit.json();
    assert(
      jsonCredit.data.every((tx: { type: string }) => tx.type === 'CREDIT'),
      'All results with type=CREDIT have type CREDIT'
    );

    // Filter DEBIT
    const reqDebit = new NextRequest('http://localhost:3000/api/transactions?type=DEBIT', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resDebit = await GET(reqDebit);
    const jsonDebit = await resDebit.json();
    assert(
      jsonDebit.data.every((tx: { type: string }) => tx.type === 'DEBIT'),
      'All results with type=DEBIT have type DEBIT'
    );

    // Filter UPI
    const reqUpi = new NextRequest('http://localhost:3000/api/transactions?paymentMethod=UPI', {
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const resUpi = await GET(reqUpi);
    const jsonUpi = await resUpi.json();
    assert(
      jsonUpi.data.every((tx: { paymentMethod: string }) => tx.paymentMethod === 'UPI'),
      'All results with paymentMethod=UPI have UPI'
    );
  }

  // --- 5. Sorting Check ---
  console.log('\n--- 5. Sorting by Amount (Ascending vs Descending) ---');
  {
    const reqDesc = new NextRequest(
      'http://localhost:3000/api/transactions?sortBy=amount&sortOrder=desc',
      { headers: { 'x-user-id': 'default-shopkeeper-id' } }
    );
    const resDesc = await GET(reqDesc);
    const jsonDesc = await resDesc.json();
    if (jsonDesc.data.length >= 2) {
      assert(
        jsonDesc.data[0].amount >= jsonDesc.data[1].amount,
        'Amount desc: First item amount >= second item amount'
      );
    }

    const reqAsc = new NextRequest(
      'http://localhost:3000/api/transactions?sortBy=amount&sortOrder=asc',
      { headers: { 'x-user-id': 'default-shopkeeper-id' } }
    );
    const resAsc = await GET(reqAsc);
    const jsonAsc = await resAsc.json();
    if (jsonAsc.data.length >= 2) {
      assert(
        jsonAsc.data[0].amount <= jsonAsc.data[1].amount,
        'Amount asc: First item amount <= second item amount'
      );
    }
  }

  console.log('\n===============================================================');
  console.log(`📊 Global Transaction History Summary: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
