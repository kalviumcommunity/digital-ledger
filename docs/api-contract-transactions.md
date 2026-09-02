# Person 2 — Transaction API Contract

> **Owner:** Person 2 (Global Transaction Stream & Business Reports)
> **Status:** Draft — pending team approval
> **Last updated:** 2026-08-30

---

## 1. Data Model

### 1.1 Transaction Fields

| Field           | Type              | DB Column      | Required | Notes |
|:----------------|:------------------|:---------------|:---------|:------|
| `id`            | `string` (UUID)   | `id`           | auto     | Primary key, auto-generated UUID |
| `ledgerId`      | `string` (UUID)   | `ledgerId`     | ✅       | FK → `Ledger.id` (acts as `customerId` in the UI) |
| `type`          | `enum`            | `type`         | ✅       | `CREDIT` \| `DEBIT` (Prisma) |
| `amount`        | `number` (decimal)| `amount`       | ✅       | Positive, 2 decimal places, max 12 digits |
| `note`          | `string \| null`  | `note`         | ❌       | Optional description text |
| `paymentMethod` | `string`          | *(see §1.2)*   | ✅       | `Cash` \| `UPI` \| `Bank Transfer` |
| `date`          | `string` (ISO)    | *(see §1.2)*   | ✅       | User-specified transaction date/time |
| `version`       | `number`          | `version`      | auto     | Starts at 1, reserved for Person 3 concurrency |
| `isDeleted`     | `boolean`         | `isDeleted`    | auto     | Soft-delete flag, default `false` |
| `createdAt`     | `string` (ISO)    | `createdAt`    | auto     | Server-generated creation timestamp |
| `updatedAt`     | `string` (ISO)    | `updatedAt`    | auto     | Server-generated update timestamp |

### 1.2 Schema Gap — Needs Team Decision

The current Prisma schema (`schema.prisma`) does **not** include `paymentMethod` or a user-specified `date` field on the `Transaction` model. Two new columns are needed:

```prisma
model Transaction {
  // ... existing fields ...
  paymentMethod  String?          // "Cash" | "UPI" | "Bank Transfer"
  date           DateTime?        // user-specified transaction date (distinct from createdAt)
}
```

> [!IMPORTANT]
> **Team decision required:** Adding `paymentMethod` and `date` columns to the shared `Transaction` model affects Person 3's Customer Ledger. This migration must be coordinated.

### 1.3 Type Mapping: UI ↔ Prisma

The frontend uses business-friendly names; the Prisma schema uses accounting terms.

| UI Label (Person 2)  | API `type` value | Prisma Enum (`TransactionType`) |
|:----------------------|:-----------------|:--------------------------------|
| Credit Given          | `CREDIT`         | `CREDIT`                        |
| Payment Received      | `DEBIT`          | `DEBIT`                         |

> The API accepts and returns the **Prisma enum values** (`CREDIT`, `DEBIT`).
> The frontend maps these to display labels.

---

## 2. Endpoints

Base path: `/api/transactions`

| Method   | Path                      | Description                        |
|:---------|:--------------------------|:-----------------------------------|
| `POST`   | `/api/transactions`       | Create a new transaction           |
| `GET`    | `/api/transactions`       | List transactions (paginated)      |
| `GET`    | `/api/transactions/:id`   | Get a single transaction by ID     |
| `PUT`    | `/api/transactions/:id`   | Update a transaction               |
| `DELETE` | `/api/transactions/:id`   | Soft-delete a transaction          |

---

## 3. POST /api/transactions

### 3.1 Request Body

```json
{
  "ledgerId": "uuid-string",
  "type": "CREDIT",
  "amount": 17591.69,
  "date": "2026-08-12T16:15:00+05:30",
  "paymentMethod": "UPI",
  "note": "Goods purchased"
}
```

| Field           | Type     | Required | Validation |
|:----------------|:---------|:---------|:-----------|
| `ledgerId`      | `string` | ✅       | Must reference an existing `Ledger.id` |
| `type`          | `string` | ✅       | Must be `CREDIT` or `DEBIT` |
| `amount`        | `number` | ✅       | Must be numeric, `> 0`, max 2 decimal places |
| `date`          | `string` | ✅       | Must be a valid ISO 8601 datetime |
| `paymentMethod` | `string` | ✅       | Must be `Cash`, `UPI`, or `Bank Transfer` |
| `note`          | `string` | ❌       | Max 500 characters |

### 3.2 Success Response — `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "txn-uuid",
    "ledgerId": "ledger-uuid",
    "type": "CREDIT",
    "amount": 17591.69,
    "date": "2026-08-12T16:15:00.000Z",
    "paymentMethod": "UPI",
    "note": "Goods purchased",
    "version": 1,
    "isDeleted": false,
    "createdAt": "2026-08-12T10:45:00.000Z",
    "updatedAt": "2026-08-12T10:45:00.000Z"
  }
}
```

### 3.3 Error Response — `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "amount", "message": "Amount must be greater than zero" },
      { "field": "ledgerId", "message": "Ledger not found" }
    ]
  }
}
```

### 3.4 Error Response — `500 Internal Server Error`

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## 4. GET /api/transactions

### 4.1 Query Parameters

| Param          | Type     | Default  | Description |
|:---------------|:---------|:---------|:------------|
| `page`         | `number` | `1`      | Page number (1-indexed) |
| `limit`        | `number` | `10`     | Items per page (max 100) |
| `search`       | `string` | —        | Search against customer name or note (partial, case-insensitive) |
| `type`         | `string` | —        | Filter by type: `CREDIT` or `DEBIT` |
| `paymentMethod`| `string` | —        | Filter: `Cash`, `UPI`, or `Bank Transfer` |
| `dateFrom`     | `string` | —        | ISO 8601, inclusive lower bound on `date` |
| `dateTo`       | `string` | —        | ISO 8601, inclusive upper bound on `date` |
| `sortBy`       | `string` | `date`   | Sort field: `date`, `amount`, `createdAt` |
| `sortOrder`    | `string` | `desc`   | Sort direction: `asc` or `desc` |
| `ledgerId`     | `string` | —        | Filter by specific ledger/customer |

**Example:**
```
GET /api/transactions?page=1&limit=10&type=CREDIT&search=Juhi&sortBy=date&sortOrder=desc
```

### 4.2 Success Response — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "txn-001",
      "ledgerId": "ledger-uuid",
      "type": "CREDIT",
      "amount": 17591.69,
      "date": "2026-08-12T16:15:00.000Z",
      "paymentMethod": "UPI",
      "note": "Goods purchased",
      "version": 1,
      "isDeleted": false,
      "createdAt": "2026-08-12T10:45:00.000Z",
      "updatedAt": "2026-08-12T10:45:00.000Z",
      "ledger": {
        "id": "ledger-uuid",
        "title": "Juhi Aggarwal"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

> **Note:** The `ledger` object is included in list responses so the UI can display customer name without a separate lookup. This is a JOIN, not a nested resource.

---

## 5. GET /api/transactions/:id

### 5.1 Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "txn-001",
    "ledgerId": "ledger-uuid",
    "type": "CREDIT",
    "amount": 17591.69,
    "date": "2026-08-12T16:15:00.000Z",
    "paymentMethod": "UPI",
    "note": "Goods purchased",
    "version": 1,
    "isDeleted": false,
    "createdAt": "2026-08-12T10:45:00.000Z",
    "updatedAt": "2026-08-12T10:45:00.000Z",
    "ledger": {
      "id": "ledger-uuid",
      "title": "Juhi Aggarwal"
    }
  }
}
```

### 5.2 Error Response — `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Transaction not found"
  }
}
```

---

## 6. PUT /api/transactions/:id

### 6.1 Editable Fields

| Field           | Editable | Notes |
|:----------------|:---------|:------|
| `type`          | ✅       | `CREDIT` or `DEBIT` |
| `amount`        | ✅       | Must be `> 0` |
| `date`          | ✅       | Valid ISO 8601 |
| `paymentMethod` | ✅       | `Cash`, `UPI`, or `Bank Transfer` |
| `note`          | ✅       | Max 500 chars, nullable |
| `id`            | ❌       | Immutable |
| `ledgerId`      | ❌       | Cannot reassign to different customer |
| `version`       | ❌       | Managed by Person 3 concurrency system |
| `createdAt`     | ❌       | Immutable |
| `isDeleted`     | ❌       | Managed by DELETE endpoint |

### 6.2 Request Body (partial update)

```json
{
  "type": "DEBIT",
  "amount": 18000.00,
  "note": "Updated — payment method changed"
}
```

Only fields present in the body are updated. Missing fields are left unchanged.

### 6.3 Validation

Same rules as POST for any field that is present.

### 6.4 Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "txn-001",
    "ledgerId": "ledger-uuid",
    "type": "DEBIT",
    "amount": 18000.00,
    "date": "2026-08-12T16:15:00.000Z",
    "paymentMethod": "UPI",
    "note": "Updated — payment method changed",
    "version": 1,
    "isDeleted": false,
    "createdAt": "2026-08-12T10:45:00.000Z",
    "updatedAt": "2026-08-30T09:20:00.000Z"
  }
}
```

### 6.5 Error Responses

- `400` — Validation error (same format as POST)
- `404` — Transaction not found

---

## 7. DELETE /api/transactions/:id

Performs a **soft delete** by setting `isDeleted = true`. The record is not removed from the database.

### 7.1 Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "txn-001",
    "isDeleted": true,
    "updatedAt": "2026-08-30T09:25:00.000Z"
  }
}
```

### 7.2 Error Response — `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Transaction not found"
  }
}
```

> All `GET` endpoints automatically filter out soft-deleted records (`isDeleted = false`).

---

## 8. Standard Response Envelope

All responses use a consistent envelope:

```typescript
// Success
interface ApiSuccess<T> {
  success: true;
  data: T;
  pagination?: PaginationMeta;  // only on list endpoints
}

// Error
interface ApiError {
  success: false;
  error: {
    code: string;          // machine-readable error code
    message: string;       // human-readable message
    details?: {            // field-level validation errors
      field: string;
      message: string;
    }[];
  };
}
```

### Pagination Envelope

```typescript
interface PaginationMeta {
  page: number;       // current page (1-indexed)
  limit: number;      // items per page
  total: number;      // total matching items
  totalPages: number; // ceil(total / limit)
}
```

---

## 9. HTTP Status Codes

| Code  | Usage |
|:------|:------|
| `200` | Successful GET, PUT, DELETE |
| `201` | Successful POST (created) |
| `400` | Validation errors |
| `404` | Resource not found |
| `500` | Unexpected server error |

---

## 10. Frontend Type Mapping

The frontend [`types.ts`](../src/app/dashboard/types.ts) uses different names than the API. This table defines the mapping:

| Frontend Field       | API Field        | Transform |
|:---------------------|:-----------------|:----------|
| `customerId`         | `ledgerId`       | Direct rename |
| `customerName`       | `ledger.title`   | From JOIN |
| `customerPhone`      | *(not in API)*   | Resolved client-side from customer list |
| `type: 'CREDIT_GIVEN'` | `type: 'CREDIT'` | Map on fetch/submit |
| `type: 'PAYMENT_RECEIVED'` | `type: 'DEBIT'` | Map on fetch/submit |
| `amount`             | `amount`         | Parse from decimal string |
| `description`        | `note`           | Direct rename |
| `createdAt`          | `date` (or `createdAt`) | Use `date` for display |
| `paymentMethod`      | `paymentMethod`  | Direct |

---

## 11. Decisions Requiring Team Approval

> [!WARNING]
> The following decisions affect other team members' modules and must be discussed before implementation.

### 11.1 Schema Migration — New Columns

Adding `paymentMethod` and `date` to the `Transaction` model requires a Prisma migration that will affect Person 3's Customer Ledger code.

**Proposed migration:**
```prisma
model Transaction {
  // existing fields unchanged...
  paymentMethod  String?    // nullable for backward compat
  date           DateTime?  // nullable; falls back to createdAt
}
```

### 11.2 Type Enum Naming Convention

The Prisma schema uses `CREDIT`/`DEBIT`. The frontend uses `CREDIT_GIVEN`/`PAYMENT_RECEIVED`.

**Proposed:** The API uses the Prisma values (`CREDIT`/`DEBIT`). The frontend maps to/from display labels. This avoids a Prisma enum change.

### 11.3 Ledger vs Customer

The Prisma model links transactions to a `Ledger` (which belongs to a shopkeeper), not directly to a `Customer` model. The UI calls this a "customer".

**Proposed:** The API uses `ledgerId` (matching Prisma). The frontend maps it to `customerId`.

### 11.4 Soft Delete Scope

Person 2's DELETE endpoint soft-deletes only (`isDeleted = true`). Person 3's audit trail may need the record to remain queryable.

**Proposed:** Soft-deleted records are excluded from `GET /transactions` by default, but remain in the DB for audit queries.

### 11.5 Search Across Customer Name

`GET /transactions?search=Juhi` requires a JOIN to the `Ledger` table to search by `title` (customer name). This is intentional for the global transaction stream.
