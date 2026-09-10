import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  validateUpdateTransaction,
} from '@/lib/validations/transaction';
import { TransactionService } from '@/lib/services/transactionService';

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

    // 2. Fetch transaction
    const result = await TransactionService.getById(id, user.shopkeeperId);

    if (result.unauthorized) {
      return apiError('FORBIDDEN', 'User is not authorized to access this transaction', 403);
    }

    if (result.notFound || !result.transaction) {
      return apiError('NOT_FOUND', 'Transaction not found', 404);
    }

    const { transaction } = result;
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
      ledger: transaction.ledger
        ? {
            id: transaction.ledger.id,
            title: transaction.ledger.title,
          }
        : undefined,
    };

    return apiSuccess(formatted, 200);
  } catch (error) {
    console.error('Error in GET /api/transactions/:id:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

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

    // 3. Validate update payload
    const validation = validateUpdateTransaction(body);
    if (!validation.isValid || !validation.data) {
      return apiError('VALIDATION_ERROR', 'Invalid request body', 400, validation.details);
    }

    // 4. Update transaction via service
    const result = await TransactionService.update(id, user.shopkeeperId, validation.data);

    if (result.unauthorized) {
      return apiError('FORBIDDEN', 'User is not authorized to update this transaction', 403);
    }

    if (result.notFound || !result.transaction) {
      return apiError('NOT_FOUND', 'Transaction not found', 404);
    }

    const { transaction } = result;
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
      ledger: transaction.ledger
        ? {
            id: transaction.ledger.id,
            title: transaction.ledger.title,
          }
        : undefined,
    };

    return apiSuccess(formatted, 200);
  } catch (error) {
    console.error('Error in PUT /api/transactions/:id:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // 1. Authenticate user
    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized access', 401);
    }

    // 2. Soft delete transaction via service
    const result = await TransactionService.delete(id, user.shopkeeperId);

    if (result.unauthorized) {
      return apiError('FORBIDDEN', 'User is not authorized to delete this transaction', 403);
    }

    if (result.notFound || !result.transaction) {
      return apiError('NOT_FOUND', 'Transaction not found', 404);
    }

    const { transaction } = result;
    return apiSuccess({
      id: transaction.id,
      isDeleted: transaction.isDeleted,
      updatedAt: transaction.updatedAt instanceof Date ? transaction.updatedAt.toISOString() : transaction.updatedAt,
    }, 200);
  } catch (error) {
    console.error('Error in DELETE /api/transactions/:id:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
