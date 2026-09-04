# TokTickIT Lab 2 — REST API Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Base URL:** `http://localhost:3000/api`  
**Authors:** Sorawit Chaitong (@DEV4952), Phurithip Paisanworajit (@yiiipunn)  

---

## 1. Global Conventions & Standards

### 1.1. Protocol & Media Types
- All API requests and responses communicate over HTTP/HTTPS.
- Request payload: `Content-Type: application/json` (or `multipart/form-data` for file uploads).
- Response payload: `Content-Type: application/json; charset=utf-8`.
- Dates and timestamps are formatted in ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).

### 1.2. Development Authentication Header
Until full authentication is introduced in Lab 3, requester identity is passed in the HTTP request headers:

```http
x-requester-id: <number>
```

- If `x-requester-id` is missing on protected endpoints, the API responds with `401 Unauthorized`.
- If `x-requester-id` refers to a non-existent user, the API responds with `400 Bad Request`.
- If `x-requester-id` refers to an inactive user (`isActive: false`), ticket creation write requests respond with `403 Forbidden`.

### 1.3. Standard Error Envelope
All error responses adhere to a consistent JSON structure:

```json
{
  "error": "BAD_REQUEST",
  "message": "Validation failed on the submitted ticket form.",
  "details": [
    {
      "field": "title",
      "issue": "Title must be at least 5 characters long"
    }
  ]
}
```

### 1.4. Standard HTTP Status Codes

| Status Code | Reason Phrase | Typical Scenario |
|---|---|---|
| `200 OK` | Request succeeded; response payload returned. | `GET` requests, successful data queries. |
| `201 Created` | Resource created successfully. | `POST /api/tickets`, `POST /api/attachments/upload`. |
| `400 Bad Request` | Malformed request, invalid syntax, or failed validation. | Missing fields, invalid types, title too short. |
| `401 Unauthorized` | Missing required requester context header. | `x-requester-id` omitted on protected endpoint. |
| `403 Forbidden` | Requester is suspended or lacks permission. | Inactive user submitting ticket, accessing cross-tenant ticket. |
| `404 Not Found` | Target resource does not exist or unowned. | Non-existent ticket ID or category ID. |
| `409 Conflict` | Duplicate submission or state conflict. | Duplicate ticket submission within debounce window. |
| `422 Unprocessable Entity` | Semantic constraint violation. | Invalid file type or corrupted payload. |
| `500 Internal Server Error` | Unexpected unhandled server exception. | Database connection failure, unhandled crash. |

---

## 2. Endpoints

---

### 2.1. List Development Requesters

Retrieve the list of pre-seeded development users to populate the UI Requester Switcher.

- **Method:** `GET`
- **Path:** `/api/requesters`
- **Authentication:** None (Public Dev Tooling)

#### Response: `200 OK`
```json
[
  {
    "id": 1,
    "name": "Alex Rivera",
    "email": "alex.rivera@toktick.it",
    "department": "Engineering",
    "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    "isActive": true
  },
  {
    "id": 2,
    "name": "Samantha Chen",
    "email": "samantha.chen@toktick.it",
    "department": "Marketing",
    "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Samantha",
    "isActive": true
  },
  {
    "id": 3,
    "name": "Jordan Taylor",
    "email": "jordan.taylor@toktick.it",
    "department": "Operations",
    "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
    "isActive": false
  }
]
```

---

### 2.2. Get Current Requester Profile

Retrieve the active profile corresponding to the `x-requester-id` header.

- **Method:** `GET`
- **Path:** `/api/requesters/me`
- **Headers:** `x-requester-id: <number>` (Required)

#### Response: `200 OK`
```json
{
  "id": 1,
  "name": "Alex Rivera",
  "email": "alex.rivera@toktick.it",
  "department": "Engineering",
  "avatarUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  "isActive": true,
  "createdAt": "2026-08-29T00:00:00.000Z"
}
```

#### Error Responses:
- `401 Unauthorized` — `x-requester-id` header is missing.
- `404 Not Found` — Requester ID does not match any record.

---

### 2.3. List Categories

Fetch all supported IT ticket categories.

- **Method:** `GET`
- **Path:** `/api/categories`
- **Authentication:** None

#### Response: `200 OK`
```json
[
  {
    "id": 1,
    "name": "Account & Access",
    "createdAt": "2026-08-29T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Hardware",
    "createdAt": "2026-08-29T00:00:00.000Z"
  },
  {
    "id": 3,
    "name": "Software",
    "createdAt": "2026-08-29T00:00:00.000Z"
  },
  {
    "id": 4,
    "name": "Network",
    "createdAt": "2026-08-29T00:00:00.000Z"
  }
]
```

