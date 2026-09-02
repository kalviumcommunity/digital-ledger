"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  Prisma,
  ActionType,
  TransactionType,
  type Ledger,
  type Transaction,
  type AuditLog,
} from "@prisma/client";

// Strong return type matching schema
export type LedgerWithTransactions = Ledger & {
  transactions: Transaction[];
};

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ==========================================
// 1. READ: Fetch Ledger & Active Transactions
// ==========================================
export async function getLedgerData(
  shopkeeperId: string
): Promise<ActionResponse<LedgerWithTransactions | null>> {
  try {
    const ledger = await prisma.ledger.findFirst({
      where: { shopkeeperId },
      include: {
        transactions: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return { success: true, data: ledger };
  } catch (error) {
    console.error("Failed to fetch ledger data:", error);
    return { success: false, error: "Failed to fetch ledger data." };
  }
}

// ==========================================
// 2. CREATE: Add Transaction + Audit Trail
// ==========================================
export async function addTransaction(data: {
  ledgerId: string;
  type: TransactionType;
  amount: number;
  note?: string;
  actorId: string;
}): Promise<ActionResponse<Transaction>> {
  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create transaction record
        const newTx = await tx.transaction.create({
          data: {
            ledgerId: data.ledgerId,
            type: data.type,
            amount: new Prisma.Decimal(data.amount),
            note: data.note,
            version: 1,
            isDeleted: false,
          },
        });

        // Update ledger running balance
        const delta = data.type === TransactionType.CREDIT ? data.amount : -data.amount;
        await tx.ledger.update({
          where: { id: data.ledgerId },
          data: { totalBalance: { increment: new Prisma.Decimal(delta) } },
        });

        // Write immutable audit log
        await tx.auditLog.create({
          data: {
            transactionId: newTx.id,
            action: ActionType.CREATE,
            newData: {
              amount: data.amount,
              type: data.type,
              note: data.note,
            } as Prisma.InputJsonValue,
            actorId: data.actorId,
          },
        });

        return newTx;
      }
    );

    revalidatePath("/");
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    return { success: false, error: "Transaction creation failed." };
  }
}

// ==========================================
// 3. UPDATE: Edit with Optimistic Concurrency
// ==========================================
export async function updateTransaction(data: {
  id: string;
  ledgerId: string;
  type: TransactionType;
  amount: number;
  note?: string;
  currentVersion: number;
  actorId: string;
}): Promise<ActionResponse<Transaction>> {
  try {
    const updatedTx = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const current = await tx.transaction.findUnique({
          where: { id: data.id },
        });

        if (!current || current.isDeleted) {
          throw new Error("Transaction not found or already deleted.");
        }

        // Optimistic locking version check
        if (current.version !== data.currentVersion) {
          throw new Error(
            "Conflict: This transaction was modified by another request."
          );
        }

        const nextTx = await tx.transaction.update({
          where: { id: data.id },
          data: {
            type: data.type,
            amount: new Prisma.Decimal(data.amount),
            note: data.note,
            version: { increment: 1 },
          },
        });

        const oldDelta =
          current.type === TransactionType.CREDIT
            ? -Number(current.amount)
            : Number(current.amount);
        const newDelta =
          data.type === TransactionType.CREDIT ? data.amount : -data.amount;
        const netDelta = oldDelta + newDelta;

        await tx.ledger.update({
          where: { id: data.ledgerId },
          data: { totalBalance: { increment: new Prisma.Decimal(netDelta) } },
        });

        // Schema uses ActionType.EDIT and oldData
        await tx.auditLog.create({
          data: {
            transactionId: current.id,
            action: ActionType.EDIT,
            oldData: {
              amount: Number(current.amount),
              type: current.type,
              note: current.note,
              version: current.version,
            } as Prisma.InputJsonValue,
            newData: {
              amount: data.amount,
              type: data.type,
              note: data.note,
              version: nextTx.version,
            } as Prisma.InputJsonValue,
            actorId: data.actorId,
          },
        });

        return nextTx;
      }
    );

    revalidatePath("/");
    return { success: true, data: updatedTx };
  } catch (error: unknown) {
    console.error("Update error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update transaction.";
    return { success: false, error: message };
  }
}

// ==========================================
// 4. DELETE: Soft-Delete + Audit Log
// ==========================================
export async function deleteTransaction(data: {
  id: string;
  ledgerId: string;
  actorId: string;
}): Promise<ActionResponse<{ deletedId: string }>> {
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const current = await tx.transaction.findUnique({
        where: { id: data.id },
      });

      if (!current || current.isDeleted) {
        throw new Error("Transaction not found or already deleted.");
      }

      await tx.transaction.update({
        where: { id: data.id },
        data: { isDeleted: true, version: { increment: 1 } },
      });

      const reverseDelta =
        current.type === TransactionType.CREDIT
          ? -Number(current.amount)
          : Number(current.amount);

      await tx.ledger.update({
        where: { id: data.ledgerId },
        data: {
          totalBalance: { increment: new Prisma.Decimal(reverseDelta) },
        },
      });

      await tx.auditLog.create({
        data: {
          transactionId: current.id,
          action: ActionType.DELETE,
          oldData: {
            amount: Number(current.amount),
            type: current.type,
            note: current.note,
          } as Prisma.InputJsonValue,
          actorId: data.actorId,
        },
      });
    });

    revalidatePath("/");
    return { success: true, data: { deletedId: data.id } };
  } catch (error: unknown) {
    console.error("Delete error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete transaction.";
    return { success: false, error: message };
  }
}

// ==========================================
// 5. AUDIT: Get History for a Transaction
// ==========================================
export async function getTransactionAuditTrail(
  transactionId: string
): Promise<ActionResponse<AuditLog[]>> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { transactionId },
      orderBy: { timestamp: "desc" },
    });
    return { success: true, data: logs };
  } catch (error) {
    console.error("Audit trail fetch error:", error);
    return { success: false, error: "Failed to fetch audit trail." };
  }
}