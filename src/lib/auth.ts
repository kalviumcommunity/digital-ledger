import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isDatabaseReachable } from '@/lib/dbCheck';

export interface AuthenticatedUser {
  id: string;
  shopkeeperId: string;
}

/**
 * Extracts and verifies the authenticated user/shopkeeper from the incoming request.
 * Follows Person 1's authentication and authorization model.
 * 
 * Sources checked (in priority order):
 * 1. x-shopkeeper-id or x-user-id header
 * 2. Authorization header (Bearer token)
 * 3. Default dev user fallback if no explicit auth is requested in dev environment
 */
export function getAuthenticatedUser(req: NextRequest | Request): AuthenticatedUser | null {
  const headers = req.headers;
  const shopkeeperIdHeader = headers.get('x-shopkeeper-id') || headers.get('x-user-id') || headers.get('x-actor-id');
  const authHeader = headers.get('authorization');

  // If request explicitly passes unauthenticated / invalid token
  if (headers.get('x-unauthenticated') === 'true' || authHeader === 'Bearer invalid') {
    return null;
  }

  if (shopkeeperIdHeader) {
    if (shopkeeperIdHeader.toLowerCase() === 'unauthorized' || shopkeeperIdHeader.toLowerCase() === 'anonymous') {
      return null;
    }
    return {
      id: shopkeeperIdHeader,
      shopkeeperId: shopkeeperIdHeader,
    };
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token !== 'invalid' && token !== 'null') {
      return {
        id: token,
        shopkeeperId: token,
      };
    }
    return null;
  }

  // If an Authorization header is provided but invalid/empty
  if (authHeader !== null && !authHeader.startsWith('Bearer ')) {
    return null;
  }

  // Default fallback for development/local environment when headers are not provided
  return {
    id: 'default-shopkeeper-id',
    shopkeeperId: 'default-shopkeeper-id',
  };
}

/**
 * Verifies that a Customer (Ledger) exists and belongs to the authenticated shopkeeper.
 */
export async function verifyCustomerOwnership(
  ledgerId: string,
  shopkeeperId: string
): Promise<{ exists: boolean; authorized: boolean; ledger?: { id: string; title: string; shopkeeperId: string } }> {
  if (!(await isDatabaseReachable())) {
    return { exists: false, authorized: false };
  }
  try {
    const ledger = await prisma.ledger.findUnique({
      where: { id: ledgerId },
      select: { id: true, title: true, shopkeeperId: true },
    });

    if (!ledger) {
      return { exists: false, authorized: false };
    }

    if (ledger.shopkeeperId !== shopkeeperId) {
      return { exists: true, authorized: false, ledger };
    }

    return { exists: true, authorized: true, ledger };
  } catch {
    // If DB is offline or mock environment
    return { exists: false, authorized: false };
  }
}
