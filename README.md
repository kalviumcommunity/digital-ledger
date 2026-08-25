# Digital Ledger

A full-stack digital Khata and ledger application designed to replace paper accounting books for shopkeepers and retail staff. It provides atomic balance calculations, optimistic concurrency conflict detection, and an immutable audit trail for every financial entry.

---

## Features

* **Atomic Balance Calculation**: Balances and transactions update simultaneously in an all-or-nothing database transaction to eliminate drift and calculation errors.
* **Optimistic Concurrency Control**: Uses auto-incrementing transaction version numbers to detect and block concurrent overwrites, returning HTTP 409 Conflict codes when collisions occur.
* **Full Audit Logging**: Every transaction creation, modification, or soft-deletion generates an immutable change record detailing old values, new values, timestamps, and actor IDs[cite: 3].
* **Soft Deletions**: Deleting entries hides them from active balances and lists while retaining complete history for accountability and auditing[cite: 3].
* **Cursor-Based Pagination**: Optimized pagination using indexed timestamps and IDs to maintain sub-50ms query speeds across large transaction histories[cite: 3].

---

## Tech Stack

* **Framework**: Next.js (App Router, Server Actions)[cite: 3]
* **Database**: PostgreSQL[cite: 3]
* **ORM**: Prisma ORM[cite: 3]
* **Math Precision**: Decimal.js[cite: 3]
* **Authentication**: NextAuth.js with Strict Role-Based Access Control (RBAC)[cite: 3]
* **Deployment & Cloud**: GCP Cloud Run (Compute) and GCP Cloud SQL (Database)[cite: 3]
* **CI/CD**: GitHub Actions[cite: 3]

---

## System Architecture

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | Next.js (React) | Instant running balance display, optimistic UI updates, and conflict resolution modals[cite: 3]. |
| **Backend** | Next.js Server Actions | Input validation, RBAC checks, balance delta calculation, and version verification[cite: 3]. |
| **Database** | PostgreSQL + Prisma | ACID-compliant atomic transactions, cursor indexing, and relational audit logging[cite: 3]. |
| **Infrastructure**| GCP Cloud Run | Auto-scaling containerized execution[cite: 3]. |

---

## Database Models

The database structure is managed via Prisma:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum TransactionType {
  CREDIT
  DEBIT
}

enum ActionType {
  CREATE
  EDIT
  DELETE
}

model Ledger {
  id           String        @id @default(uuid())
  shopkeeperId String
  title        String
  totalBalance Decimal       @default(0.00) @db.Decimal(12, 2)
  transactions Transaction[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([shopkeeperId])
}

model Transaction {
  id         String          @id @default(uuid())
  ledgerId   String
  ledger     Ledger          @relation(fields: [ledgerId], references: [id], onDelete: Cascade)
  type       TransactionType
  amount     Decimal         @db.Decimal(12, 2)
  note       String?
  version    Int             @default(1)
  isDeleted  Boolean         @default(false)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
  auditLogs  AuditLog[]

  @@index([ledgerId, createdAt(sort: Desc)])
}

model AuditLog {
  id            String      @id @default(uuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  action        ActionType
  oldData       Json?
  newData       Json?
  actorId       String
  timestamp     DateTime    @default(now())

  @@index([transactionId])
}