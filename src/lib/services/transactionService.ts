import { prisma } from '@/lib/prisma';
import { MOCK_CUSTOMERS, MOCK_TRANSACTIONS } from '@/app/dashboard/mockData';
import { Prisma } from '@prisma/client';
import { CustomerService } from './customerService';
import { calculateFinancialSummary } from '@/lib/utils/financial';
import { isDatabaseReachable, markDatabaseOffline } from '@/lib/dbCheck';

export interface LedgerRecord {
  id: string;
  shopkeeperId: string;
  title: string;
  totalBalance: number;
}

export interface TransactionRecord {
  id: string;
  ledgerId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  note: string | null;
  paymentMethod: string | null;
  date: Date;
  version: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  ledger?: {
    id: string;
    title: string;
  };
}

// In-memory fallback store for offline/local development and testing
class InMemoryDataStore {
  private ledgers: Map<string, LedgerRecord> = new Map();
  private transactions: Map<string, TransactionRecord> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.ledgers.clear();
    this.transactions.clear();

    // Seed default shopkeeper customers
    MOCK_CUSTOMERS.forEach((c) => {
      this.ledgers.set(c.id, {
        id: c.id,
        shopkeeperId: 'default-shopkeeper-id',
        title: c.name,
        totalBalance: c.amountDue,
      });
    });

    // Seed a customer for testing unauthorized access (belongs to a different shopkeeper)
    this.ledgers.set('other-user-customer-99', {
      id: 'other-user-customer-99',
      shopkeeperId: 'other-shopkeeper-id',
      title: 'Secret Customer of Another Shopkeeper',
      totalBalance: 5000,
    });

    // Seed mock transactions
    MOCK_TRANSACTIONS.forEach((tx) => {
      const type: 'CREDIT' | 'DEBIT' = tx.type === 'CREDIT_GIVEN' ? 'CREDIT' : 'DEBIT';
      const date = new Date(tx.createdAt);
      this.transactions.set(tx.id, {
        id: tx.id,
        ledgerId: tx.customerId,
        type,
        amount: tx.amount,
        note: tx.description || null,
        paymentMethod: tx.paymentMethod || 'Cash',
        date,
        version: 1,
        isDeleted: false,
        createdAt: date,
        updatedAt: date,
        ledger: {
          id: tx.customerId,
          title: tx.customerName,
        },
      });
    });
  }

  public getLedger(id: string): LedgerRecord | undefined {
    return this.ledgers.get(id);
  }

  public getTransaction(id: string): TransactionRecord | undefined {
    return this.transactions.get(id);
  }

  public addTransaction(tx: TransactionRecord) {
    const ledger = this.ledgers.get(tx.ledgerId);
    this.transactions.set(tx.id, {
      ...tx,
      ledger: tx.ledger || (ledger ? { id: ledger.id, title: ledger.title } : undefined),
    });
  }

  public updateTransaction(id: string, updates: Partial<TransactionRecord>): TransactionRecord | undefined {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;
    const updated: TransactionRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.transactions.set(id, updated);
    return updated;
  }

  public getAllTransactions(): TransactionRecord[] {
    return Array.from(this.transactions.values());
  }
}

const memoryStore = new InMemoryDataStore();

async function checkDbConnection(): Promise<boolean> {
  return await isDatabaseReachable();
}

export class TransactionService {
  /**
   * Verifies customer existence and ownership against Person 1's authorization model.
   */
  static async verifyCustomer(
    ledgerId: string,
    shopkeeperId: string
  ): Promise<{ exists: boolean; authorized: boolean; ledger?: { id: string; title: string; shopkeeperId: string } }> {
    if (await checkDbConnection()) {
      try {
        const ledger = await prisma.ledger.findUnique({
          where: { id: ledgerId },
          select: { id: true, title: true, shopkeeperId: true },
        });

        if (ledger) {
          return {
            exists: true,
            authorized: ledger.shopkeeperId === shopkeeperId,
            ledger,
          };
        }
      } catch {
        markDatabaseOffline();
      }
    }

    // Check in CustomerService
    const rawCustomer = CustomerService.getRawById(ledgerId);
    if (rawCustomer) {
      const isAuth = !rawCustomer.shopkeeperId || rawCustomer.shopkeeperId === shopkeeperId;
      return {
        exists: true,
        authorized: isAuth,
        ledger: {
          id: rawCustomer.id,
          title: rawCustomer.name,
          shopkeeperId: rawCustomer.shopkeeperId || 'default-shopkeeper-id',
        },
      };
    }

    const fallbackLedger = memoryStore.getLedger(ledgerId);
    if (!fallbackLedger) {
      return { exists: false, authorized: false };
    }

    return {
      exists: true,
      authorized: fallbackLedger.shopkeeperId === shopkeeperId,
      ledger: fallbackLedger,
    };
  }

