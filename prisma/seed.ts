import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing records (optional, in order of dependencies)
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.ledger.deleteMany();

  // 1. Create a Ledger
  const ledger = await prisma.ledger.create({
    data: {
      shopkeeperId: "shopkeeper_101",
      title: "General Store Ledger",
      totalBalance: 1500.0,
    },
  });

  // 2. Create Initial Transactions
  const tx1 = await prisma.transaction.create({
    data: {
      ledgerId: ledger.id,
      type: "CREDIT",
      amount: 2000.0,
      note: "Initial wholesale cash deposit",
      version: 1,
      isDeleted: false,
    },
  });

  const tx2 = await prisma.transaction.create({
    data: {
      ledgerId: ledger.id,
      type: "DEBIT",
      amount: 500.0,
      note: "Inventory supplier payment",
      version: 1,
      isDeleted: false,
    },
  });

  // 3. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        transactionId: tx1.id,
        action: "CREATE",
        newData: { amount: 2000.0, type: "CREDIT", note: tx1.note },
        actorId: "shopkeeper_101",
      },
      {
        transactionId: tx2.id,
        action: "CREATE",
        newData: { amount: 500.0, type: "DEBIT", note: tx2.note },
        actorId: "shopkeeper_101",
      },
    ],
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });