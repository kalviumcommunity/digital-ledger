# Digital Ledger & Customer Audit System (KhataBook)

A full-stack, enterprise-grade digital ledger platform designed for businesses to manage customer credit, track financial transactions, maintain tamper-proof audit trails, and resolve concurrent edits between staff members in real time.

🌐 **Live Production Deployment:** [https://digital-ledger-tu7k.onrender.com](https://digital-ledger-tu7k.onrender.com)

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Core Feature Modules](#core-feature-modules)
  - [Module 1: Authentication & Customer Directory](#module-1-authentication--customer-directory)
  - [Module 2: Transaction Stream & Financial Reports](#module-2-transaction-stream--financial-reports)
  - [Module 3: Customer Ledger & Audit Trails](#module-3-customer-ledger--audit-trails)
- [Security & Concurrency Control](#security--concurrency-control)
- [Database Schema & Models](#database-schema--models)
- [API Endpoints Reference](#api-endpoints-reference)
- [Tech Stack](#tech-stack)
- [Environment Variables](#environment-variables)
- [Email Delivery (Render & Cloud Support)](#email-delivery-render--cloud-support)
- [Getting Started](#getting-started)
  - [Quick Start with Docker](#quick-start-with-docker-single-command-)
  - [Manual Local Development](#manual-local-development)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Demo Credentials](#demo-credentials)

---

## Overview & Architecture

KhataBook replaces manual paper record-keeping with an automated, synchronized digital ledger. It provides shop owners and staff members with real-time balance tracking, credit risk monitoring, and detailed audit logs of every financial modification.

```
┌────────────────────────────────────────────────────────┐
│                   Next.js App Router                   │
│      (Server Actions + React 19 Client Components)     │
└──────────┬───────────────────┬───────────────────┬─────┘
           │                   │                   │
           ▼                   ▼                   ▼
   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
   │ Auth & Users  │   │ Transactions  │   │ Ledger & Logs │
   │ (OTP & Roles) │   │  & Reporting  │   │ & Concurrency │
   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌────────────────────────────────────────────────────────┐
│               Prisma ORM & PostgreSQL                  │
│       (Supabase Pooler / Local Docker Container)       │
└────────────────────────────────────────────────────────┘
```

---

## Core Feature Modules

### Module 1: Authentication & Customer Directory
* **Secure Authentication:** Cookie-based session management (`dl_session`) signed with SHA-256 / HMAC secrets.
* **Email Verification (OTP):** 6-digit one-time password required during registration and password reset. Codes expire in 10 minutes and are strictly single-use.
* **Role-Based Permissions:** Segregation between **Shopkeepers (Admins)** and **Employees (Staff)**.
* **Customer Management:** Comprehensive customer directory with search, phone number indexing, status filters, and live credit balance indicators.

### Module 2: Transaction Stream & Financial Reports
* **Global Activity Feed:** Real-time chronological view of all credits given and payments received across the entire business.
* **Advanced Filtering:** Filter transactions by date range, customer, payment mode (Cash, UPI, Bank Transfer), or transaction type.
* **Financial Metric Aggregation:** Live calculation of:
  * Total Credit Issued
  * Total Payment Collected
  * Outstanding Net Balance
  * Transaction Volume
* **Export & Invoicing:** Generates itemized invoices and financial summaries.

### Module 3: Customer Ledger & Audit Trails
* **Customer Ledger View (`/customers/[id]`):** Dedicated statement view showing historical financial balance, net due amount, and complete transaction history.
* **Lifecycle Controls:** Add new transactions (`Credit Given` vs `Payment Received`), edit transaction metadata, or record settlements.
* **Immutable Audit Trail:** Automated recording of every creation, update, and deletion in the `AuditLog` table, preserving previous vs new values with actor attribution and timestamps.
* **Payment Reminders:** One-click generation of formatted payment reminder notices ready for direct customer dispatch.

---

## Security & Concurrency Control

### Concurrency Protection (Edit Locking)
To prevent race conditions when multiple employees simultaneously edit the same customer ledger:
* When an employee opens a transaction for modification, a temporary lock (`lockedBy`, `lockedAt`) is placed on the record.
* If another employee attempts to open the same record, an alert displays identifying who is currently editing it.
* Locks automatically expire after an inactivity timeout (5 minutes) to avoid deadlocks.

### Anti-Leak OTP Policy
* **Zero UI Exposure:** OTP codes are **never** returned in API responses or displayed in client interfaces under any circumstance.
* **Database Isolation:** Raw codes are stored as hashed/secured records in PostgreSQL and cleared immediately upon successful verification.
* **Fast Socket Timeout:** Outbound email attempts timeout gracefully within 2.5s to prevent UI spinner hangs on constrained networks.

---

## Database Schema & Models

| Model | Description | Key Fields |
| :--- | :--- | :--- |
| `User` | Business staff and administrators | `id`, `name`, `email`, `password`, `role`, `createdAt` |
| `Customer` | Business clients with credit accounts | `id`, `name`, `phone`, `email`, `address`, `creditLimit` |
| `Transaction` | Credit and debit journal entries | `id`, `customerId`, `amount`, `type`, `paymentMode`, `lockedBy`, `lockedAt` |
| `AuditLog` | Tamper-proof history of record changes | `id`, `entityType`, `entityId`, `action`, `userId`, `diff`, `createdAt` |
| `OtpVerification` | Time-bound 6-digit auth verification codes | `id`, `email`, `otp`, `type`, `expiresAt`, `createdAt` |

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/customers` | List all customers with balances and search filters |
| `POST` | `/api/customers` | Create a new customer profile |
| `GET` | `/api/customers/[id]` | Fetch customer details and individual ledger records |
| `GET` | `/api/transactions` | Query global transactions with date and type filters |
| `POST` | `/api/transactions` | Record a new transaction (Credit or Payment) |
| `GET` | `/api/transactions/[id]` | Fetch single transaction details with active lock status |
| `PUT` | `/api/transactions/[id]` | Update an existing transaction (requires edit lock) |
| `DELETE` | `/api/transactions/[id]` | Remove a transaction and generate audit log entry |
| `GET` | `/api/transactions/summary` | Aggregate business-wide financial metrics |
| `GET` | `/api/transactions/[id]/invoice` | Generate formatted receipt/invoice data |
| `GET` | `/api/employees` | List active staff members |

---

## Tech Stack

- **Full-Stack Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
- **Frontend Library:** [React 19](https://react.dev/)
- **Programming Language:** [TypeScript 5](https://www.typescriptlang.org/)
- **Database & ORM:** [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM 6](https://www.prisma.io/)
- **Styling & UI:** [Tailwind CSS 4](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/)
- **Email Delivery:** [Brevo API](https://www.brevo.com) (HTTPS Port 443) / [Nodemailer](https://nodemailer.com/) (SMTP fallback)
- **Containerization:** [Docker](https://www.docker.com/) (Multi-stage Alpine image)
- **Cloud Hosting:** [Render](https://render.com/)

---

## Environment Variables

| Variable | Description | Required In |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler / local DB) | Local & Production |
| `NEXTAUTH_SECRET` | 32+ character secret key for cookie session encryption | Local & Production |
| `SESSION_SECRET` | Session token signing secret | Local & Production |
| `NEXTAUTH_URL` | Canonical application base URL | Local & Production |
| `NEXT_PUBLIC_APP_URL` | Public-facing client URL | Local & Production |
| `BREVO_API_KEY` | Brevo HTTPS REST API Key (`xkeysib-...`) | **Render / Cloud** |
| `BREVO_SENDER` | Verified sender email address (e.g., `tallyh29@gmail.com`) | **Render / Cloud** |
| `GMAIL_USER` | Gmail address for local SMTP fallback | Local (Optional) |
| `GMAIL_APP_PASSWORD`| 16-character Google App Password for local SMTP | Local (Optional) |

---

## Email Delivery (Render & Cloud Support)

Render Free Tier restricts outbound network traffic on standard SMTP ports (**25, 465, and 587**) to prevent spam bots. Traditional SMTP connections will time out on Render.

To guarantee reliable delivery on Render without network blocks:
- The application natively uses **Brevo's REST API** over **Port 443 (HTTPS)**.
- Any environment variable starting with `xkeysib-` is automatically detected and routed through HTTPS.
- Standard Gmail SMTP is retained as a zero-config fallback for local development.

---

## Getting Started

### Quick Start with Docker (Single Command) 🚀

Run the entire application, database, and migrations with Docker Compose:

```bash
docker compose up --build
```

- **Application URL:** [http://localhost:3000](http://localhost:3000)
- **Database:** PostgreSQL automatically boots on port `5432` with persistent volumes.
- **Auto-Seed:** Prisma schema syncs and demo users are seeded automatically.

To stop the containers:
```bash
docker compose down
```

---

### Manual Local Development

#### Prerequisites
* Node.js v20 or higher
* Running PostgreSQL database instance

#### Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/kalviumcommunity/digital-ledger.git
   cd digital-ledger
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL and secrets
   ```

4. **Initialize database & seed demo records:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing & Quality Assurance

Run the automated integration test suite covering authentication, database state, and OTP delivery:

```bash
# Type check the entire codebase
npx tsc --noEmit

# Run full OTP, Auth, and Password Reset integration tests
npx tsx test/auth-otp-flow.test.ts

# Production build verification
npm run build
```

---

## Demo Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Shopkeeper (Admin)** | `demo@khata.com` | `password123` | Full access: all customers, ledger edits, delete records, exports |
| **Employee (Staff)** | `staff@khata.com` | `staff@1234` | Add transactions, view balances, edit with concurrency locks |

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
