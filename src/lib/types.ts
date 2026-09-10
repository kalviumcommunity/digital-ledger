import type { ActionType, Role, TransactionType } from "@prisma/client";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Fully serialized, primitive-only snapshot of a customer row for the directory. */
export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  ledgerId: string | null;
  createdAt: string;
  updatedAt: string;
  totalCredit: number;
  totalPaid: number;
  balance: number;
  transactionCount: number;
  lastActivityAt: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CustomersResult {
  customers: CustomerRow[];
  pagination: PaginationMeta;
  aggregate: {
    totalCredit: number;
    totalPaid: number;
    netOutstanding: number;
    customerCount: number;
  };
}

/** Serialized transaction for the global feed and customer ledger views. */
export interface SerializedTransaction {
  id: string;
  ledgerId: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  type: TransactionType;
  amount: number;
  note: string | null;
  method: string;
  version: number;
  isDeleted: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalTransactionsResult {
  transactions: SerializedTransaction[];
  pagination: PaginationMeta;
  analytics: {
    totalBusinessCredit: number;
    totalBusinessPaid: number;
    netOutstanding: number;
    transactionCount: number;
  };
}

export interface LedgerSummary {
  totalCredit: number;
  totalPaid: number;
  amountDue: number;
  transactionCount: number;
}

export interface CustomerLedgerData {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  ledgerId: string;
  totalBalance: number;
  summary: LedgerSummary;
  transactions: SerializedTransaction[];
}

export interface AuditLogEntry {
  id: string;
  transactionId: string;
  action: ActionType;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  actorId: string;
  timestamp: string;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string; lockedBy?: string };

export const TRANSACTION_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque"] as const;
export type TransactionMethod = (typeof TRANSACTION_METHODS)[number];