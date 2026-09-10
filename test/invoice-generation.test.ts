/**
 * Test Suite for Person 2's Download Invoice functionality.
 *
 * Verifies:
 * 1. Invoice generation for PAYMENT transaction (PDF binary, Content-Type, Content-Disposition).
 * 2. Invoice generation for CREDIT transaction (PDF binary, Content-Type, Content-Disposition).
 * 3. Structured JSON format output (?format=json) & sensitive data protection.
 * 4. Printable HTML format output (?format=html).
 * 5. Invalid / non-existent transaction ID -> 404 Not Found.
 * 6. Soft-deleted transaction invoice lookup -> 404 Not Found.
 * 7. Security: Unauthenticated request -> 401 Unauthorized.
 * 8. Security: Cross-shopkeeper tenant isolation -> 403 Forbidden.
 * 9. Pure TS PDF structure verification (PDF-1.4 magic bytes, objects, trailer, EOF).
 */

import { GET as getInvoice } from '../src/app/api/transactions/[id]/invoice/route';
import { POST as createTransaction } from '../src/app/api/transactions/route';
import { DELETE as deleteTransaction } from '../src/app/api/transactions/[id]/route';
import { CustomerService } from '../src/lib/services/customerService';
import { TransactionService } from '../src/lib/services/transactionService';
import { buildInvoiceData, generateInvoicePdf, generateInvoiceHtml } from '../src/lib/utils/invoiceGenerator';
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
  console.log('🚀 Running Person 2 Download Invoice Tests');
  console.log('===============================================================\n');

  // Reset stores
  TransactionService.resetStore();
  CustomerService.resetStore();

  // Create test customer
  const customer = await CustomerService.create({
    name: 'Harish Patel',
    phone: '9820011223',
    initialBalance: 0,
    shopkeeperId: 'default-shopkeeper-id',
  });

  // Seed 1: Payment Transaction ₹4,500 via UPI
  const payTxRes = await createTransaction(
    new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        customerId: customer.id,
        type: 'PAYMENT_RECEIVED',
        amount: 4500,
        paymentMethod: 'UPI',
        description: 'Invoice #801 Advance clearance',
      }),
    })
  );
  const payTxJson = await payTxRes.json();
  const payTxId = payTxJson.data.id;

  // Seed 2: Credit Transaction ₹12,500 via Cash
  const creditTxRes = await createTransaction(
    new NextRequest('http://localhost:3000/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-shopkeeper-id' },
      body: JSON.stringify({
        customerId: customer.id,
        type: 'CREDIT_GIVEN',
        amount: 12500,
        paymentMethod: 'Cash',
        description: 'Monthly grocery supply bundle',
      }),
    })
  );
  const creditTxJson = await creditTxRes.json();
  const creditTxId = creditTxJson.data.id;

  assert(payTxRes.status === 201 && creditTxRes.status === 201, 'Created Payment (₹4.5k) and Credit (₹12.5k) test transactions');

  // --- 1. PAYMENT TRANSACTION PDF INVOICE ---
  console.log('\n--- 1. Payment Transaction Invoice (PDF) ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${payTxId}/invoice`, {
      method: 'GET',
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await getInvoice(req, { params: Promise.resolve({ id: payTxId }) });

    assert(res.status === 200, 'GET /api/transactions/:id/invoice returns 200 OK');
    assert(res.headers.get('content-type') === 'application/pdf', 'Content-Type is application/pdf');
    assert(
      (res.headers.get('content-disposition') || '').includes('attachment') &&
      (res.headers.get('content-disposition') || '').includes(payTxId),
      'Content-Disposition attachment filename contains transaction ID'
    );

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfStr = buffer.toString('latin1');

    assert(pdfStr.startsWith('%PDF-1.4'), 'PDF buffer starts with %PDF-1.4 header');
    assert(pdfStr.includes('%%EOF'), 'PDF buffer contains %%EOF terminator');
    assert(pdfStr.includes('KHATABOOK DIGITAL LEDGER'), 'PDF content includes header branding');
    assert(pdfStr.includes('PAYMENT RECEIVED'), 'PDF content includes Payment Received type');
    assert(pdfStr.includes('4,500.00'), 'PDF content includes formatted transaction amount ₹4,500.00');
  }

  // --- 2. CREDIT TRANSACTION PDF INVOICE ---
  console.log('\n--- 2. Credit Transaction Invoice (PDF) ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${creditTxId}/invoice`, {
      method: 'GET',
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await getInvoice(req, { params: Promise.resolve({ id: creditTxId }) });

    assert(res.status === 200, 'GET /api/transactions/:id/invoice returns 200 OK for Credit transaction');
    assert(res.headers.get('content-type') === 'application/pdf', 'Content-Type is application/pdf');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfStr = buffer.toString('latin1');

    assert(pdfStr.includes('CREDIT GIVEN'), 'PDF content indicates Credit Given transaction type');
    assert(pdfStr.includes('12,500.00'), 'PDF content includes formatted credit amount ₹12,500.00');
    assert(pdfStr.includes('Harish Patel'), 'PDF content includes Customer Name');
  }

  // --- 3. STRUCTURED JSON FORMAT & SENSITIVE DATA PROTECTION ---
  console.log('\n--- 3. JSON Format & Privacy Verification ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${creditTxId}/invoice?format=json`, {
      method: 'GET',
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await getInvoice(req, { params: Promise.resolve({ id: creditTxId }) });
    const json = await res.json();

    assert(res.status === 200, 'JSON format query returns 200 OK');
    assert(json.success === true, 'Response envelope has success: true');
    assert(json.data.customerName === 'Harish Patel', 'Customer name is Harish Patel');
    assert(json.data.amount === 12500, 'Amount is 12500');
    assert(json.data.type === 'CREDIT_GIVEN', 'Type is CREDIT_GIVEN');
    assert(json.data.paymentMethod === 'Cash', 'Payment method is Cash');
    assert(json.data.description === 'Monthly grocery supply bundle', 'Description is preserved');
    assert(json.data.invoiceNumber.startsWith('INV-'), 'Invoice number is structured properly (INV-...)');

    // Ensure no sensitive internal auth/password fields leaked
    const jsonString = JSON.stringify(json);
    assert(!jsonString.includes('passwordHash'), 'No password hashes leaked in invoice');
    assert(!jsonString.includes('secretToken'), 'No secret tokens leaked in invoice');
  }

  // --- 4. PRINTABLE HTML INVOICE FORMAT ---
  console.log('\n--- 4. HTML Format Verification ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${payTxId}/invoice?format=html`, {
      method: 'GET',
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await getInvoice(req, { params: Promise.resolve({ id: payTxId }) });
    const html = await res.text();

    assert(res.status === 200, 'HTML format query returns 200 OK');
    assert((res.headers.get('content-type') || '').includes('text/html'), 'Content-Type contains text/html');
    assert(html.includes('KHATABOOK DIGITAL LEDGER'), 'HTML contains branding header');
    assert(html.includes('Harish Patel'), 'HTML contains customer name');
    assert(html.includes('₹4,500.00'), 'HTML contains formatted INR amount');
  }

  // --- 5. INVALID TRANSACTION ID ---
  console.log('\n--- 5. Invalid Transaction ID (404 Not Found) ---');
  {
    const req = new NextRequest('http://localhost:3000/api/transactions/invalid-txn-99999/invoice', {
      method: 'GET',
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await getInvoice(req, { params: Promise.resolve({ id: 'invalid-txn-99999' }) });
    assert(res.status === 404, 'Invalid transaction ID returns 404 Not Found');

    const json = await res.json();
    assert(json.error.code === 'NOT_FOUND', 'Error code is NOT_FOUND');
    assert(json.error.message.includes('not found'), 'Error message is descriptive');
  }

  // --- 6. SOFT-DELETED TRANSACTION INVOICE LOOKUP ---
  console.log('\n--- 6. Soft-Deleted Transaction Lookup (404 Not Found) ---');
  {
    // Soft delete payTxId
    const delRes = await deleteTransaction(
      new NextRequest(`http://localhost:3000/api/transactions/${payTxId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'default-shopkeeper-id' },
      }),
      { params: Promise.resolve({ id: payTxId }) }
    );
    assert(delRes.status === 200, 'Soft deleted payment transaction');

    // Attempt invoice generation
    const req = new NextRequest(`http://localhost:3000/api/transactions/${payTxId}/invoice`, {
      method: 'GET',
      headers: { 'x-user-id': 'default-shopkeeper-id' },
    });
    const res = await getInvoice(req, { params: Promise.resolve({ id: payTxId }) });
    assert(res.status === 404, 'Deleted transaction invoice lookup returns 404 Not Found');
  }

  // --- 7. UNAUTHENTICATED REQUEST (401 UNAUTHORIZED) ---
  console.log('\n--- 7. Unauthenticated Request (401 Unauthorized) ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${creditTxId}/invoice`, {
      method: 'GET',
      headers: { 'x-unauthenticated': 'true' },
    });
    const res = await getInvoice(req, { params: Promise.resolve({ id: creditTxId }) });
    assert(res.status === 401, 'Unauthenticated request returns 401 Unauthorized');
    const json = await res.json();
    assert(json.error.code === 'UNAUTHORIZED', 'Error code is UNAUTHORIZED');
  }

  // --- 8. CROSS-TENANT FORBIDDEN REQUEST (403 FORBIDDEN) ---
  console.log('\n--- 8. Cross-Tenant Forbidden Request (403 Forbidden) ---');
  {
    const req = new NextRequest(`http://localhost:3000/api/transactions/${creditTxId}/invoice`, {
      method: 'GET',
      headers: { 'x-user-id': 'other-shopkeeper-id-888' },
    });
    const res = await getInvoice(req, { params: Promise.resolve({ id: creditTxId }) });
    assert(res.status === 403, 'Cross-tenant request returns 403 Forbidden');
    const json = await res.json();
    assert(json.error.code === 'FORBIDDEN', 'Error code is FORBIDDEN');
  }

  // --- 9. PURE TS PDF GENERATOR UNIT INTEGRITY ---
  console.log('\n--- 9. Pure TypeScript PDF Generator Unit Tests ---');
  {
    const mockData = buildInvoiceData({
      id: 'tx-unit-123',
      ledgerId: 'cust-123',
      type: 'CREDIT',
      amount: 5000,
      paymentMethod: 'Bank Transfer',
      note: 'Hardware parts',
      ledger: { id: 'cust-123', title: 'Tech Corp' },
    });

    const pdfBuffer = generateInvoicePdf(mockData);
    assert(Buffer.isBuffer(pdfBuffer), 'generateInvoicePdf returns valid Node Buffer');
    assert(pdfBuffer.length > 500, 'PDF buffer has meaningful binary size');

    const htmlOutput = generateInvoiceHtml(mockData);
    assert(htmlOutput.includes('Tech Corp'), 'generateInvoiceHtml outputs customer name');
    assert(htmlOutput.includes('Hardware parts'), 'generateInvoiceHtml outputs note');
  }

  console.log('\n===============================================================');
  console.log(`📊 Download Invoice Summary: ${passed} passed, ${failed} failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
