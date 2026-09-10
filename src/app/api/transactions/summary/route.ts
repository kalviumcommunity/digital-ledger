import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/validations/transaction';
import { TransactionService } from '@/lib/services/transactionService';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized access', 401);
    }

    const summary = await TransactionService.getSummary(user.shopkeeperId);
    return apiSuccess(summary, 200);
  } catch (error) {
    console.error('Error in GET /api/transactions/summary:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred while calculating summary', 500);
  }
}
