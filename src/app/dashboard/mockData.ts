// Mock data layer for Person 2's Dashboard
// Components consume via props/state — replace with real API calls later.

import type {
  DashboardTransaction,
  DashboardCustomer,
  DashboardSummary,
  PaginationMeta,
} from './types';

// ─── Summary ────────────────────────────────────────────────────────────────

export const MOCK_SUMMARY: DashboardSummary = {
  balance: 1079543.39,
  creditGiven: 43236.85,
};

// ─── Customers (sidebar — Person 1 owns real implementation) ─────────────────

export const MOCK_CUSTOMERS: DashboardCustomer[] = [
  { id: '1', name: 'Aarav Sharma', phone: '7654xxxxxxx', amountDue: 0 },
  { id: '2', name: 'Alisha Thakur', phone: '9356xxxxxxx', amountDue: 3045.23 },
  { id: '3', name: 'Arjun Malhotra', phone: '9920xxxxxxx', amountDue: 0 },
  { id: '4', name: 'Bhavana Iyer', phone: '8463xxxxxxx', amountDue: 0 },
  { id: '5', name: 'Chetan Deshmukh', phone: '6088xxxxxxx', amountDue: 12745.98 },
  { id: '6', name: 'Juhi Aggarwal', phone: '9876xxxxxxx', amountDue: 17591.65 },
  { id: '7', name: 'Rahul Chaudhary', phone: '9812xxxxxxx', amountDue: 14343.33 },
  { id: '8', name: 'Asha Singh', phone: '9123xxxxxxx', amountDue: 7256.36 },
  { id: '9', name: 'Sakshi Bhatra', phone: '9988xxxxxxx', amountDue: 28309.83 },
  { id: '10', name: 'Arjun Roy', phone: '9765xxxxxxx', amountDue: 3546.25 },
];

// ─── Global Transactions (ALL customers) ─────────────────────────────────────

export const MOCK_TRANSACTIONS: DashboardTransaction[] = [
  // August 12, 2026
  {
    id: 'txn-001',
    customerId: '6',
    customerName: 'Juhi Aggarwal',
    customerPhone: '9876xxxxxxx',
    type: 'PAYMENT_RECEIVED',
    amount: 17591.69,
    paymentMethod: 'UPI',
    description: 'Payment Received',
    createdAt: '2026-08-12T16:15:00+05:30',
  },
  {
    id: 'txn-002',
    customerId: '7',
    customerName: 'Rahul Chaudary',
    customerPhone: '9812xxxxxxx',
    type: 'PAYMENT_RECEIVED',
    amount: 14343.33,
    paymentMethod: 'Cash',
    description: 'Cash Received',
    createdAt: '2026-08-12T12:32:00+05:30',
  },
  {
    id: 'txn-003',
    customerId: '8',
    customerName: 'Asha Singh',
    customerPhone: '9123xxxxxxx',
    type: 'CREDIT_GIVEN',
    amount: 7256.36,
    paymentMethod: 'Cash',
    description: 'Goods Purchased',
    createdAt: '2026-08-12T15:56:00+05:30',
  },
  {
    id: 'txn-004',
    customerId: '9',
    customerName: 'Sakshi Bhatra',
    customerPhone: '9988xxxxxxx',
    type: 'CREDIT_GIVEN',
    amount: 28309.83,
    paymentMethod: 'Bank Transfer',
    description: 'Goods Purchased',
    createdAt: '2026-08-12T16:09:00+05:30',
  },
  {
    id: 'txn-005',
    customerId: '6',
    customerName: 'Juhi Aggarwal',
    customerPhone: '9876xxxxxxx',
    type: 'PAYMENT_RECEIVED',
    amount: 17591.69,
    paymentMethod: 'UPI',
    description: 'Second Payment',
    createdAt: '2026-08-12T16:15:00+05:30',
  },
  {
    id: 'txn-006',
    customerId: '10',
    customerName: 'Arjun Roy',
    customerPhone: '9765xxxxxxx',
    type: 'PAYMENT_RECEIVED',
    amount: 3546.25,
    paymentMethod: 'Cash',
    description: 'Cash Payment',
    createdAt: '2026-08-12T18:47:00+05:30',
  },
  // August 10, 2026
  {
    id: 'txn-007',
    customerId: '2',
    customerName: 'Alisha Thakur',
    customerPhone: '9356xxxxxxx',
    type: 'CREDIT_GIVEN',
    amount: 5200.00,
    paymentMethod: 'Cash',
    description: 'Goods Supplied',
    createdAt: '2026-08-10T10:30:00+05:30',
  },
  {
    id: 'txn-008',
    customerId: '7',
    customerName: 'Rahul Chaudhary',
    customerPhone: '9812xxxxxxx',
    type: 'PAYMENT_RECEIVED',
    amount: 8000.00,
    paymentMethod: 'UPI',
    description: 'UPI Payment',
    createdAt: '2026-08-10T14:22:00+05:30',
  },
  // August 8, 2026
  {
    id: 'txn-009',
    customerId: '8',
    customerName: 'Asha Singh',
    customerPhone: '9123xxxxxxx',
    type: 'PAYMENT_RECEIVED',
    amount: 2400.00,
    paymentMethod: 'UPI',
    description: 'Partial Payment',
    createdAt: '2026-08-08T12:13:00+05:30',
  },
  {
    id: 'txn-010',
    customerId: '9',
    customerName: 'Sakshi Bhatra',
    customerPhone: '9988xxxxxxx',
    type: 'CREDIT_GIVEN',
    amount: 11500.00,
    paymentMethod: 'Cash',
    description: 'Bulk Order',
    createdAt: '2026-08-08T09:00:00+05:30',
  },
  // August 5, 2026
  {
    id: 'txn-011',
    customerId: '10',
    customerName: 'Arjun Roy',
    customerPhone: '9765xxxxxxx',
    type: 'CREDIT_GIVEN',
    amount: 4750.00,
    paymentMethod: 'Cash',
    description: 'Credit Extended',
    createdAt: '2026-08-05T11:05:00+05:30',
  },
  {
    id: 'txn-012',
    customerId: '2',
    customerName: 'Alisha Thakur',
    customerPhone: '9356xxxxxxx',
    type: 'PAYMENT_RECEIVED',
    amount: 3045.23,
    paymentMethod: 'Bank Transfer',
    description: 'Bank Transfer',
    createdAt: '2026-08-05T16:45:00+05:30',
  },
];

// ─── Pagination meta (mock) ───────────────────────────────────────────────────

export const MOCK_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 10,
  total: MOCK_TRANSACTIONS.length,
  totalPages: Math.ceil(MOCK_TRANSACTIONS.length / 10),
};

// ─── Formatters ──────────────────────────────────────────────────────────────

/** Format number in Indian system WITHOUT ₹ symbol: "10,79,543.39" */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Legacy alias — kept for backward compat */
export const formatIndianCurrency = formatNumber;

/** Format time as "4:15 pm" */
export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase();
}

/** Format date as "August 12, 2026" */
export function formatDateGroup(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Get initials from name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
