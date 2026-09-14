"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const node_util_1 = require("node:util");
const node_crypto_1 = require("node:crypto");
const prisma = new client_1.PrismaClient();
const scrypt = (0, node_util_1.promisify)(node_crypto_1.scrypt);
const SALT_BYTES = 16;
const KEY_BYTES = 64;
async function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(SALT_BYTES);
    const derived = (await scrypt(password, salt, KEY_BYTES));
    return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}
async function main() {
    console.log("Seeding database…");
    await prisma.user.deleteMany();
    const ownerPassword = await hashPassword("password123");
    const staffPassword = await hashPassword("staff@1234");
    const owner = await prisma.user.create({
        data: {
            email: "demo@khata.com",
            name: "Rahul Verma (Demo)",
            password: ownerPassword,
            role: "SHOPKEEPER",
        },
    });
    await prisma.user.create({
        data: {
            email: "staff@khata.com",
            name: "Aman Gupta",
            password: staffPassword,
            role: "EMPLOYEE",
        },
    });
    const customerSeed = [
        {
            name: "Aarav Sharma",
            phone: "9876543210",
            txs: [
                { type: "CREDIT", amount: 3500, note: "Kirana supplies on credit", daysAgo: 21 },
                { type: "CREDIT", amount: 1200, note: "Atta & rice stock", daysAgo: 12 },
                { type: "DEBIT", amount: 2000, note: "Partial payment — UPI", method: "UPI", daysAgo: 8 },
                { type: "CREDIT", amount: 800, note: "Monthly provisions", daysAgo: 2 },
            ],
        },
        {
            name: "Kiran Patel",
            phone: "9765432109",
            txs: [
                { type: "CREDIT", amount: 5000, note: "Textile invoice 1042", daysAgo: 30 },
                { type: "DEBIT", amount: 5000, note: "Cleared in full", daysAgo: 27 },
                { type: "CREDIT", amount: 2250, note: "New fabric order", method: "Bank Transfer", daysAgo: 5 },
            ],
        },
        {
            name: "Mohammed Irfan",
            phone: null,
            txs: [
                { type: "CREDIT", amount: 910, note: "Tea supplier — cash memo", daysAgo: 15 },
                { type: "CREDIT", amount: 640, note: "Snacks replenishment", daysAgo: 9 },
            ],
        },
        {
            name: "Sangeeta Rao",
            phone: "9012345678",
            txs: [
                { type: "CREDIT", amount: 4200, note: "Home appliances — CR/0724", daysAgo: 18 },
                { type: "DEBIT", amount: 1200, note: "Installment payment", daysAgo: 11 },
                { type: "CREDIT", amount: 3000, note: "Second installment purchase", method: "Cheque", daysAgo: 4 },
            ],
        },
        {
            name: "Vikram Singh",
            phone: "9900112233",
            txs: [
                { type: "CREDIT", amount: 10000, note: "Construction material — bulk", daysAgo: 25 },
                { type: "DEBIT", amount: 7500, note: "Payment by cash", daysAgo: 6 },
            ],
        },
    ];
    for (const spec of customerSeed) {
        const customer = await prisma.customer.create({
            data: { userId: owner.id, name: spec.name, phone: spec.phone },
        });
        const ledger = await prisma.ledger.create({
            data: { customerId: customer.id },
        });
        let total = 0;
        for (const txSpec of spec.txs) {
            const delta = txSpec.type === "CREDIT" ? txSpec.amount : -txSpec.amount;
            total += delta;
            const createdAt = new Date(Date.now() - (txSpec.daysAgo ?? 0) * 24 * 60 * 60 * 1000);
            const transaction = await prisma.transaction.create({
                data: {
                    ledgerId: ledger.id,
                    type: txSpec.type,
                    amount: txSpec.amount,
                    note: txSpec.note,
                    method: txSpec.method ?? "Cash",
                    version: 1,
                    isDeleted: false,
                    createdAt,
                    updatedAt: createdAt,
                },
            });
            await prisma.auditLog.create({
                data: {
                    transactionId: transaction.id,
                    action: "CREATE",
                    newData: {
                        amount: txSpec.amount,
                        type: txSpec.type,
                        note: txSpec.note,
                        method: txSpec.method ?? "Cash",
                        version: 1,
                    },
                    actorId: owner.name,
                    timestamp: createdAt,
                },
            });
        }
        await prisma.ledger.update({
            where: { id: ledger.id },
            data: { totalBalance: total },
        });
    }
    console.log("Seed complete.");
    console.log("Sign in with demo@khata.com / password123");
}
main()
    .catch((error) => {
    console.error("Seeding error:", error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