  /**
   * Creates a new transaction.
   */
  static async create(data: {
    ledgerId: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    date: Date;
    paymentMethod: string;
    note: string | null;
  }): Promise<TransactionRecord> {
    if (await checkDbConnection()) {
      try {
        const created = await prisma.transaction.create({
          data: {
            ledgerId: data.ledgerId,
            type: data.type,
            amount: new Prisma.Decimal(data.amount.toFixed(2)),
            date: data.date,
            paymentMethod: data.paymentMethod,
            note: data.note,
          },
        });

        return {
          id: created.id,
          ledgerId: created.ledgerId,
          type: created.type as 'CREDIT' | 'DEBIT',
          amount: Number(created.amount),
          date: created.date,
          paymentMethod: created.paymentMethod,
          note: created.note,
          version: created.version,
          isDeleted: created.isDeleted,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
      } catch {
        markDatabaseOffline();
      }
    }

    const newId = `txn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const customer = await CustomerService.getById(data.ledgerId, 'default-shopkeeper-id');
    const customerTitle = customer?.name || memoryStore.getLedger(data.ledgerId)?.title || 'Customer';

    const fallbackRecord: TransactionRecord = {
      id: newId,
      ledgerId: data.ledgerId,
      type: data.type,
      amount: data.amount,
      date: data.date,
      paymentMethod: data.paymentMethod,
      note: data.note,
      version: 1,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      ledger: {
        id: data.ledgerId,
        title: customerTitle,
      },
    };

    memoryStore.addTransaction(fallbackRecord);
    return fallbackRecord;
  }

  /**
   * Lists transactions with pagination, filtering, search, and sorting.
   */
  static async list(params: {
    shopkeeperId: string;
    page: number;
    limit: number;
    search?: string;
    type?: 'CREDIT' | 'DEBIT';
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'date' | 'amount' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    ledgerId?: string;
  }): Promise<{ transactions: TransactionRecord[]; total: number; totalPages: number }> {
    const {
      shopkeeperId,
      page = 1,
      limit = 10,
      search,
      type,
      paymentMethod,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'desc',
      ledgerId,
    } = params;

    if (await checkDbConnection()) {
      try {
        const where: Record<string, unknown> = {
          isDeleted: false,
          ledger: {
            shopkeeperId,
          },
        };

        if (ledgerId) where.ledgerId = ledgerId;
        if (type) where.type = type;
        if (paymentMethod && paymentMethod !== 'ALL') where.paymentMethod = paymentMethod;

        if (dateFrom || dateTo) {
          const dateFilter: Record<string, Date> = {};
          if (dateFrom) {
            const df = new Date(dateFrom);
            if (!isNaN(df.getTime())) dateFilter.gte = df;
          }
          if (dateTo) {
            const dt = new Date(dateTo);
            if (!isNaN(dt.getTime())) dateFilter.lte = dt;
          }
          if (Object.keys(dateFilter).length > 0) {
            where.date = dateFilter;
          }
        }

        if (search) {
          where.OR = [
            { note: { contains: search, mode: 'insensitive' } },
            { ledger: { title: { contains: search, mode: 'insensitive' } } },
          ];
        }

        const [total, rows] = await Promise.all([
          prisma.transaction.count({ where }),
          prisma.transaction.findMany({
            where,
            include: {
              ledger: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: {
              [sortBy]: sortOrder,
            },
            skip: (page - 1) * limit,
            take: limit,
          }),
        ]);

        const transactions: TransactionRecord[] = rows.map((r) => ({
          id: r.id,
          ledgerId: r.ledgerId,
          type: r.type as 'CREDIT' | 'DEBIT',
          amount: Number(r.amount),
          date: r.date,
          paymentMethod: r.paymentMethod,
          note: r.note,
          version: r.version,
          isDeleted: r.isDeleted,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          ledger: r.ledger ? { id: r.ledger.id, title: r.ledger.title } : undefined,
        }));

        return {
          transactions,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        };
      } catch {
        markDatabaseOffline();
      }
    }

    const items = memoryStore.getAllTransactions().filter((tx) => {
      if (tx.isDeleted) return false;
      const ledger = memoryStore.getLedger(tx.ledgerId);
      const matchesShopkeeper = ledger ? ledger.shopkeeperId === shopkeeperId : true;
      if (!matchesShopkeeper) return false;

      if (ledgerId && tx.ledgerId !== ledgerId) return false;
      if (type && tx.type !== type) return false;
      if (paymentMethod && paymentMethod !== 'ALL' && tx.paymentMethod !== paymentMethod) return false;

      if (dateFrom) {
        const df = new Date(dateFrom);
        if (!isNaN(df.getTime()) && tx.date < df) return false;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        if (!isNaN(dt.getTime()) && tx.date > dt) return false;
      }

      if (search) {
        const s = search.toLowerCase();
        const noteMatch = (tx.note || '').toLowerCase().includes(s);
        const nameMatch = ((ledger?.title || tx.ledger?.title) || '').toLowerCase().includes(s);
        if (!noteMatch && !nameMatch) return false;
      }

      return true;
    });

    // Sorting
    items.sort((a, b) => {
      let valA: number | string | Date = a[sortBy] ?? a.date;
      let valB: number | string | Date = b[sortBy] ?? b.date;

      if (valA instanceof Date) valA = valA.getTime();
      if (valB instanceof Date) valB = valB.getTime();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return {
      transactions: paginated,
      total,
      totalPages,
    };
  }

  /**
   * Fetches a single transaction by ID.
   */
  static async getById(
    id: string,
    shopkeeperId: string
  ): Promise<{ notFound?: boolean; unauthorized?: boolean; transaction?: TransactionRecord }> {
    if (await checkDbConnection()) {
      try {
        const found = await prisma.transaction.findUnique({
          where: { id },
          include: {
            ledger: {
              select: {
                id: true,
                title: true,
                shopkeeperId: true,
              },
            },
          },
        });

        if (!found || found.isDeleted) {
          return { notFound: true };
        }

        if (found.ledger.shopkeeperId !== shopkeeperId) {
          return { unauthorized: true };
        }

        return {
          transaction: {
            id: found.id,
            ledgerId: found.ledgerId,
            type: found.type as 'CREDIT' | 'DEBIT',
            amount: Number(found.amount),
            date: found.date,
            paymentMethod: found.paymentMethod,
            note: found.note,
            version: found.version,
            isDeleted: found.isDeleted,
            createdAt: found.createdAt,
            updatedAt: found.updatedAt,
            ledger: {
              id: found.ledger.id,
              title: found.ledger.title,
            },
          },
        };
      } catch {
        markDatabaseOffline();
      }
    }

    const tx = memoryStore.getTransaction(id);
    if (!tx || tx.isDeleted) {
      return { notFound: true };
    }

    const ledger = memoryStore.getLedger(tx.ledgerId) || CustomerService.getRawById(tx.ledgerId);
    if (ledger && ledger.shopkeeperId && ledger.shopkeeperId !== shopkeeperId) {
      return { unauthorized: true };
    }

    return {
      transaction: {
        ...tx,
        ledger: tx.ledger || (ledger ? { id: ledger.id, title: 'title' in ledger ? ledger.title : ledger.name } : undefined),
      },
    };
  }

  /**
   * Updates an existing transaction.
   */
  static async update(
    id: string,
    shopkeeperId: string,
    updates: {
      type?: 'CREDIT' | 'DEBIT';
      amount?: number;
      date?: Date;
      paymentMethod?: string;
      note?: string | null;
    }
  ): Promise<{ notFound?: boolean; unauthorized?: boolean; transaction?: TransactionRecord }> {
    if (await checkDbConnection()) {
      try {
        const existing = await prisma.transaction.findUnique({
          where: { id },
          include: {
            ledger: {
              select: {
                id: true,
                title: true,
                shopkeeperId: true,
              },
            },
          },
        });

        if (!existing || existing.isDeleted) {
          return { notFound: true };
        }

        if (existing.ledger.shopkeeperId !== shopkeeperId) {
          return { unauthorized: true };
        }

        const updateData: Record<string, unknown> = {};
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.amount !== undefined) updateData.amount = new Prisma.Decimal(updates.amount.toFixed(2));
        if (updates.date !== undefined) updateData.date = updates.date;
        if (updates.paymentMethod !== undefined) updateData.paymentMethod = updates.paymentMethod;
        if (updates.note !== undefined) updateData.note = updates.note;

        const updated = await prisma.transaction.update({
          where: { id },
          data: updateData,
          include: {
            ledger: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        });

        return {
          transaction: {
            id: updated.id,
            ledgerId: updated.ledgerId,
            type: updated.type as 'CREDIT' | 'DEBIT',
            amount: Number(updated.amount),
            date: updated.date,
            paymentMethod: updated.paymentMethod,
            note: updated.note,
            version: updated.version,
            isDeleted: updated.isDeleted,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            ledger: updated.ledger ? { id: updated.ledger.id, title: updated.ledger.title } : undefined,
          },
        };
      } catch {
        markDatabaseOffline();
      }
    }

    const tx = memoryStore.getTransaction(id);
    if (!tx || tx.isDeleted) {
      return { notFound: true };
    }

    const ledger = memoryStore.getLedger(tx.ledgerId) || CustomerService.getRawById(tx.ledgerId);
    if (ledger && ledger.shopkeeperId && ledger.shopkeeperId !== shopkeeperId) {
      return { unauthorized: true };
    }

    const updated = memoryStore.updateTransaction(id, updates);
    return {
      transaction: updated ? {
        ...updated,
        ledger: updated.ledger || (ledger ? { id: ledger.id, title: 'title' in ledger ? ledger.title : ledger.name } : undefined),
      } : undefined,
    };
  }

  /**
   * Soft deletes a transaction.
   */
  static async delete(
    id: string,
    shopkeeperId: string
  ): Promise<{ notFound?: boolean; unauthorized?: boolean; transaction?: { id: string; isDeleted: boolean; updatedAt: Date } }> {
    if (await checkDbConnection()) {
      try {
        const existing = await prisma.transaction.findUnique({
          where: { id },
          include: {
            ledger: {
              select: {
                id: true,
                shopkeeperId: true,
              },
            },
          },
        });

        if (!existing || existing.isDeleted) {
          return { notFound: true };
        }

        if (existing.ledger.shopkeeperId !== shopkeeperId) {
          return { unauthorized: true };
        }

        const softDeleted = await prisma.transaction.update({
          where: { id },
          data: { isDeleted: true },
          select: {
            id: true,
            isDeleted: true,
            updatedAt: true,
          },
        });

        return {
          transaction: {
            id: softDeleted.id,
            isDeleted: softDeleted.isDeleted,
            updatedAt: softDeleted.updatedAt,
          },
        };
      } catch {
        markDatabaseOffline();
      }
    }

    const tx = memoryStore.getTransaction(id);
    if (!tx || tx.isDeleted) {
      return { notFound: true };
    }

    const ledger = memoryStore.getLedger(tx.ledgerId) || CustomerService.getRawById(tx.ledgerId);
    if (ledger && ledger.shopkeeperId && ledger.shopkeeperId !== shopkeeperId) {
      return { unauthorized: true };
    }

    const updated = memoryStore.updateTransaction(id, { isDeleted: true });
    return {
      transaction: updated
        ? {
            id: updated.id,
            isDeleted: true,
            updatedAt: updated.updatedAt,
          }
        : undefined,
    };
  }

  /**
   * Calculates Dashboard Financial Summary for the shopkeeper using precision arithmetic.
   */
  static async getSummary(shopkeeperId: string): Promise<{
    balance: number;
    creditGiven: number;
    totalPaid: number;
    totalTransactions: number;
  }> {
    if (await checkDbConnection()) {
      try {
        const transactions = await prisma.transaction.findMany({
          where: {
            isDeleted: false,
            ledger: {
              shopkeeperId,
            },
          },
          select: {
            type: true,
            amount: true,
          },
        });

        const summary = calculateFinancialSummary(
          transactions.map((tx) => ({
            type: tx.type as 'CREDIT' | 'DEBIT',
            amount: Number(tx.amount),
          }))
        );

        return {
          ...summary,
          totalTransactions: transactions.length,
        };
      } catch {
        markDatabaseOffline();
      }
    }

    const items = memoryStore.getAllTransactions().filter((tx) => {
      if (tx.isDeleted) return false;
      const ledger = memoryStore.getLedger(tx.ledgerId);
      return ledger ? ledger.shopkeeperId === shopkeeperId : true;
    });

    const summary = calculateFinancialSummary(
      items.map((tx) => ({
        type: tx.type,
        amount: tx.amount,
      }))
    );

    return {
      ...summary,
      totalTransactions: items.length,
    };
  }

  /**
   * Helper to reset in-memory test store.
   */
  static resetStore() {
    memoryStore.reset();
  }
}