---

### 2.4. Create Ticket

Submit a new IT support ticket under the active requester's ownership.

- **Method:** `POST`
- **Path:** `/api/tickets`
- **Headers:**
  - `Content-Type: application/json`
  - `x-requester-id: <number>` (Required)

#### Request Body Schema

```typescript
interface CreateTicketRequest {
  title: string;          // Required, 5..150 characters, trimmed
  description: string;    // Required, 10..2000 characters, trimmed
  categoryId: number;     // Required, existing Category ID
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; // Optional, default: "MEDIUM"
  attachments?: Array<{  // Optional, max 3 items
    fileName: string;
    fileSize: number;     // max 5242880 bytes (5MB)
    fileType: string;     // image/jpeg, image/png, application/pdf, text/plain
    fileUrl: string;
  }>;
}
```

#### Example Request Body
```json
{
  "title": "Cannot connect to internal VPN gateway",
  "description": "After updating Cisco AnyConnect, the authentication handshake times out with error 403. Rebooted machine twice.",
  "categoryId": 4,
  "priority": "HIGH",
  "attachments": [
    {
      "fileName": "vpn-error-screenshot.png",
      "fileSize": 245100,
      "fileType": "image/png",
      "fileUrl": "/uploads/vpn-error-screenshot.png"
    }
  ]
}
```

#### Response: `201 Created`
```json
{
  "id": 42,
  "ticketNumber": "TIC-20260829-0042",
  "title": "Cannot connect to internal VPN gateway",
  "description": "After updating Cisco AnyConnect, the authentication handshake times out with error 403. Rebooted machine twice.",
  "status": "OPEN",
  "priority": "HIGH",
  "categoryId": 4,
  "category": {
    "id": 4,
    "name": "Network"
  },
  "requesterId": 1,
  "requester": {
    "id": 1,
    "name": "Alex Rivera",
    "email": "alex.rivera@toktick.it"
  },
  "attachments": [
    {
      "id": 12,
      "fileName": "vpn-error-screenshot.png",
      "fileSize": 245100,
      "fileType": "image/png",
      "fileUrl": "/uploads/vpn-error-screenshot.png",
      "createdAt": "2026-08-29T01:15:30.000Z"
    }
  ],
  "createdAt": "2026-08-29T01:15:30.000Z",
  "updatedAt": "2026-08-29T01:15:30.000Z"
}
```

#### Error Responses:
- `400 Bad Request` — Validation failure:
  ```json
  {
    "error": "VALIDATION_ERROR",
    "message": "Invalid ticket data",
    "details": [
      { "field": "title", "issue": "Title must be between 5 and 150 characters" },
      { "field": "categoryId", "issue": "Category ID does not exist" }
    ]
  }
  ```
- `401 Unauthorized` — `x-requester-id` header missing.
- `403 Forbidden` — Requester is inactive:
  ```json
  {
    "error": "USER_INACTIVE",
    "message": "Inactive requesters cannot submit new tickets."
  }
  ```
- `409 Conflict` — Duplicate submission detected within 3 seconds:
  ```json
  {
    "error": "DUPLICATE_SUBMISSION",
    "message": "A ticket with identical content was recently submitted. Please wait before retrying."
  }
  ```

---

### 2.5. Query Paginated Tickets (My Tickets)

Retrieve a paginated, searchable, filterable, and sortable list of tickets owned by the active requester.

- **Method:** `GET`
- **Path:** `/api/tickets`
- **Headers:**
  - `x-requester-id: <number>` (Required)

#### Query Parameters

| Parameter | Type | Required | Default | Allowed Values / Constraints |
|---|---|---|---|---|
| `page` | Integer | No | `1` | Min: 1 |
| `limit` | Integer | No | `10` | Allowed: `5`, `10`, `20`, `50` |
| `search` | String | No | None | Substring match across `ticketNumber`, `title`, `description` |
| `status` | String | No | None | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `priority` | String | No | None | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `categoryId` | Integer | No | None | Valid Category ID |
| `sortBy` | String | No | `createdAt` | `createdAt`, `updatedAt`, `priority`, `ticketNumber`, `title` |
| `sortOrder` | String | No | `desc` | `asc`, `desc` |

