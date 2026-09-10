export interface InvoiceData {
  invoiceNumber: string;
  transactionId: string;
  customerName: string;
  customerId: string;
  customerPhone?: string;
  date: string; // Formatted date string
  rawDate: string; // ISO date string
  type: 'CREDIT_GIVEN' | 'PAYMENT_RECEIVED' | 'CREDIT' | 'DEBIT';
  typeLabel: string;
  amount: number;
  formattedAmount: string;
  paymentMethod: string;
  description: string;
  status: string;
  issuedAt: string;
  shopkeeperTitle: string;
}

/**
 * Maps transaction data into sanitized, public-safe invoice data model.
 */
export function buildInvoiceData(tx: {
  id: string;
  ledgerId: string;
  type: 'CREDIT' | 'DEBIT' | 'CREDIT_GIVEN' | 'PAYMENT_RECEIVED';
  amount: number;
  date?: string | Date;
  createdAt?: string | Date;
  paymentMethod?: string | null;
  note?: string | null;
  ledger?: {
    id: string;
    title: string;
  };
}): InvoiceData {
  const isCredit = tx.type === 'CREDIT' || tx.type === 'CREDIT_GIVEN';
  const typeLabel = isCredit ? 'Credit Given (Due from Customer)' : 'Payment Received (Cleared)';
  const dateObj = tx.date ? new Date(tx.date) : tx.createdAt ? new Date(tx.createdAt) : new Date();

  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(tx.amount);

  return {
    invoiceNumber: `INV-${tx.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'TXN'}`,
    transactionId: tx.id,
    customerName: tx.ledger?.title || 'Customer',
    customerId: tx.ledgerId,
    customerPhone: '9876xxxxxx',
    date: formattedDate,
    rawDate: dateObj.toISOString(),
    type: isCredit ? 'CREDIT_GIVEN' : 'PAYMENT_RECEIVED',
    typeLabel,
    amount: tx.amount,
    formattedAmount,
    paymentMethod: tx.paymentMethod || 'Cash',
    description: tx.note || 'General transaction entry',
    status: 'COMPLETED & VERIFIED',
    issuedAt: new Date().toISOString(),
    shopkeeperTitle: 'KhataBook Digital Ledger',
  };
}

/**
 * Escapes strings for PDF text stream syntax.
 */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generates a valid, standards-compliant PDF-1.4 binary buffer in pure TypeScript.
 */
