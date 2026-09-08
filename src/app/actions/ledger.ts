"use server";

import { Prisma, ActionType, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import { roundMoney } from "@/lib/format";
import { serializeAuditLog, serializeTransaction } from "@/lib/serialize";
import type { ActionResult, AuditLogEntry, CustomerLedgerData, SerializedTransaction } from "@/lib/types";

const LOCK_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

export async function getLedgerData(
  customerId: string
): Promise<ActionResult<CustomerLedgerData>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  try {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: user.id },
      include: {
        ledger: {
          include: {
            transactions: {
              where: { isDeleted: false },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            },
          },
        },
      },
    });

    if (!customer || !customer.ledger) {
      return { success: false, error: "Customer ledger not found.", code: "NOT_FOUND" };
    }

    const transactions: SerializedTransaction[] = customer.ledger.transactions.map(
      (tx) => ({
        id: tx.id,
        ledgerId: tx.ledgerId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
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
      })
    );

    let totalCredit = 0;
    let totalPaid = 0;
    for (const tx of transactions) {
      if (tx.type === "CREDIT") totalCredit += tx.amount;
      else totalPaid += tx.amount;
    }

    return {
      success: true,
      data: {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        ledgerId: customer.ledger.id,
        totalBalance: roundMoney(Number(customer.ledger.totalBalance)),
        summary: {
          totalCredit: roundMoney(totalCredit),
          totalPaid: roundMoney(totalPaid),
          amountDue: roundMoney(totalCredit - totalPaid),
          transactionCount: transactions.length,
        },
        transactions,
      },
    };
  } catch (error) {
    console.error("getLedgerData failed:", error);
    return { success: false, error: "Failed to load the customer ledger." };
  }
}

/**
 * Person 3 — Creates a transaction, atomically updates the ledger running
 * balance and writes the initial CREATE audit log.
 */
export async function addTransaction(input: {
  ledgerId: string;
  type: TransactionType;
  amount: number;
  note?: string;
  method?: string;
}): Promise<ActionResult<SerializedTransaction>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  const amount = roundMoney(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Amount must be a positive number." };
  }
  const type = input.type === "DEBIT" ? "DEBIT" : "CREDIT";
  const method = input.method?.trim() || "Cash";
  const note = input.note?.trim() || null;

  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const ledger = await tx.ledger.findUnique({
          where: { id: input.ledgerId },
          include: { customer: true },
        });
        if (!ledger || ledger.customer.userId !== user.id) {
          throw new Error("Ledger not found.");
        }

        const newTransaction = await tx.transaction.create({
          data: {
            ledgerId: ledger.id,
            type,
            amount: new Prisma.Decimal(amount),
            note,
            method,
            version: 1,
            isDeleted: false,
          },
          include: { ledger: { include: { customer: true } } },
        });

        const delta = type === "CREDIT" ? amount : -amount;
        await tx.ledger.update({
          where: { id: ledger.id },
          data: { totalBalance: { increment: new Prisma.Decimal(delta) } },
        });

        await tx.auditLog.create({
          data: {
            transactionId: newTransaction.id,
            action: ActionType.CREATE,
            newData: {
              amount,
              type,
              note,
              method,
              version: 1,
            } as Prisma.InputJsonValue,
            actorId: user.name,
          },
        });

        return newTransaction;
      }
    );

    revalidatePaths(result.ledger.customer.id);
    return { success: true, data: serializeTransaction(result) };
  } catch (error) {
    console.error("addTransaction failed:", error);
    return { success: false, error: "Failed to save the transaction." };
  }
}

/**
 * Person 3 — Edits a transaction under optimistic concurrency control.
 * Verifies the actor's password, checks the version, reconciles the ledger
 * balance delta and writes an EDIT audit snapshot.
 */
export async function updateTransaction(input: {
  id: string;
  type: TransactionType;
  amount: number;
  note?: string;
  method?: string;
  currentVersion: number;
  password: string;
}): Promise<ActionResult<SerializedTransaction>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  const amount = roundMoney(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Amount must be a positive number." };
  }
  const type = input.type === "DEBIT" ? "DEBIT" : "CREDIT";

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id: input.id },
      include: { ledger: { include: { customer: true } } },
    });
    if (!existing || existing.isDeleted) {
      return { success: false, error: "Transaction not found.", code: "NOT_FOUND" };
    }
    if (existing.ledger.customer.userId !== user.id) {
      return { success: false, error: "Transaction not found.", code: "NOT_FOUND" };
    }

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });
    if (!account || !(await verifyPassword(input.password, account.password))) {
      return {
        success: false,
        error: "Incorrect password. The edit was not applied.",
        code: "INVALID_PASSWORD",
      };
    }

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const current = await tx.transaction.findUnique({
          where: { id: input.id },
        });
        if (!current || current.isDeleted) {
          throw new Error("Transaction not found.");
        }
        if (current.version !== input.currentVersion) {
          throw new Error(
            "Conflict: This transaction was modified by another request. Please refresh and try again."
          );
        }

        const next = await tx.transaction.update({
          where: { id: input.id },
          data: {
            type,
            amount: new Prisma.Decimal(amount),
            note: input.note?.trim() || null,
            method: input.method?.trim() || current.method,
            version: { increment: 1 },
            lockedBy: null,
            lockedAt: null,
          },
          include: { ledger: { include: { customer: true } } },
        });

        const oldDelta =
          current.type === "CREDIT" ? -Number(current.amount) : Number(current.amount);
        const newDelta = type === "CREDIT" ? amount : -amount;
        await tx.ledger.update({
          where: { id: current.ledgerId },
          data: { totalBalance: { increment: new Prisma.Decimal(oldDelta + newDelta) } },
        });

        await tx.auditLog.create({
          data: {
            transactionId: current.id,
            action: ActionType.EDIT,
            oldData: {
              amount: Number(current.amount),
              type: current.type,
              note: current.note,
              method: current.method,
              version: current.version,
            } as Prisma.InputJsonValue,
            newData: {
              amount,
              type,
              note: next.note,
              method: next.method,
              version: next.version,
            } as Prisma.InputJsonValue,
            actorId: user.name,
          },
        });

        return next;
      }
    );

    revalidatePaths(result.ledger.customer.id);
    return { success: true, data: serializeTransaction(result) };
  } catch (error) {
    console.error("updateTransaction failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update the transaction.";
    const conflict = message.startsWith("Conflict:");
    return {
      success: false,
      error: message,
      ...(conflict ? { code: "VERSION_CONFLICT" } : {}),
    };
  }
}

/**
 * Person 3 — Soft-deletes a transaction (isDeleted = true), reverses its
 * impact on the ledger balance and writes a DELETE audit log.
 */
export async function deleteTransaction(input: {
  id: string;
  password: string;
}): Promise<ActionResult<{ deletedId: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id: input.id },
      include: { ledger: { include: { customer: true } } },
    });
    if (!existing || existing.isDeleted) {
      return { success: false, error: "Transaction not found.", code: "NOT_FOUND" };
    }
    if (existing.ledger.customer.userId !== user.id) {
      return { success: false, error: "Transaction not found.", code: "NOT_FOUND" };
    }

    const account = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });
    if (!account || !(await verifyPassword(input.password, account.password))) {
      return {
        success: false,
        error: "Incorrect password. The transaction was not deleted.",
        code: "INVALID_PASSWORD",
      };
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.transaction.findUnique({
        where: { id: input.id },
      });
      if (!current || current.isDeleted) {
        throw new Error("Transaction not found.");
      }

      await tx.transaction.update({
        where: { id: input.id },
        data: { isDeleted: true, version: { increment: 1 }, lockedBy: null, lockedAt: null },
      });

      const reverseDelta =
        current.type === "CREDIT" ? -Number(current.amount) : Number(current.amount);
      await tx.ledger.update({
        where: { id: current.ledgerId },
        data: { totalBalance: { increment: new Prisma.Decimal(reverseDelta) } },
      });

      await tx.auditLog.create({
        data: {
          transactionId: current.id,
          action: ActionType.DELETE,
          oldData: {
            amount: Number(current.amount),
            type: current.type,
            note: current.note,
            method: current.method,
            version: current.version,
          } as Prisma.InputJsonValue,
          actorId: user.name,
        },
      });
    });

    revalidatePaths(existing.ledger.customer.id);
    return { success: true, data: { deletedId: input.id } };
  } catch (error) {
    console.error("deleteTransaction failed:", error);
    return { success: false, error: "Failed to delete the transaction." };
  }
}

