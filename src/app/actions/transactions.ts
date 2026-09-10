"use server";

import { Prisma, type TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { roundMoney } from "@/lib/format";
import { serializeTransaction } from "@/lib/serialize";
import type { ActionResult, GlobalTransactionsResult } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export interface TransactionFilters {
  search?: string;
  type?: TransactionType | "ALL";
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

interface NormalizedFilters {
  search?: string;
  type?: "CREDIT" | "DEBIT";
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
}

function normalizeFilters(filters: TransactionFilters): NormalizedFilters {
  const search = filters.search?.trim();
  const type = filters.type === "CREDIT" || filters.type === "DEBIT" ? filters.type : undefined;
  const dateFrom = filters.dateFrom && !Number.isNaN(Date.parse(filters.dateFrom))
    ? new Date(filters.dateFrom)
    : undefined;
  const dateTo = filters.dateTo && !Number.isNaN(Date.parse(filters.dateTo))
    ? new Date(filters.dateTo)
    : undefined;
  const customerId = filters.customerId?.trim() || undefined;

  // Make dateTo inclusive of the entire day.
  if (dateTo) dateTo.setDate(dateTo.getDate() + 1);

  return { search, type, dateFrom, dateTo, customerId };
}

function buildWhere(
  userId: string,
  filters: NormalizedFilters
): Prisma.TransactionWhereInput {
  const customerWhere: Prisma.CustomerWhereInput = { userId };
  if (filters.search) {
    customerWhere.name = {
      contains: filters.search,
      mode: Prisma.QueryMode.insensitive,
    };
  }
  if (filters.customerId) {
    customerWhere.id = filters.customerId;
  }

  return {
    isDeleted: false,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          createdAt: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lt: filters.dateTo } : {}),
          },
        }
      : {}),
    ledger: { customer: customerWhere },
  };
}

/**
 * Person 2 — Unscoped cross-customer transaction feed with pagination,
 * filters and running platform analytics.
 */
export async function getGlobalTransactions(input: TransactionFilters & {
  page?: number;
  pageSize?: number;
} = {}): Promise<ActionResult<GlobalTransactionsResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(input.pageSize ?? DEFAULT_PAGE_SIZE))
  );
  const filters = normalizeFilters(input);
  const where = buildWhere(user.id, filters);

  try {
    const [total, transactions, grouped] = await prisma.$transaction([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { ledger: { include: { customer: true } } },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where,
        orderBy: { type: "asc" },
        _sum: { amount: true },
      }),
    ]);

    let totalBusinessCredit = 0;
    let totalBusinessPaid = 0;
    for (const group of grouped) {
      const sum = group._sum?.amount ? Number(group._sum.amount) : 0;
      if (group.type === "CREDIT") totalBusinessCredit += sum;
      else totalBusinessPaid += sum;
    }

    return {
      success: true,
      data: {
        transactions: transactions.map((tx) => serializeTransaction(tx)),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        analytics: {
          totalBusinessCredit: roundMoney(totalBusinessCredit),
          totalBusinessPaid: roundMoney(totalBusinessPaid),
          netOutstanding: roundMoney(totalBusinessCredit - totalBusinessPaid),
          transactionCount: total,
        },
      },
    };
  } catch (error) {
    console.error("getGlobalTransactions failed:", error);
    return { success: false, error: "Failed to load the transaction feed." };
  }
}

function csvEscape(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Person 2 — Exports the matched transaction set (all matching rows,
 * across pages) as a CSV string ready for client-side download.
 */
export async function exportTransactionsCsv(
  filters: TransactionFilters
): Promise<ActionResult<{ filename: string; csv: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  const normalized = normalizeFilters(filters);
  const where = buildWhere(user.id, normalized);

  try {
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { ledger: { include: { customer: true } } },
    });

    const header = [
      "Transaction ID",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Type",
      "Amount",
      "Method",
      "Note",
    ];

    const rows = transactions.map((tx) => [
      tx.id,
      tx.createdAt.toISOString(),
      tx.ledger.customer.name,
      tx.ledger.customer.phone ?? "",
      tx.type === "CREDIT" ? "Credit Given" : "Payment Received",
      Number(tx.amount).toFixed(2),
      tx.method,
      tx.note ?? "",
    ]);

    const lines = [header, ...rows].map((line) => line.map(csvEscape).join(","));
    const csv = "\uFEFF" + lines.join("\r\n");
    const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

    return { success: true, data: { filename, csv } };
  } catch (error) {
    console.error("exportTransactionsCsv failed:", error);
    return { success: false, error: "Failed to export transactions." };
  }
}