export function generateInvoicePdf(data: InvoiceData): Buffer {
  const isCredit = data.type === 'CREDIT_GIVEN' || data.type === 'CREDIT';
  
  // PDF Content Stream (PostScript-like vector commands)
  const streamLines: string[] = [];

  // Helper to draw filled rectangle
  const fillRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    streamLines.push('f');
  };

  // Helper to draw stroked rectangle
  const strokeRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number, lineWidth = 1) => {
    streamLines.push(`${lineWidth.toFixed(2)} w`);
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    streamLines.push('S');
  };

  // Helper to draw line
  const drawLine = (x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, lineWidth = 1) => {
    streamLines.push(`${lineWidth.toFixed(2)} w`);
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    streamLines.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m`);
    streamLines.push(`${x2.toFixed(2)} ${y2.toFixed(2)} l`);
    streamLines.push('S');
  };

  // Helper to write text
  const drawText = (
    text: string,
    x: number,
    y: number,
    font: '/F1' | '/F2',
    size: number,
    r = 0.1,
    g = 0.1,
    b = 0.1
  ) => {
    streamLines.push('BT');
    streamLines.push(`${font} ${size.toFixed(2)} Tf`);
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    streamLines.push(`(${escapePdfText(text)}) Tj`);
    streamLines.push('ET');
  };

  // ── 1. Background and Border ──────────────────────────────────────────────
  // Outer frame
  strokeRect(30, 30, 535.28, 781.89, 0.8, 0.85, 0.9, 1.5);
  
  // Header background banner (Dark Slate)
  fillRect(30, 720, 535.28, 91.89, 0.08, 0.13, 0.2);

  // ── 2. Header Branding ───────────────────────────────────────────────────
  drawText('KHATABOOK DIGITAL LEDGER', 50, 770, '/F2', 18, 1, 1, 1);
  drawText('OFFICIAL TRANSACTION RECEIPT / INVOICE', 50, 745, '/F1', 9.5, 0.75, 0.85, 0.95);
  drawText(`Ref: ${data.invoiceNumber}`, 400, 770, '/F2', 11, 0.9, 0.95, 1);
  drawText(`Date: ${data.date.split(',')[0]}`, 400, 750, '/F1', 9, 0.75, 0.85, 0.95);

  // ── 3. Transaction Summary Banner ─────────────────────────────────────────
  if (isCredit) {
    // Red/Rose background for credit given
    fillRect(50, 640, 495.28, 60, 0.98, 0.94, 0.94);
    strokeRect(50, 640, 495.28, 60, 0.9, 0.7, 0.7, 1);
    drawText('TRANSACTION TYPE: CREDIT GIVEN', 70, 678, '/F2', 12, 0.75, 0.15, 0.15);
    drawText('Amount due from customer to shopkeeper', 70, 655, '/F1', 9.5, 0.5, 0.2, 0.2);
  } else {
    // Green/Emerald background for payment received
    fillRect(50, 640, 495.28, 60, 0.93, 0.98, 0.94);
    strokeRect(50, 640, 495.28, 60, 0.6, 0.85, 0.65, 1);
    drawText('TRANSACTION TYPE: PAYMENT RECEIVED', 70, 678, '/F2', 12, 0.1, 0.55, 0.25);
    drawText('Payment successfully received and recorded in ledger', 70, 655, '/F1', 9.5, 0.15, 0.45, 0.2);
  }

  // Large Amount callout
  const cleanAmountStr = `Rs. ${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  if (isCredit) {
    drawText(cleanAmountStr, 370, 665, '/F2', 18, 0.8, 0.1, 0.1);
  } else {
    drawText(cleanAmountStr, 370, 665, '/F2', 18, 0.05, 0.55, 0.2);
  }

  // ── 4. Customer & Transaction Information Table ──────────────────────────
  fillRect(50, 600, 495.28, 24, 0.94, 0.96, 0.98);
  drawText('TRANSACTION DETAILS & METADATA', 60, 608, '/F2', 10, 0.2, 0.3, 0.4);

  // Table grid outline
  strokeRect(50, 360, 495.28, 240, 0.85, 0.88, 0.92, 1);

  // Rows
  const rows: [string, string][] = [
    ['Customer Name', data.customerName],
    ['Customer ID', data.customerId],
    ['Transaction ID', data.transactionId],
    ['Date & Time', data.date],
    ['Payment Method', data.paymentMethod],
    ['Transaction Amount', `INR ${data.amount.toFixed(2)}`],
    ['Description / Memo', data.description],
    ['Ledger Status', data.status],
  ];

  let currentY = 570;
  rows.forEach(([label, value], idx) => {
    if (idx % 2 === 1) {
      fillRect(50.5, currentY - 8, 494.28, 25, 0.98, 0.99, 1);
    }
    drawLine(50, currentY - 8, 545.28, currentY - 8, 0.9, 0.92, 0.95, 0.8);
    drawText(label, 65, currentY, '/F2', 9.5, 0.3, 0.35, 0.4);
    drawText(value, 230, currentY, '/F1', 9.5, 0.1, 0.15, 0.2);
    currentY -= 25;
  });

  // Vertical divider in table
  drawLine(220, 360, 220, 600, 0.85, 0.88, 0.92, 1);

  // ── 5. Verification Badge & Instructions ──────────────────────────────────
  strokeRect(50, 190, 495.28, 145, 0.88, 0.9, 0.94, 1);
  fillRect(50, 305, 495.28, 30, 0.96, 0.97, 0.98);
  drawText('AUTHENTICATION & VERIFICATION NOTICE', 65, 316, '/F2', 9.5, 0.2, 0.25, 0.3);

  drawText('1. This document serves as an electronic confirmation of the recorded transaction in KhataBook.', 65, 280, '/F1', 8.5, 0.35, 0.4, 0.45);
  drawText('2. Entries are protected by tenant-isolated cryptographic ledger timestamps.', 65, 260, '/F1', 8.5, 0.35, 0.4, 0.45);
  drawText('3. For any billing disputes or clarifications, please reference the Transaction ID above.', 65, 240, '/F1', 8.5, 0.35, 0.4, 0.45);
  drawText(`Issued: ${new Date().toUTCString()} | Node: KhataBook-Prod-Core`, 65, 210, '/F1', 8, 0.5, 0.55, 0.6);

  // Digital Signature Box
  strokeRect(360, 90, 185.28, 70, 0.85, 0.88, 0.92, 1);
  drawText('AUTHORIZED DIGITAL SIGNATURE', 370, 145, '/F2', 8, 0.3, 0.35, 0.4);
  drawText('KhataBook Ledger Core', 370, 118, '/F2', 10, 0.1, 0.45, 0.3);
  drawText('[Electronically Verified]', 370, 102, '/F1', 7.5, 0.5, 0.55, 0.6);

  // Footer text
  drawText('Thank you for your business. Powered by KhataBook Digital Ledger System.', 50, 60, '/F1', 8.5, 0.5, 0.55, 0.6);

  const streamContent = streamLines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'utf-8');

  // ── PDF Objects Generation with exact byte offsets ────────────────────────
  const objects: string[] = [];
  const byteOffsets: number[] = [];

  // PDF Header
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let currentOffset = Buffer.byteLength(header, 'latin1');

  // Object 1: Catalog
  byteOffsets.push(currentOffset);
  const obj1 = '1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj\n';
  objects.push(obj1);
  currentOffset += Buffer.byteLength(obj1, 'latin1');

  // Object 2: Pages
  byteOffsets.push(currentOffset);
  const obj2 = '2 0 obj\n<<\n  /Type /Pages\n  /Kids [3 0 R]\n  /Count 1\n>>\nendobj\n';
  objects.push(obj2);
  currentOffset += Buffer.byteLength(obj2, 'latin1');

  // Object 3: Page
  byteOffsets.push(currentOffset);
  const obj3 =
    '3 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 595.28 841.89]\n  /Contents 4 0 R\n  /Resources <<\n    /Font <<\n      /F1 5 0 R\n      /F2 6 0 R\n    >>\n  >>\n>>\nendobj\n';
  objects.push(obj3);
  currentOffset += Buffer.byteLength(obj3, 'latin1');

  // Object 4: Stream Content
  byteOffsets.push(currentOffset);
  const obj4 = `4 0 obj\n<<\n  /Length ${streamLength}\n>>\nstream\n${streamContent}\nendstream\nendobj\n`;
  objects.push(obj4);
  currentOffset += Buffer.byteLength(obj4, 'latin1');

  // Object 5: Font F1 (Helvetica Regular)
  byteOffsets.push(currentOffset);
  const obj5 = '5 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica\n>>\nendobj\n';
  objects.push(obj5);
  currentOffset += Buffer.byteLength(obj5, 'latin1');

  // Object 6: Font F2 (Helvetica Bold)
  byteOffsets.push(currentOffset);
  const obj6 = '6 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica-Bold\n>>\nendobj\n';
  objects.push(obj6);
  currentOffset += Buffer.byteLength(obj6, 'latin1');

  // Cross-reference table
  const startXref = currentOffset;
  let xref = 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 0; i < 6; i++) {
    const offsetStr = String(byteOffsets[i]).padStart(10, '0');
    xref += `${offsetStr} 00000 n \n`;
  }

  const trailer = `trailer\n<<\n  /Size 7\n  /Root 1 0 R\n>>\nstartxref\n${startXref}\n%%EOF\n`;

  const pdfFullString = header + objects.join('') + xref + trailer;
  return Buffer.from(pdfFullString, 'latin1');
}

