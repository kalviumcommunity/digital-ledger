"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";

const demoLedgers: Record<string, {
  name: string;
  phone: string;
  balance: number;
  status: string;
  transactions: { type: "GIVE" | "GOT"; amount: number; note: string; date: string }[];
}> = {
  "101": {
    name: "Aarav Traders",
    phone: "9876543210",
    balance: 7500,
    status: "Amount Due",
    transactions: [
      { type: "GIVE", amount: 7500, note: "Stock purchase", date: "12 Sep 2026" },
      { type: "GIVE", amount: 5000, note: "Hardware supplies", date: "08 Sep 2026" },
      { type: "GOT", amount: 5000, note: "Part payment", date: "10 Sep 2026" },
    ],
  },
  "102": {
    name: "Meera General Store",
    phone: "9876543211",
    balance: -1600,
    status: "Advance",
    transactions: [
      { type: "GOT", amount: 4000, note: "Advance payment", date: "11 Sep 2026" },
      { type: "GIVE", amount: 2400, note: "Grocery supplies", date: "09 Sep 2026" },
    ],
  },
  "103": {
    name: "Kabir Hardware",
    phone: "9876543212",
    balance: 0,
    status: "Settled",
    transactions: [
      { type: "GIVE", amount: 3200, note: "Tools and fittings", date: "07 Sep 2026" },
      { type: "GOT", amount: 3200, note: "Full payment", date: "08 Sep 2026" },
    ],
  },
};

const additionalCustomers: Record<string, { name: string; phone: string; give: number; got: number }> = {
  "104": { name: "Neha Textiles", phone: "9876543013", give: 8600, got: 2100 },
  "105": { name: "Rohan Electronics", phone: "9876543014", give: 1800, got: 4500 },
  "106": { name: "Sana Cafe", phone: "9876543015", give: 6200, got: 6200 },
  "107": { name: "Vikram Stationery", phone: "9876543016", give: 9750, got: 3000 },
  "108": { name: "Isha Pharmacy", phone: "9876543017", give: 1500, got: 2800 },
  "109": { name: "Arjun Furniture", phone: "9876543018", give: 14300, got: 7000 },
  "110": { name: "Pooja Boutique", phone: "9876543019", give: 5300, got: 5300 },
  "111": { name: "Dev Auto Parts", phone: "9876543020", give: 4200, got: 900 },
  "112": { name: "Anaya Foods", phone: "9876543021", give: 1100, got: 2500 },
};

export default function CustomerLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const extra = additionalCustomers[id];
  const ledger = demoLedgers[id] ?? (extra ? {
    name: extra.name,
    phone: extra.phone,
    balance: extra.give - extra.got,
    status: extra.give > extra.got ? "Amount Due" : extra.give < extra.got ? "Advance" : "Settled",
    transactions: [
      { type: "GIVE" as const, amount: extra.give, note: "Account purchase", date: "12 Sep 2026" },
      { type: "GOT" as const, amount: extra.got, note: "Payment received", date: "10 Sep 2026" },
    ],
  } : demoLedgers["101"]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700"><BookOpen size={21} /></div>
              <div>
                <h1 className="text-2xl font-bold">{ledger.name}</h1>
                <p className="text-sm text-slate-500">{ledger.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">₹{Math.abs(ledger.balance).toLocaleString("en-IN")}</p>
              <p className={`text-sm font-semibold ${ledger.balance > 0 ? "text-red-600" : ledger.balance < 0 ? "text-amber-600" : "text-emerald-600"}`}>{ledger.status}</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {ledger.transactions.map((transaction, index) => (
              <div key={`${transaction.date}-${index}`} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${transaction.type === "GIVE" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                    {transaction.type === "GIVE" ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
                  </div>
                  <div><p className="font-semibold">{transaction.note}</p><p className="text-xs text-slate-500">{transaction.date}</p></div>
                </div>
                <p className={`font-bold ${transaction.type === "GIVE" ? "text-red-600" : "text-emerald-600"}`}>
                  {transaction.type === "GIVE" ? "You gave" : "You got"} ₹{transaction.amount.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