#### Example Request
```http
GET /api/tickets?page=1&limit=10&status=OPEN&priority=HIGH&search=vpn&sortBy=createdAt&sortOrder=desc
x-requester-id: 1
```

#### Response: `200 OK`
```json
{
  "data": [
    {
      "id": 42,
      "ticketNumber": "TIC-20260829-0042",
      "title": "Cannot connect to internal VPN gateway",
      "description": "After updating Cisco AnyConnect, the authentication handshake times out...",
      "status": "OPEN",
      "priority": "HIGH",
      "categoryId": 4,
      "category": {
        "id": 4,
        "name": "Network"
      },
      "requesterId": 1,
      "attachmentCount": 1,
      "createdAt": "2026-08-29T01:15:30.000Z",
      "updatedAt": "2026-08-29T01:15:30.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "metrics": {
    "total": 5,
    "open": 2,
    "inProgress": 1,
    "resolved": 1,
    "closed": 1
  }
}
```

#### Error Responses:
- `400 Bad Request` — Invalid query parameter (e.g. `limit=999`, `sortOrder=random`).
- `401 Unauthorized` — `x-requester-id` header missing.

---

### 2.6. Get Ticket Detail

Retrieve comprehensive details of a single ticket, including full description, relations, and attachments.

- **Method:** `GET`
- **Path:** `/api/tickets/:id` (where `:id` can be either the numeric database ID or the unique `ticketNumber`)
- **Headers:**
  - `x-requester-id: <number>` (Required)

#### Example Request
```http
GET /api/tickets/TIC-20260829-0042
x-requester-id: 1
```

#### Response: `200 OK`
```json
{
  "id": 42,
  "ticketNumber": "TIC-20260829-0042",
  "title": "Cannot connect to internal VPN gateway",
  "description": "After updating Cisco AnyConnect, the authentication handshake times out with error 403. Rebooted machine twice.",
  "status": "OPEN",
  "priority": "HIGH",
  "categoryId": 4,
  "category": {
    "id": 4,
    "name": "Network"
  },
  "requesterId": 1,
  "requester": {
    "id": 1,
    "name": "Alex Rivera",
    "email": "alex.rivera@toktick.it",
    "department": "Engineering"
  },
  "attachments": [
    {
      "id": 12,
      "fileName": "vpn-error-screenshot.png",
      "fileSize": 245100,
      "fileType": "image/png",
      "fileUrl": "/uploads/vpn-error-screenshot.png",
      "createdAt": "2026-08-29T01:15:30.000Z"
    }
  ],
  "createdAt": "2026-08-29T01:15:30.000Z",
  "updatedAt": "2026-08-29T01:15:30.000Z"
}
```

#### Error Responses:
- `401 Unauthorized` — `x-requester-id` header missing.
- `404 Not Found` — Ticket does not exist OR belongs to another requester:
  ```json
  {
    "error": "NOT_FOUND",
    "message": "Ticket not found or you do not have permission to view it."
  }
  ```

---

### 2.7. Upload Attachment File

Upload a binary file attachment before or during ticket submission.

- **Method:** `POST`
- **Path:** `/api/attachments/upload`
- **Headers:**
  - `Content-Type: multipart/form-data`
  - `x-requester-id: <number>` (Required)
- **Form Data Field:** `file` (Binary file)

#### Validation Rules:
- Allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`, `text/plain`
- Maximum file size: `5,242,880 bytes` (5 MB)

#### Response: `201 Created`
```json
{
  "fileName": "sanitized-diagnostic-log.txt",
  "fileSize": 104520,
  "fileType": "text/plain",
  "fileUrl": "/uploads/attachments/sanitized-diagnostic-log.txt"
}
```

#### Error Responses:
- `400 Bad Request` — No file uploaded or file exceeds size limit.
- `415 Unsupported Media Type` — MIME type is not permitted.
- `401 Unauthorized` — `x-requester-id` header missing.

---

## 3. TypeScript Shared API Type Definitions

```typescript
// Enums
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// Models
export interface Requester {
  id: number;
  name: string;
  email: string;
  department: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  createdAt?: string;
}

export interface Attachment {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  createdAt: string;
}

export interface TicketSummary {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: number;
  category: Category;
  requesterId: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends TicketSummary {
  requester: Requester;
  attachments: Attachment[];
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TicketMetrics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface PaginatedTicketsResponse {
  data: TicketSummary[];
  pagination: PaginationMetadata;
  metrics: TicketMetrics;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: Array<{ field?: string; issue: string }>;
}
```
