import { prisma } from '@/lib/prisma';
import { MOCK_CUSTOMERS } from '@/app/dashboard/mockData';
import { Prisma, TransactionType } from '@prisma/client';
import { isDatabaseReachable, markDatabaseOffline } from '@/lib/dbCheck';

export interface CustomerDTO {
  id: string;
  name: string;
  phone: string;
  amountDue: number;
  totalCredit?: number;
  totalPaid?: number;
  transactionCount?: number;
  shopkeeperId?: string;
  createdAt?: string;
}

// In-memory fallback store for offline/local development and testing
class InMemoryCustomerStore {
  private customers: Map<string, CustomerDTO> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.customers.clear();
    MOCK_CUSTOMERS.forEach((c) => {
      this.customers.set(c.id, {
        id: c.id,
        name: c.name,
        phone: c.phone,
        amountDue: c.amountDue,
        totalCredit: c.amountDue > 0 ? c.amountDue + 5000 : 5000,
        totalPaid: 5000,
        transactionCount: 2,
        shopkeeperId: 'default-shopkeeper-id',
        createdAt: new Date().toISOString(),
      });
    });
  }

  public getAll(): CustomerDTO[] {
    return Array.from(this.customers.values());
  }

  public getById(id: string): CustomerDTO | undefined {
    return this.customers.get(id);
  }

  public create(customer: CustomerDTO): CustomerDTO {
    this.customers.set(customer.id, customer);
    return customer;
  }
}

const memoryCustomerStore = new InMemoryCustomerStore();

async function checkDbConnection(): Promise<boolean> {
  return await isDatabaseReachable();
}

export class CustomerService {
  /**
   * Returns a customer by ID from in-memory fallback without tenant filtering
   */
  static getRawById(id: string): CustomerDTO | undefined {
    return memoryCustomerStore.getById(id);
  }

  /**
   * Fetches all customer accounts (ledgers) belonging to the given shopkeeper.
   */
  static async getAll(shopkeeperId: string): Promise<CustomerDTO[]> {
    if (await checkDbConnection()) {
      try {
        const ledgers = await prisma.ledger.findMany({
          where: {
            shopkeeperId,
          },
          include: {
            transactions: {
              where: {
                isDeleted: false,
              },
              select: {
                type: true,
                amount: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return ledgers.map((ledger) => {
          let totalCredit = 0;
          let totalPaid = 0;

          ledger.transactions.forEach((tx) => {
            const amt = Number(tx.amount);
            if (tx.type === TransactionType.CREDIT) {
              totalCredit += amt;
            } else if (tx.type === TransactionType.DEBIT) {
              totalPaid += amt;
            }
          });

          const amountDue = totalCredit - totalPaid;

          return {
            id: ledger.id,
            name: ledger.title,
            phone: '9876xxxxxx',
            amountDue: Math.max(0, amountDue),
            totalCredit,
            totalPaid,
            transactionCount: ledger.transactions.length,
            shopkeeperId: ledger.shopkeeperId,
            createdAt: ledger.createdAt.toISOString(),
          };
        });
      } catch {
        markDatabaseOffline();
      }
    }

    // Fallback store
    return memoryCustomerStore.getAll().filter((c) => !c.shopkeeperId || c.shopkeeperId === shopkeeperId);
  }

  /**
   * Fetches a single customer account by ID, verifying tenant isolation.
   */
  static async getById(id: string, shopkeeperId: string): Promise<CustomerDTO | null> {
    if (await checkDbConnection()) {
      try {
        const ledger = await prisma.ledger.findUnique({
          where: { id },
          include: {
            transactions: {
              where: {
                isDeleted: false,
              },
              select: {
                type: true,
                amount: true,
              },
            },
          },
        });

        if (!ledger) {
          return null;
        }

        if (ledger.shopkeeperId !== shopkeeperId) {
          return null;
        }

        let totalCredit = 0;
        let totalPaid = 0;

        ledger.transactions.forEach((tx) => {
          const amt = Number(tx.amount);
          if (tx.type === TransactionType.CREDIT) {
            totalCredit += amt;
          } else if (tx.type === TransactionType.DEBIT) {
            totalPaid += amt;
          }
        });

        const amountDue = totalCredit - totalPaid;

        return {
          id: ledger.id,
          name: ledger.title,
          phone: '9876xxxxxx',
          amountDue: Math.max(0, amountDue),
          totalCredit,
          totalPaid,
          transactionCount: ledger.transactions.length,
          shopkeeperId: ledger.shopkeeperId,
          createdAt: ledger.createdAt.toISOString(),
        };
      } catch {
        markDatabaseOffline();
      }
    }

    // Fallback store
    const found = memoryCustomerStore.getById(id);
    if (!found) return null;
    if (found.shopkeeperId && found.shopkeeperId !== shopkeeperId) return null;
    return found;
  }

  /**
   * Creates a new Customer account (Ledger) for the shopkeeper.
   */
  static async create(data: {
    name: string;
    phone?: string;
    initialBalance?: number;
    shopkeeperId: string;
  }): Promise<CustomerDTO> {
    const { name, phone = '9876xxxxxx', initialBalance = 0, shopkeeperId } = data;

    if (await checkDbConnection()) {
      try {
        const ledger = await prisma.ledger.create({
          data: {
            title: name,
            shopkeeperId,
            totalBalance: new Prisma.Decimal(initialBalance),
          },
        });

        return {
          id: ledger.id,
          name: ledger.title,
          phone,
          amountDue: initialBalance,
          totalCredit: initialBalance,
          totalPaid: 0,
          transactionCount: 0,
          shopkeeperId: ledger.shopkeeperId,
          createdAt: ledger.createdAt.toISOString(),
        };
      } catch {
        markDatabaseOffline();
      }
    }

    // Fallback store
    const newId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer: CustomerDTO = {
      id: newId,
      name,
      phone,
      amountDue: initialBalance,
      totalCredit: initialBalance,
      totalPaid: 0,
      transactionCount: 0,
      shopkeeperId,
      createdAt: new Date().toISOString(),
    };

    return memoryCustomerStore.create(newCustomer);
  }

  static resetStore() {
    memoryCustomerStore.reset();
  }
}
