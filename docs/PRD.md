# Product Requirements Document (PRD)
## Digital Ledger & Customer Audit System (KhataBook)

**Document Version:** 1.0.0  
**Status:** Approved / In Production  
**Target Release:** Production Deployment on Render  
**Live URL:** [https://digital-ledger-tu7k.onrender.com](https://digital-ledger-tu7k.onrender.com)

---

## 1. Executive Summary & Vision

Small and medium retail businesses across emerging economies rely heavily on informal customer credit ("Khata" / "Udhar") to build customer loyalty and repeat business. However, traditional paper-based ledgers suffer from critical operational vulnerabilities:
- **Lost & Damaged Books:** Physical notebooks get lost, torn, water-damaged, or misplaced.
- **Arithmetic Inaccuracies:** Manual calculation errors lead to revenue leakages or customer disputes.
- **Credit Default & Lack of Visibility:** Business owners lack a birds-eye view of total outstanding dues across all customers.
- **Concurrent Staff Discrepancies:** When multiple shop employees record sales or collections simultaneously, entries conflict or get skipped.
- **Disputed Transactions:** Customers dispute transaction history without proof or clear audit trails.

**Product Vision:**  
*KhataBook* is a modern, cloud-native, enterprise-grade digital ledger application that replaces physical notebooks with an automated, synchronized, and tamper-evident financial ledger. It empowers shopkeepers and their staff to issue credit, collect repayments, monitor liquidity risks, track concurrent modifications, and export verifiable invoices in real time.

---

## 2. Target User Personas

### Persona 1: Rajesh (Shopkeeper / Business Owner)
- **Role:** Administrator / Owner (`SHOPKEEPER`).
- **Profile:** Runs a busy grocery and wholesale store with over 300 active credit accounts.
- **Goals:**
  - Instantly know how much total credit is outstanding across all customers.
  - Track customer-by-customer balances and payment histories.
  - Ensure staff cannot steal money or erase transactions without leaving an audit record.
  - Send automated payment reminders to customers whose dues are overdue.
- **Pain Points:** Paper registers get lost; manual reconciliations take 2 hours every evening; disputes with customers over old credit entries.

### Persona 2: Amit (Shop Assistant / Employee)
- **Role:** Staff Member (`EMPLOYEE`).
- **Profile:** Helps handle counter checkout, goods dispatch, and cash collection during rush hours.
- **Goals:**
  - Quickly record new credit or payment entries in under 10 seconds.
  - Search customers instantly by name or mobile number.
  - Avoid overwriting transactions that another staff member is modifying.
- **Pain Points:** Busy checkout counter requires instant response times without page lag or server timeouts.

### Persona 3: Suman (End Customer / Buyer)
- **Role:** Counterparty / Debtor.
- **Profile:** Regular neighborhood patron who buys daily groceries on weekly or monthly credit settlement.
- **Goals:**
  - Receive clear, transparent verification of payments made and balances owed.
  - Access itemized invoices with exact timestamps and payment modes.
- **Pain Points:** Discrepancies in handwritten paper slips where payments weren't recorded.

---

## 3. User Journeys & Core Workflows

### 3.1 Registration & Authentication Flow
1. User visits `/signup`.
2. Enters full name, email, and password (minimum 8 characters).
3. System validates input, generates an ephemeral 6-digit numeric OTP with a 10-minute TTL, and dispatches it to the user's email via Brevo HTTPS API.
4. User enters the 6-digit OTP received in their inbox.
5. System verifies the OTP, hashes the password with `scrypt`, provisions the `User` account, encrypts an `HS256` JWT session cookie (`dl_session`), and redirects to `/transactions`.

### 3.2 Forgot Password & Account Recovery Flow
1. User clicks "Forgot Password" on `/login`.
2. Enters account email address on `/forgot-password`.
3. System verifies user existence, creates an OTP in `OtpVerification`, and delivers it via Brevo HTTPS API. A 30-second cooldown timer activates on the UI.
4. User enters the OTP, new password, and password confirmation.
5. System verifies OTP validity, updates user password hash, invalidates the OTP, and returns a success confirmation with a link to login.

### 3.3 Customer Onboarding Flow
1. Shopkeeper clicks "Add Customer" from the navigation header or `/customers`.
2. Enters customer name (required, min 2 chars) and mobile phone (optional, 7-20 chars).
3. Backend executes a database transaction (`prisma.$transaction`) that creates the `Customer` and atomically initializes a corresponding `Ledger` record with `totalBalance = 0.00`.
4. The customer directory refreshes immediately with the newly added customer card.

### 3.4 Recording Credit & Payment Transactions
1. From `/customers/[id]` or the global dashboard, user clicks "Give Credit" or "Got Payment".
2. User enters amount, optional note/description, payment method (Cash, UPI, Bank Transfer, Card), and transaction date.
3. System verifies customer ownership, validates amount $> 0$, acquires atomic transaction lock, inserts `Transaction`, recalculates `Ledger.totalBalance`, and appends an immutable `AuditLog` entry.
4. The customer balance updates in real-time across both customer statement and global summary widgets.

### 3.5 Concurrent Editing & Lock Resolution Flow
1. Employee A clicks "Edit" on Transaction #42.
2. The system sets `lockedBy = Employee A` and `lockedAt = NOW()` with a 2-minute expiration window.
3. If Employee B attempts to edit Transaction #42 while the lock is active, the UI shows a visual warning: *"Record is currently being edited by another staff member"*.
4. Employee A submits updates $\rightarrow$ system increments `Transaction.version` (optimistic locking), updates fields, creates an `EDIT` audit log snapshot, and releases the lock.

---

## 4. Functional Requirements

| ID | Module | Requirement Description | Priority |
| :--- | :--- | :--- | :--- |
| **FR-01** | Auth | User registration with name, email, password, role (`SHOPKEEPER`, `EMPLOYEE`). | **P0** |
| **FR-02** | Auth | Ephemeral 6-digit email OTP verification for signup and password reset. | **P0** |
| **FR-03** | Auth | Secure, stateless JWT cookie authentication (`dl_session`) using `jose` HS256. | **P0** |
| **FR-04** | Auth | Password hashing using Node.js `scrypt` with random 16-byte salt and constant-time verification. | **P0** |
| **FR-05** | Customers | Create, view, search, and paginate customer directory with live balance cards. | **P0** |
| **FR-06** | Customers | Automatic 1-to-1 ledger creation upon customer registration. | **P0** |
| **FR-07** | Transactions | Record `CREDIT` (credit given) and `DEBIT` (payment received) entries. | **P0** |
| **FR-08** | Transactions | Atomic running balance calculation on `Ledger` table within database transactions. | **P0** |
| **FR-09** | Transactions | Filter transactions by date range, transaction type, customer, and search query. | **P0** |
| **FR-10** | Transactions | Server-driven pagination with URL query synchronization for bookmarking. | **P1** |
| **FR-11** | Audit | Immutable `AuditLog` creation on `CREATE`, `EDIT`, and `DELETE` actions. | **P0** |
| **FR-12** | Concurrency | Optimistic concurrency control using `version` increment and lock timeout window. | **P1** |
| **FR-13** | Reporting | Real-time aggregate calculation of total credit, total collected, and net receivable. | **P0** |
| **FR-14** | Export | One-click RFC-compliant CSV transaction history export. | **P1** |
| **FR-15** | Invoice | Printable and downloadable itemized PDF/HTML invoice generation. | **P1** |
| **FR-16** | Email | Transactional email delivery over HTTPS Port 443 via Brevo REST API. | **P0** |

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Security & Compliance
- **Zero Plaintext Credentials:** Passwords stored using `scrypt:salt:hash`.
- **Anti-Leak OTP Policy:** OTP codes are never logged, never returned in API responses, and strictly deleted after verification.
- **Multi-Tenant Isolation:** Every customer, ledger, and transaction query enforces `where: { userId: currentSession.userId }`. Shopkeeper A can never inspect or modify Shopkeeper B's data under any circumstance.
- **CSRF & XSS Mitigation:** Cookies configured with `httpOnly: true`, `sameSite: "lax"`, and `secure: true` in production.
- **Port Security:** Absolutely zero SMTP outbound ports (25, 465, 587) opened or used, preventing container blocks on cloud hosts.

### 5.2 Performance & Scalability
- **Initial Page Load:** $\le 800\text{ms}$ first contentful paint (FCP) via Next.js React Server Component pre-rendering.
- **Server Action Latency:** $\le 150\text{ms}$ for transaction recording and balance updates.
- **Database Connection Pooling:** Managed via Supabase pooler / Prisma client singleton to support high concurrent request throughput.
- **Client Bundle Size:** Optimized through Next.js standalone output and Turbopack tree-shaking.

### 5.3 Reliability & Fault Tolerance
- **Database Resilience:** Soft-fail in-memory mock fallback mode for local/unit testing when PostgreSQL is unreachable.
- **Email Resilience:** Non-blocking timeout on email requests to prevent UI hanging when upstream email gateways experience latency.

---

## 6. Release Criteria & Acceptance Sign-off

- [x] All 26/26 unit and contract tests in `test/brevo-email.test.ts` pass with 0 errors.
- [x] Full TypeScript compiler check (`npx tsc --noEmit`) passes with 0 errors.
- [x] Next.js production build (`npm run build`) compiles cleanly in Turbopack standalone mode.
- [x] Live cloud deployment on Render runs on `PORT 10000` with 100% operational uptime.
- [x] Brevo HTTPS email delivery delivers OTPs to user mailboxes reliably.
