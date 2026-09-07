// Dashboard-level types (Person 2)
// These are global/cross-customer transaction types for the Dashboard view.
// They are NOT the same as the Customer Ledger types owned by Person 3.

export type TransactionType = 'CREDIT_GIVEN' | 'PAYMENT_RECEIVED';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer';

export interface DashboardTransaction {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: TransactionType;
  amount: number; // positive number; sign is determined by type
  paymentMethod: PaymentMethod;
  description?: string;
  createdAt: string; // ISO 8601
}

export interface DashboardCustomer {
  id: string;
  name: string;
  phone: string;
  amountDue: number;
}

export interface DashboardSummary {
  balance: number;
  creditGiven: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Shape of the future API transaction payload */
export interface AddTransactionPayload {
  customerId: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO 8601
  paymentMethod: PaymentMethod;
  description?: string;
}

export interface FilterState {
  type: 'ALL' | TransactionType;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: PaymentMethod | 'ALL';
}
