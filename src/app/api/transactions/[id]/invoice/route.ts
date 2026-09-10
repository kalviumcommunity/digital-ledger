import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/validations/transaction';
import { TransactionService } from '@/lib/services/transactionService';
import {
  buildInvoiceData,
  generateInvoicePdf,
  generateInvoiceHtml,
} from '@/lib/utils/invoiceGenerator';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 1. Authenticate user
    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized access', 401);
    }

    // 2. Fetch transaction with tenant check
    const result = await TransactionService.getById(id, user.shopkeeperId);

    if (result.unauthorized) {
      return apiError('FORBIDDEN', 'User is not authorized to access this transaction invoice', 403);
    }

    if (result.notFound || !result.transaction) {
      return apiError('NOT_FOUND', 'Transaction not found', 404);
    }

    const { transaction } = result;

    // 3. Build sanitized, public-safe invoice data model
    const invoiceData = buildInvoiceData({
      id: transaction.id,
      ledgerId: transaction.ledgerId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      createdAt: transaction.createdAt,
      paymentMethod: transaction.paymentMethod,
      note: transaction.note,
      ledger: transaction.ledger,
    });

    // 4. Negotiate output format (pdf by default, or html / json)
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || '').toLowerCase();
    const acceptHeader = req.headers.get('accept') || '';

    if (format === 'json' || acceptHeader.includes('application/json')) {
      return apiSuccess(invoiceData, 200);
    }

    if (format === 'html' || acceptHeader.includes('text/html')) {
      const html = generateInvoiceHtml(invoiceData);
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Default: generate binary PDF attachment
    const pdfBuffer = generateInvoicePdf(invoiceData);
    const safeFilename = `invoice-${transaction.id.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/transactions/:id/invoice:', error);
    return apiError('INTERNAL_ERROR', 'Failed to generate invoice', 500);
  }
}
