import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/validations/transaction';
import { CustomerService } from '@/lib/services/customerService';

export async function GET(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized access', 401);
    }

    const customers = await CustomerService.getAll(user.shopkeeperId);
    return apiSuccess(customers, 200);
  } catch (error) {
    console.error('Error in GET /api/customers:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred while fetching customers', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Unauthorized access', 401);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Invalid JSON body', 400, [
        { field: 'body', message: 'Request body must be valid JSON' },
      ]);
    }

    const raw = body as Record<string, unknown>;
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    const phone = typeof raw?.phone === 'string' ? raw.phone.trim() : undefined;
    const initialBalance = typeof raw?.initialBalance === 'number' ? raw.initialBalance : 0;

    if (!name) {
      return apiError('VALIDATION_ERROR', 'Customer name is required', 400, [
        { field: 'name', message: 'Name is required' },
      ]);
    }

    const created = await CustomerService.create({
      name,
      phone,
      initialBalance,
      shopkeeperId: user.shopkeeperId,
    });

    return apiSuccess(created, 201);
  } catch (error) {
    console.error('Error in POST /api/customers:', error);
    return apiError('INTERNAL_ERROR', 'An unexpected error occurred while creating customer', 500);
  }
}
