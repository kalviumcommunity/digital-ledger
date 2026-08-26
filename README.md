# Digital Ledger & Customer Audit System (KhataBook)

A digital ledger platform designed for businesses to manage customer financial accounts, track credit transactions, maintain immutable audit histories, and handle concurrent edits[cite: 1].

---

## Architecture & Module Responsibilities

The system is organized into three distinct feature modules:

* **Person 1 — Customer & Authentication Management:** User authentication, customer onboarding, and directory overview[cite: 1].
* **Person 2 — Global Transaction Stream & Business Reports:** Shop-wide transaction stream, global filters, and high-level financial reporting[cite: 1].
* **Person 3 — Customer Ledger, Audit Trails & Protection:** Individual customer ledgers, transaction lifecycle actions, concurrent edit locking, and audit histories[cite: 1].

---

## Features Implemented (Person 3 Scope)

### 1. Customer Ledger View (`/customers/[id]`)
* Displays customer details alongside a quick **Back to Customers** navigation link[cite: 1].
* **4 Financial Metric Cards:** Calculates and updates `Total Credit`, `Total Paid`, `Amount Due`, and `Transactions` count[cite: 1].
* **Transaction Table:** Itemized list showing timestamp, transaction type badges (`Payment` vs `Credit`), description notes, formatted amounts, and action buttons[cite: 1].

### 2. Transaction Modals & Lifecycle Controls
* **Add Transaction:** Supports toggling between `Credit Given` (decreases balance) and `Payment Received` (increases balance) with payment method selection (Cash, UPI, Bank Transfer)[cite: 1].
* **Edit Transaction & Concurrency Protection:** Form for editing records with protection against race conditions (`lockedBy` / `lockedAt`)[cite: 1]. Displays an alert banner if another employee is currently modifying the same transaction[cite: 1].
* **Immutable Audit Trail:** Chronological timeline modal displaying who created, modified, or deleted an entry with detailed diffs of previous versus new values[cite: 1].
* **Payment Notice Messenger:** Generates customer-specific outstanding reminder notices formatted for quick dispatch[cite: 1].

---

## Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Database & ORM:** PostgreSQL & Prisma[cite: 1]

---

## Getting Started

### Prerequisites

* Node.js (v18.17+ or v20+)
* npm / yarn / pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/kalviumcommunity/digital-ledger.git](https://github.com/kalviumcommunity/digital-ledger.git)
   cd digital-ledger