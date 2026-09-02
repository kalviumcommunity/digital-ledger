"use server";

import { prisma } from "@/lib/prisma";
// Replace this with your actual auth session getter (e.g. getServerSession(authOptions) or supabase.auth.getUser())
export async function getCurrentShopkeeper() {
  // Example placeholder - replace with your session/auth user retrieval:
  return {
    id: "active_user_id", // dynamically populated from session
    name: "Store Owner",
  };
}

export async function getOrCreateCurrentLedger(shopkeeperId: string) {
  let ledger = await prisma.ledger.findFirst({
    where: { shopkeeperId },
    include: {
      transactions: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!ledger) {
    ledger = await prisma.ledger.create({
      data: {
        shopkeeperId,
        title: "Main Store Ledger",
        totalBalance: 0.0,
      },
      include: {
        transactions: true,
      },
    });
  }

  return ledger;
}