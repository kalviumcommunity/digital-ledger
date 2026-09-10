"use server";

import { Prisma, type Ledger } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { roundMoney } from "@/lib/format";
import type { ActionResult, CustomerRow, CustomersResult } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 12;

interface CustomerTotals {
  totalCredit: number;
  totalPaid: number;
  balance: number;
  transactionCount: number;
  lastActivityAt: string | null;
}

function computeTotals(ledger: Ledger & { transactions: { amount: Prisma.Decimal; type: 'CREDIT' | 'DEBIT'; createdAt: Date }[] } | null): CustomerTotals {
  const tx = ledger?.transactions ?? [];
  let totalCredit = 0;
  let totalPaid = 0;
  let lastActivityAt: string | null = null;

  for (const row of tx) {
    const amount = Number(row.amount);
    if (row.type === "CREDIT") totalCredit += amount;
    else totalPaid += amount;
    const iso = row.createdAt.toISOString();
    if (!lastActivityAt || iso > lastActivityAt) lastActivityAt = iso;
  }

  return {
    totalCredit: roundMoney(totalCredit),
    totalPaid: roundMoney(totalPaid),
    balance: roundMoney(totalCredit - totalPaid),
    transactionCount: tx.length,
    lastActivityAt,
  };
}

/**
 * Person 1 — Creates a customer and atomically initializes their ledger.
 */
export async function createCustomer(input: {
  name: string;
  phone?: string;
}): Promise<ActionResult<CustomerRow>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  const name = input.name.trim();
  if (name.length < 2) {
    return { success: false, error: "Customer name must be at least 2 characters." };
  }
  // Keep a clean phone string; strip non-digit separators but allow "+", "-", spaces.
  const phone = input.phone?.trim();
  if (phone && (phone.length < 7 || phone.length > 20)) {
    return { success: false, error: "Please provide a valid phone number." };
  }

  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const customer = await tx.customer.create({
          data: {
            userId: user.id,
            name,
            phone: phone || null,
            ledger: {
              create: {
                totalBalance: new Prisma.Decimal(0),
              },
            },
          },
          include: { ledger: { include: { transactions: true } } },
        });

        if (!customer.ledger) {
          throw new Error("Ledger could not be initialized for the new customer.");
        }

        return customer;
      }
    );

    const ledger = result.ledger;
    if (!ledger) {
      throw new Error("Customer ledger could not be initialized.");
    }

    const totals = computeTotals(ledger);

    const row: CustomerRow = {
      id: result.id,
      name: result.name,
      phone: result.phone,
      ledgerId: ledger.id,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      ...totals,
    };

    revalidatePath("/customers");
    revalidatePath("/transactions");
    return { success: true, data: row };
  } catch (error) {
    console.error("createCustomer failed:", error);
    return { success: false, error: "Failed to create customer." };
  }
}

/**
 * Person 1 — Lists the signed-in user's customers with computed balances,
 * search filtering and pagination.
 */
export async function getCustomers(input: {
  search?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ActionResult<CustomersResult>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in to continue." };
  }

  const search = input.search?.trim();
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Math.floor(input.pageSize ?? DEFAULT_PAGE_SIZE))
  );

  const where: Prisma.CustomerWhereInput = {
    userId: user.id,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ],
        }
      : {}),
  };

  try {
    const [total, customers] = await prisma.$transaction([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          ledger: {
            include: { transactions: { where: { isDeleted: false } } },
          },
        },
      }),
    ]);

    const rows: CustomerRow[] = customers.map((customer) => {
      const totals = computeTotals(customer.ledger);
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        ledgerId: customer.ledger?.id ?? null,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
        ...totals,
      };
    });

    const aggregate = rows.reduce(
      (acc, row) => {
        acc.totalCredit += row.totalCredit;
        acc.totalPaid += row.totalPaid;
        acc.netOutstanding += row.balance;
        return acc;
      },
      { totalCredit: 0, totalPaid: 0, netOutstanding: 0, customerCount: rows.length }
    );

    return {
      success: true,
      data: {
        customers: rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
        aggregate: {
          totalCredit: roundMoney(aggregate.totalCredit),
          totalPaid: roundMoney(aggregate.totalPaid),
          netOutstanding: roundMoney(aggregate.netOutstanding),
          customerCount: aggregate.customerCount,
        },
      },
    };
  } catch (error) {
    console.error("getCustomers failed:", error);
    return { success: false, error: "Failed to load customers." };
  }
}