/**
 * Person 3 — Acquires an edit lock on a transaction. Locks expire after
 * two minutes, allowing another user to take over the edit afterwards.
 */
export async function acquireTransactionLock(input: {
  transactionId: string;
}): Promise<ActionResult<{ locked: boolean }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: input.transactionId },
      include: { ledger: { include: { customer: true } } },
    });
    if (!transaction || transaction.isDeleted) {
      return { success: false, error: "Transaction not found.", code: "NOT_FOUND" };
    }
    if (transaction.ledger.customer.userId !== user.id) {
      return { success: false, error: "Transaction not found.", code: "NOT_FOUND" };
    }

    const lockExpired =
      !transaction.lockedAt ||
      transaction.lockedAt.getTime() < Date.now() - LOCK_WINDOW_MS;

    if (
      transaction.lockedBy &&
      transaction.lockedBy !== user.name &&
      !lockExpired
    ) {
      return {
        success: false,
        error: `This transaction is currently being edited by ${transaction.lockedBy}.`,
        code: "LOCKED",
        lockedBy: transaction.lockedBy,
      };
    }

    await prisma.transaction.update({
      where: { id: input.transactionId },
      data: { lockedBy: user.name, lockedAt: new Date() },
    });

    return { success: true, data: { locked: true } };
  } catch (error) {
    console.error("acquireTransactionLock failed:", error);
    return { success: false, error: "Failed to acquire the edit lock." };
  }
}

/**
 * Person 3 — Releases the edit lock if it belongs to the current user.
 */
export async function releaseTransactionLock(input: {
  transactionId: string;
}): Promise<ActionResult<{ released: boolean }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: input.transactionId },
    });
    if (transaction && transaction.lockedBy === user.name) {
      await prisma.transaction.update({
        where: { id: input.transactionId },
        data: { lockedBy: null, lockedAt: null },
      });
    }
    return { success: true, data: { released: true } };
  } catch (error) {
    console.error("releaseTransactionLock failed:", error);
    return { success: false, error: "Failed to release the edit lock." };
  }
}

/**
 * Person 3 — Fetches the immutable audit timeline for a transaction,
 * ordered chronologically by timestamp.
 */
export async function getTransactionAuditLogs(
  transactionId: string
): Promise<ActionResult<AuditLogEntry[]>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { ledger: { include: { customer: true } } },
    });
    if (!transaction || transaction.ledger.customer.userId !== user.id) {
      return { success: false, error: "Transaction not found.", code: "NOT_FOUND" };
    }

    const logs = await prisma.auditLog.findMany({
      where: { transactionId },
      orderBy: { timestamp: "asc" },
    });

    return { success: true, data: logs.map(serializeAuditLog) };
  } catch (error) {
    console.error("getTransactionAuditLogs failed:", error);
    return { success: false, error: "Failed to load the audit trail." };
  }
}

function revalidatePaths(customerId: string): void {
  revalidatePath("/customers");
  revalidatePath("/transactions");
  revalidatePath(`/customers/${customerId}`);
}