import bcrypt from "bcryptjs";

export type DevUser = {
  id: number;
  name: string | null;
  email: string;
  mobile: string;
  password: string;
  role: "SHOPKEEPER" | "EMPLOYEE";
  shopkeeperId: number | null;
  createdAt: Date;
};

const globalStore = globalThis as typeof globalThis & {
  __khatabookDevUsers?: DevUser[];
};

const users = (globalStore.__khatabookDevUsers ??= []);

async function ensureDemoUser() {
  if (users.some((user) => user.email === "demo@khatabook.local")) return;
  users.push({
    id: 1,
    name: "Demo Shopkeeper",
    email: "demo@khatabook.local",
    mobile: "9999999999",
    password: await bcrypt.hash("Demo@123", 10),
    role: "SHOPKEEPER",
    shopkeeperId: null,
    createdAt: new Date(),
  });
}

export async function findDevUser(identifier: string) {
  await ensureDemoUser();
  const normalized = identifier.trim().toLowerCase();
  return users.find(
    (user) => user.email === normalized || user.mobile === identifier.replace(/\s+/g, "")
  );
}

export async function createDevUser(input: {
  name?: string | null;
  email: string;
  mobile: string;
  password: string;
}) {
  const user: DevUser = {
    id: Date.now(),
    name: input.name?.trim() || null,
    email: input.email,
    mobile: input.mobile,
    password: await bcrypt.hash(input.password, 10),
    role: "SHOPKEEPER",
    shopkeeperId: null,
    createdAt: new Date(),
  };
  users.push(user);
  return user;
}

export function findDevUserById(id: number) {
  return users.find((user) => user.id === id);
}

export function getDevCustomers() {
  const now = new Date();
  const records = [
    [101, "Aarav Traders", 12500, 5000],
    [102, "Meera General Store", 2400, 4000],
    [103, "Kabir Hardware", 3200, 3200],
    [104, "Neha Textiles", 8600, 2100],
    [105, "Rohan Electronics", 1800, 4500],
    [106, "Sana Cafe", 6200, 6200],
    [107, "Vikram Stationery", 9750, 3000],
    [108, "Isha Pharmacy", 1500, 2800],
    [109, "Arjun Furniture", 14300, 7000],
    [110, "Pooja Boutique", 5300, 5300],
    [111, "Dev Auto Parts", 4200, 900],
    [112, "Anaya Foods", 1100, 2500],
  ] as const;

  return records.map(([id, name, totalGive, totalGot]) => {
    const balance = totalGive - totalGot;
    const status = balance > 0 ? "DUE" : balance < 0 ? "ADVANCE" : "SETTLED";
    return {
      id,
      name,
      phone: `9876543${String(id - 91).padStart(3, "0")}`,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      address: "Khatabook Market",
      createdAt: now,
      updatedAt: now,
      totalGive,
      totalGot,
      balance,
      status: status as "DUE" | "ADVANCE" | "SETTLED",
      amountDueFormatted: `₹${Math.abs(balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      transactionCount: 2,
    };
  });
}
