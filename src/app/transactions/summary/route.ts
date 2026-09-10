import { NextRequest } from 'next/server';
import { GET as getHandler } from '@/app/api/transactions/summary/route';

export async function GET(req: NextRequest) {
  return getHandler(req);
}
