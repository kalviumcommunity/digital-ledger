import type {
  DashboardTransaction,
  PaginationMeta,
  TransactionType,
  PaymentMethod,
} from '@/app/dashboard/types';

export interface FetchTransactionsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'ALL' | TransactionType | 'CREDIT' | 'DEBIT';
  paymentMethod?: string;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  customerId?: string;
  signal?: AbortSignal;
}

export interface TransactionsApiResponse {
  success: boolean;
  data: {
    id: string;
    ledgerId: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    date?: string;
    paymentMethod?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    ledger?: {
      id: string;
      title: string;
    };
  }[];
  pagination: PaginationMeta;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Client service layer to query Person 2's Transaction API (/api/transactions)
 */
export async function fetchTransactionsFromApi(
  params: FetchTransactionsParams = {}
): Promise<{ transactions: DashboardTransaction[]; meta: PaginationMeta }> {
  const {
    page = 1,
    limit = 10,
    search,
    type,
    paymentMethod,
    sortBy = 'date',
    sortOrder = 'desc',
    customerId,
    signal,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('limit', String(limit));
  searchParams.set('sortBy', sortBy);
  searchParams.set('sortOrder', sortOrder);

  if (search && search.trim()) {
    searchParams.set('search', search.trim());
  }

  if (type && type !== 'ALL') {
    // Map UI transaction types to API format if needed
    const apiType =
      type === 'CREDIT_GIVEN' ? 'CREDIT' : type === 'PAYMENT_RECEIVED' ? 'DEBIT' : type;
    searchParams.set('type', apiType);
  }

  if (paymentMethod && paymentMethod !== 'ALL') {
    searchParams.set('paymentMethod', paymentMethod);
  }

  if (customerId) {
    searchParams.set('customerId', customerId);
  }

  const res = await fetch(`/api/transactions?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch transactions: ${res.statusText}`);
  }

  const json: TransactionsApiResponse = await res.json();
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json?.error?.message || 'Invalid transactions response received from API');
  }

  const transactions: DashboardTransaction[] = json.data.map((tx) => ({
    id: tx.id,
    customerId: tx.ledgerId,
    customerName: tx.ledger?.title || 'Customer',
    customerPhone: '9876xxxxxx',
    type: tx.type === 'CREDIT' ? 'CREDIT_GIVEN' : 'PAYMENT_RECEIVED',
    amount: Number(tx.amount),
    paymentMethod: (tx.paymentMethod as PaymentMethod) || 'Cash',
    description: tx.note || undefined,
    createdAt: tx.date || tx.createdAt,
  }));

  return {
    transactions,
    meta: json.pagination || {
      page,
      limit,
      total: transactions.length,
      totalPages: Math.ceil(transactions.length / limit) || 1,
    },
  };
}

/**
 * Fetches the Dashboard Financial Summary (Balance & Credit Given) from the API.
 */
export async function fetchTransactionSummaryFromApi(): Promise<{
  balance: number;
  creditGiven: number;
  totalPaid: number;
  totalTransactions: number;
}> {
  const res = await fetch('/api/transactions/summary', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to fetch financial summary');
  }

  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json?.error?.message || 'Invalid summary response');
  }

  return json.data;
}

