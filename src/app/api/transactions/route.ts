/**
 * ============================================================================
 * REST API ROUTE: /api/transactions
 * ============================================================================
 * 
 * WHY A REST API LAYER IN ADDITION TO SERVER ACTIONS?
 * 1. Server Actions are designed for internal Next.js React components.
 * 2. REST API endpoints (`/api/*`) provide an open, standardized HTTP interface
 *    for external systems, mobile apps, postman, automated testing suites,
 *    and third-party integrations.
 * 
 * REQUEST EXECUTION PIPELINE (POST /api/transactions):
 * 1. Authenticate Request: Validates bearer tokens or cookies.
 * 2. Parse JSON: Catches malformed JSON payloads early.
 * 3. Validate Schema: Checks amounts (>0), types (CREDIT/DEBIT), dates, and notes.
 * 4. Verify Ownership: Confirms the target customer ledger belongs to the caller.
 * 5. Atomic Insertion: Writes the transaction and updates ledger running totals.
 */

import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  validateCreateTransaction,
  TransactionTypeEnum,
} from '@/lib/validations/transaction';
import { TransactionService } from '@/lib/services/transactionService';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized access', 401);
    }

    // 2. Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Invalid JSON body', 400, [
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    // 3. Validate input payload
    const validation = validateCreateTransaction(body);
    if (!validation.isValid || !validation.data) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, validation.details);
    }

    const { ledgerId, type, amount, date, paymentMethod, note } = validation.data;

    // 4. Verify Customer/Ledger existence and ownership
    const customerCheck = await TransactionService.verifyCustomer(ledgerId, user.shopkeeperId);

    if (!customerCheck.exists) {
      return apiError('VALIDATION_ERROR', 'Ledger not found', 400, [
        { field: 'ledgerId', message: 'Ledger not found' },
      ]);
    }

    if (!customerCheck.authorized) {
      return apiError('FORBIDDEN', 'Customer does not belong to current user', 403);
    }

    // 5. Create Transaction in Database
    const transaction = await TransactionService.create({
      ledgerId,
      type,
      amount,
      date,
      paymentMethod,
      note,
    });

    // Format output
    const formatted = {
      id: transaction.id,
      ledgerId: transaction.ledgerId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date,
      paymentMethod: transaction.paymentMethod,
      note: transaction.note,
      version: transaction.version,
      isDeleted: transaction.isDeleted,
      createdAt: transaction.createdAt instanceof Date ? transaction.createdAt.toISOString() : transaction.createdAt,
      updatedAt: transaction.updatedAt instanceof Date ? transaction.updatedAt.toISOString() : transaction.updatedAt,
    };

    return apiSuccess(formatted, 201);
  } catch (error) {
    console.error('Error in POST /api/transactions:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user
    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized access', 401);
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
    const search = searchParams.get('search')?.trim() || '';
    const rawType = searchParams.get('type')?.trim().toUpperCase();
    const paymentMethod = searchParams.get('paymentMethod')?.trim();
    const dateFrom = searchParams.get('dateFrom')?.trim();
    const dateTo = searchParams.get('dateTo')?.trim();
    const sortByParam = searchParams.get('sortBy')?.trim() || 'date';
    const sortOrderParam = searchParams.get('sortOrder')?.trim().toLowerCase() || 'desc';
    const ledgerId = (searchParams.get('ledgerId') || searchParams.get('customerId'))?.trim();

    // Map type if needed
    let filterType: TransactionTypeEnum | undefined;
    if (rawType === 'CREDIT' || rawType === 'CREDIT_GIVEN') {
      filterType = 'CREDIT';
    } else if (rawType === 'DEBIT' || rawType === 'PAYMENT_RECEIVED') {
      filterType = 'DEBIT';
    }

    // Sorting fields validation
    const allowedSortFields: ('date' | 'amount' | 'createdAt')[] = ['date', 'amount', 'createdAt'];
    const sortBy = allowedSortFields.includes(sortByParam as 'date' | 'amount' | 'createdAt')
      ? (sortByParam as 'date' | 'amount' | 'createdAt')
      : 'date';
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    // 3. Query Service
    const { transactions, total, totalPages } = await TransactionService.list({
      shopkeeperId: user.shopkeeperId,
      page,
      limit,
      search: search || undefined,
      type: filterType,
      paymentMethod: paymentMethod || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortOrder,
      ledgerId: ledgerId || undefined,
    });

    // Format response items
    const data = transactions.map((tx) => ({
      id: tx.id,
      ledgerId: tx.ledgerId,
      type: tx.type,
      amount: tx.amount,
      date: tx.date instanceof Date ? tx.date.toISOString() : tx.date,
      paymentMethod: tx.paymentMethod,
      note: tx.note,
      version: tx.version,
      isDeleted: tx.isDeleted,
      createdAt: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : tx.createdAt,
      updatedAt: tx.updatedAt instanceof Date ? tx.updatedAt.toISOString() : tx.updatedAt,
      ledger: tx.ledger
        ? {
            id: tx.ledger.id,
            title: tx.ledger.title,
          }
        : undefined,
    }));

    return apiSuccess(data, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('Error in GET /api/transactions:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
