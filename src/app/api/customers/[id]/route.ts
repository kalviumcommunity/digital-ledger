import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/validations/transaction';
import { CustomerService } from '@/lib/services/customerService';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized access', 401);
    }

    const customer = await CustomerService.getById(id, user.shopkeeperId);

    if (!customer) {
      return apiError('NOT_FOUND', 'Customer not found', 404);
    }

    return apiSuccess(customer, 200);
  } catch (error) {
    console.error('Error in GET /api/customers/:id:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred while fetching customer', 500);
  }
}