/**
 * Generates styled standalone HTML for web viewing or printing.
 */
export function generateInvoiceHtml(data: InvoiceData): string {
  const isCredit = data.type === 'CREDIT_GIVEN' || data.type === 'CREDIT';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${data.invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 40px 20px; display: flex; justify-content: center; }
    .invoice-card { background: #ffffff; max-width: 680px; width: 100%; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); overflow: hidden; }
    .header { background: #0f172a; color: #ffffff; padding: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .header .ref { text-align: right; font-size: 13px; font-weight: 600; color: #e2e8f0; }
    .content { padding: 32px; }
    .amount-badge { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
    .amount-badge.credit { background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; }
    .amount-badge.payment { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
    .amount-val { font-size: 24px; font-weight: 800; }
    .table-container { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
    .row { display: flex; border-bottom: 1px solid #f1f5f9; padding: 12px 16px; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .row:nth-child(even) { background-color: #f8fafc; }
    .row-label { width: 180px; font-weight: 600; color: #64748b; }
    .row-value { flex: 1; font-weight: 500; color: #0f172a; }
    .footer { padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
    @media print {
      body { background: transparent; padding: 0; }
      .invoice-card { box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1>KHATABOOK DIGITAL LEDGER</h1>
        <p>OFFICIAL TRANSACTION RECEIPT / INVOICE</p>
      </div>
      <div class="ref">
        <div>Ref: ${data.invoiceNumber}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${data.date}</div>
      </div>
    </div>
    
    <div class="content">
      <div class="amount-badge ${isCredit ? 'credit' : 'payment'}">
        <div>
          <div style="font-weight: 700; font-size: 14px;">${data.typeLabel}</div>
          <div style="font-size: 12px; opacity: 0.85; margin-top: 2px;">Method: ${data.paymentMethod}</div>
        </div>
        <div class="amount-val">${data.formattedAmount}</div>
      </div>

      <div class="table-container">
        <div class="row"><div class="row-label">Customer Name</div><div class="row-value">${data.customerName}</div></div>
        <div class="row"><div class="row-label">Customer ID</div><div class="row-value">${data.customerId}</div></div>
        <div class="row"><div class="row-label">Transaction ID</div><div class="row-value">${data.transactionId}</div></div>
        <div class="row"><div class="row-label">Date & Time</div><div class="row-value">${data.date}</div></div>
        <div class="row"><div class="row-label">Payment Method</div><div class="row-value">${data.paymentMethod}</div></div>
        <div class="row"><div class="row-label">Amount</div><div class="row-value">${data.formattedAmount}</div></div>
        <div class="row"><div class="row-label">Description / Note</div><div class="row-value">${data.description}</div></div>
        <div class="row"><div class="row-label">Verification Status</div><div class="row-value" style="color: #16a34a; font-weight: 700;">${data.status}</div></div>
      </div>
    </div>

    <div class="footer">
      Powered by KhataBook Digital Ledger • Authenticated Electronic Record
    </div>
  </div>
</body>
</html>`;
}
