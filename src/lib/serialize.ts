import type { AuditLog, Customer, Ledger, Transaction } from "@prisma/client";
import type { AuditLogEntry, SerializedTransaction } from "@/lib/types";
import { roundMoney } from "@/lib/format";

export type TransactionWithLedger = Transaction & {
  ledger: Ledger & { customer: Customer };
};

export function serializeTransaction(tx: TransactionWithLedger): SerializedTransaction {
  return {
    id: tx.id,
    ledgerId: tx.ledgerId,
    customerId: tx.ledger.customer.id,
    customerName: tx.ledger.customer.name,
    customerPhone: tx.ledger.customer.phone,
    type: tx.type,
    amount: roundMoney(Number(tx.amount)),
    note: tx.note,
    method: tx.method,
    version: tx.version,
    isDeleted: tx.isDeleted,
    lockedBy: tx.lockedBy,
    lockedAt: tx.lockedAt ? tx.lockedAt.toISOString() : null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

export function serializeAuditLog(log: AuditLog): AuditLogEntry {
  return {
    id: log.id,
    transactionId: log.transactionId,
    action: log.action,
    oldData:
      log.oldData && typeof log.oldData === "object"
        ? (log.oldData as Record<string, unknown>)
        : null,
    newData:
      log.newData && typeof log.newData === "object"
        ? (log.newData as Record<string, unknown>)
        : null,
    actorId: log.actorId,
    timestamp: log.timestamp.toISOString(),
  };
}

export type CustomerWithLedger = Customer & {
  ledger: Ledger & { transactions: Transaction[] } | null;
};

/** User owns this customer row? */
export function customerOwnedBy(customer: Customer, userId: string): boolean {
  return customer.userId === userId;
}