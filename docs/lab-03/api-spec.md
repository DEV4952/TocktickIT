# TokTickIT Lab 3 — REST API Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Spec-DD Deliverable)  
**Base URL:** `http://localhost:3000/api`  
**Authors:** Sorawit Chaitong (@DEV4952), Phurithip Paisanworajit (@yiiipunn)  
**Target Sprint:** Lab 3 — Multi-Role Ticketing, IT Operations & Administration  

---

## 1. Global Conventions & Standards

### 1.1. Protocol & Media Types
- All communication is transmitted via HTTP/HTTPS.
- Request payload: `Content-Type: application/json` (or `multipart/form-data` for file attachments).
- Response payload: `Content-Type: application/json; charset=utf-8`.
- Timestamps are formatted in ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).

### 1.2. Authentication & Session Strategy
In Lab 3, the temporary `x-requester-id` header is replaced with secure session-based authentication:
- Authentication state is maintained via signed session cookies (`toktick_session`) or Bearer tokens.
- Protected endpoints verify session validity and extract the authenticated user identity (`userId`, `role`, `isActive`, `mustChangePassword`).
- If unauthenticated, endpoints return `401 Unauthorized`.
- If authenticated but lacking required role or ownership, endpoints return `403 Forbidden`.
- If `mustChangePassword === true`, requests to all business endpoints return `403 Forbidden` with code `PASSWORD_CHANGE_REQUIRED`.

### 1.3. Standard Error Envelope
All error responses return a uniform schema:
```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to perform this action.",
  "details": []
}
```

---

## 2. Authentication & Profile APIs

### 2.1. User Login
- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Access:** Public (Unauthenticated)
- **Request Body:**
```json
{
  "email": "sarah.johnson@toktick.it",
  "password": "InitialPassword123!"
}
```
- **Response `200 OK` (Normal User):**
```json
{
  "user": {
    "id": 2,
    "email": "sarah.johnson@toktick.it",
    "fullName": "Sarah Johnson",
    "department": "IT Operations",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": false
  },
  "message": "Login successful"
}
```
- **Response `200 OK` (First-Login Password Change Required):**
```json
{
  "user": {
    "id": 5,
    "email": "new.user@toktick.it",
    "fullName": "New User",
    "department": "Marketing",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": true
  },
  "message": "Password change required before proceeding"
}
```
- **Error Responses:**
  - `400 Bad Request`: Validation error (missing email/password).
  - `401 Unauthorized`: Invalid email or password credentials.
  - `403 Forbidden`: Account is inactive (`isActive: false`).

---

### 2.2. User Logout
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Access:** Authenticated (Any Role)
- **Response `200 OK`:**
```json
{
  "message": "Logged out successfully"
}
```

---

### 2.3. Get Current User Profile
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Access:** Authenticated (Any Role)
- **Response `200 OK`:**
```json
{
  "user": {
    "id": 1,
    "email": "jennifer.anderson@toktick.it",
    "fullName": "Jennifer Anderson",
    "department": "Engineering",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": false
  }
}
```
- **Error Responses:**
  - `401 Unauthorized`: No active session.

---

### 2.4. Mandatory First-Login Password Change
- **Method:** `POST`
- **Endpoint:** `/api/auth/change-password`
- **Access:** Authenticated (User with `mustChangePassword: true` or active user changing password)
- **Request Body:**
```json
{
  "currentPassword": "InitialPassword123!",
  "newPassword": "MyNewSecurePassword#2026",
  "confirmPassword": "MyNewSecurePassword#2026"
}
```
- **Response `200 OK`:**
```json
{
  "user": {
    "id": 5,
    "email": "new.user@toktick.it",
    "fullName": "New User",
    "department": "Marketing",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": false
  },
  "message": "Password changed successfully. You may now access the system."
}
```
- **Error Responses:**
  - `400 Bad Request`: Password mismatch or does not satisfy complexity requirements (min 8 chars, uppercase, lowercase, digit, special character).
  - `401 Unauthorized`: Current password verification failed.

---

## 3. Requester Ticketing APIs (Preserved & Secured)

### 3.1. List Categories
- **Method:** `GET`
- **Endpoint:** `/api/categories`
- **Access:** Authenticated (Any Role)
- **Response `200 OK`:** Array of category objects.

---

### 3.2. Create Ticket
- **Method:** `POST`
- **Endpoint:** `/api/tickets`
- **Access:** Authenticated (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
- **Request Body (Multipart or JSON):**
```json
{
  "categoryId": 1,
  "title": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when the system is idle.",
  "priority": "MEDIUM"
}
```
- **Response `201 Created`:**
```json
{
  "ticket": {
    "id": 14,
    "ticketNumber": "TKT-20260911-0014",
    "title": "Laptop battery drains quickly",
    "description": "My laptop battery is draining much faster than usual...",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "status": "OPEN",
    "problemAppearsResolved": false,
    "categoryId": 1,
    "requesterId": 1,
    "ownerId": null,
    "createdAt": "2026-09-11T09:15:00.000Z",
    "updatedAt": "2026-09-11T09:15:00.000Z"
  }
}
```

---

### 3.3. Get Requester's Owned Tickets
- **Method:** `GET`
- **Endpoint:** `/api/tickets`
- **Access:** Authenticated (`REQUESTER` gets owned tickets only; `IT_STAFF`/`ADMIN` gets all or scoped)
- **Query Parameters:** `page`, `limit`, `search`, `status`, `priority`, `categoryId`, `sortBy`, `sortDir`
- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 14,
      "ticketNumber": "TKT-20260911-0014",
      "title": "Laptop battery drains quickly",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "status": "OPEN",
      "createdAt": "2026-09-11T09:15:00.000Z",
      "category": { "id": 1, "name": "Hardware" },
      "owner": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 3.4. Get Ticket Detail (Requester View)
- **Method:** `GET`
- **Endpoint:** `/api/tickets/:id`
- **Access:** Authenticated (`REQUESTER` must be owner; `IT_STAFF` or `ADMINISTRATOR` permitted)
- **Response `200 OK`:** Full ticket detail with category, requester, attachments, and public comments count.
- **Error Responses:**
  - `404 Not Found`: Ticket does not exist or user is a Requester who is not the owner.

---

### 3.5. Requester Indicate Problem Appears Resolved
- **Method:** `POST`
- **Endpoint:** `/api/tickets/:id/resolve-indication`
- **Access:** Authenticated (`REQUESTER` owner only)
- **Request Body:** `{ "comment": "The issue is no longer occurring after reboot. Thank you!" }` (Optional)
- **Response `200 OK`:**
```json
{
  "ticket": {
    "id": 14,
    "ticketNumber": "TKT-20260911-0014",
    "status": "OPEN",
    "problemAppearsResolved": true,
    "updatedAt": "2026-09-11T10:00:00.000Z"
  },
  "message": "Indication recorded. IT Staff will review and formally resolve the ticket."
}
```

---

## 4. IT Staff Ticket Queue & Operations APIs

### 4.1. IT Staff Ticket Queue Retrieval
- **Method:** `GET`
- **Endpoint:** `/api/staff/tickets`
- **Access:** Authenticated (`IT_STAFF`, `ADMINISTRATOR`)
- **Query Parameters:**
  - `page` (number, default: `1`)
  - `limit` (number, default: `10`)
  - `search` (string: matches `ticketNumber`, `title`, `description`, requester `fullName`)
  - `status` (string: `ALL`, `OPEN`, `IN_PROGRESS`, etc.)
  - `priority` (string: `ALL`, `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `categoryId` (number)
  - `ownerId` (string: `unassigned`, `me`, or specific user ID)
  - `sortBy` (string: `createdAt`, `updatedAt`, `itPriority`, `ticketNumber`, `status`)
  - `sortDir` (string: `asc`, `desc`, default: `desc`)
- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 14,
      "ticketNumber": "TKT-20260911-0014",
      "createdAt": "2026-09-11T09:15:00.000Z",
      "updatedAt": "2026-09-11T09:30:00.000Z",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 1, "name": "Hardware" },
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "status": "IN_PROGRESS",
      "problemAppearsResolved": false,
      "requester": {
        "id": 1,
        "fullName": "Jennifer Anderson",
        "email": "jennifer.anderson@toktick.it"
      },
      "owner": {
        "id": 2,
        "fullName": "Michael Brown",
        "role": "IT_STAFF"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 87,
    "totalPages": 9
  },
  "counts": {
    "all": 87,
    "unassigned": 12,
    "myTickets": 24,
    "inProgress": 35
  }
}
```

---

### 4.2. Claim Ticket Ownership
- **Method:** `PATCH`
- **Endpoint:** `/api/staff/tickets/:id/claim`
- **Access:** Authenticated (`IT_STAFF`, `ADMINISTRATOR`)
- **Request Body:** `{}`
- **Response `200 OK`:**
```json
{
  "ticket": {
    "id": 14,
    "ownerId": 2,
    "owner": {
      "id": 2,
      "fullName": "Michael Brown",
      "email": "michael.brown@toktick.it"
    },
    "updatedAt": "2026-09-11T10:15:00.000Z"
  },
  "message": "Ticket successfully claimed"
}
```

---

### 4.3. Reassign Ticket Ownership
- **Method:** `PATCH`
- **Endpoint:** `/api/staff/tickets/:id/reassign`
- **Access:** Authenticated (`IT_STAFF`, `ADMINISTRATOR`)
- **Request Body:**
```json
{
  "ownerId": 3
}
```
- **Response `200 OK`:** Updated ticket object with new owner.
- **Error Responses:**
  - `400 Bad Request`: Target user is not an active IT Staff or Administrator.

---

### 4.4. Update IT Priority
- **Method:** `PATCH`
- **Endpoint:** `/api/staff/tickets/:id/priority`
- **Access:** Authenticated (`IT_STAFF`, `ADMINISTRATOR`)
- **Request Body:**
```json
{
  "itPriority": "HIGH"
}
```
- **Response `200 OK`:** Updated ticket object (`itPriority: HIGH`, `requestedPriority` unchanged).

---

### 4.5. Update Ticket Status
- **Method:** `PATCH`
- **Endpoint:** `/api/staff/tickets/:id/status`
- **Access:** Authenticated (`IT_STAFF`, `ADMINISTRATOR`)
- **Request Body:**
```json
{
  "status": "RESOLVED",
  "resolutionSummary": "Replaced faulty battery pack and updated firmware."
}
```
- **Response `200 OK`:** Updated ticket object with new status.
- **Error Responses:**
  - `400 Bad Request`: Disallowed status transition according to the transition state machine.

---

## 5. Comments & Internal Notes APIs

### 5.1. List Public Comments
- **Method:** `GET`
- **Endpoint:** `/api/tickets/:id/comments`
- **Access:** Authenticated (`REQUESTER` owner, `IT_STAFF`, `ADMINISTRATOR`)
- **Response `200 OK`:**
```json
[
  {
    "id": 1,
    "ticketId": 14,
    "body": "Thank you for the update. Please let me know if you need any additional diagnostic info.",
    "createdAt": "2026-09-11T09:45:00.000Z",
    "author": {
      "id": 1,
      "fullName": "Jennifer Anderson",
      "role": "REQUESTER"
    }
  }
]
```

---

### 5.2. Post Public Comment
- **Method:** `POST`
- **Endpoint:** `/api/tickets/:id/comments`
- **Access:** Authenticated (`REQUESTER` owner, `IT_STAFF`, `ADMINISTRATOR`)
- **Request Body:**
```json
{
  "body": "We are investigating the issue on your hardware. We will provide an update shortly."
}
```
- **Response `201 Created`:** Newly created comment record with author information.
- **Error Responses:**
  - `400 Bad Request`: Empty or whitespace-only body text.

---

### 5.3. List Internal Notes
- **Method:** `GET`
- **Endpoint:** `/api/tickets/:id/notes`
- **Access:** Authenticated (`IT_STAFF`, `ADMINISTRATOR` only)
- **Response `200 OK`:**
```json
[
  {
    "id": 1,
    "ticketId": 14,
    "body": "Battery health diagnostics report 42% degraded capacity. Replacement unit dispatched from IT inventory.",
    "createdAt": "2026-09-11T09:50:00.000Z",
    "author": {
      "id": 2,
      "fullName": "Michael Brown",
      "role": "IT_STAFF"
    }
  }
]
```
- **Error Responses:**
  - `403 Forbidden`: User is a Requester (zero note data is returned).

---

### 5.4. Post Internal Note
- **Method:** `POST`
- **Endpoint:** `/api/tickets/:id/notes`
- **Access:** Authenticated (`IT_STAFF`, `ADMINISTRATOR` only)
- **Request Body:**
```json
{
  "body": "User's warranty expires in 30 days. Expedite replacement approval."
}
```
- **Response `201 Created`:** Newly created internal note record.
- **Error Responses:**
  - `403 Forbidden`: User is a Requester.

---

## 6. Administrator User Management APIs

### 6.1. List Users
- **Method:** `GET`
- **Endpoint:** `/api/admin/users`
- **Access:** Authenticated (`ADMINISTRATOR` only)
- **Query Parameters:** `search` (matches name or email), `role` (`ALL`, `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), `isActive` (`all`, `true`, `false`)
- **Response `200 OK`:**
```json
[
  {
    "id": 1,
    "fullName": "Jennifer Anderson",
    "email": "jennifer.anderson@toktick.it",
    "department": "Engineering",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-08-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "fullName": "Michael Brown",
    "email": "michael.brown@toktick.it",
    "department": "IT Support",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-08-01T00:00:00.000Z"
  }
]
```

---

### 6.2. Create User
- **Method:** `POST`
- **Endpoint:** `/api/admin/users`
- **Access:** Authenticated (`ADMINISTRATOR` only)
- **Request Body:**
```json
{
  "fullName": "Alex Thompson",
  "email": "alex.thompson@toktick.it",
  "department": "IT Operations",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPassword123!"
}
```
- **Response `201 Created`:**
```json
{
  "user": {
    "id": 10,
    "fullName": "Alex Thompson",
    "email": "alex.thompson@toktick.it",
    "department": "IT Operations",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2026-09-11T11:00:00.000Z"
  },
  "message": "User account created successfully"
}
```
- **Error Responses:**
  - `400 Bad Request`: Missing fields or invalid password complexity.
  - `409 Conflict`: Email address is already registered.

---

### 6.3. Update User Information
- **Method:** `PATCH`
- **Endpoint:** `/api/admin/users/:id`
- **Access:** Authenticated (`ADMINISTRATOR` only)
- **Request Body:**
```json
{
  "fullName": "Alex Thompson",
  "email": "alex.thompson@toktick.it",
  "department": "Senior IT Operations",
  "role": "IT_STAFF",
  "isActive": true
}
```
- **Response `200 OK`:** Updated user object.
- **Error Responses:**
  - `400 Bad Request`: Validation failure.
  - `403 Forbidden`: Admin attempting to deactivate self or demote own role.
  - `409 Conflict`: Admin attempting to deactivate or remove the last remaining active Administrator in the system.

---

### 6.4. Reset User Initial Password
- **Method:** `POST`
- **Endpoint:** `/api/admin/users/:id/reset-password`
- **Access:** Authenticated (`ADMINISTRATOR` only)
- **Request Body:**
```json
{
  "newInitialPassword": "TemporaryReset2026!"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Initial password reset successfully. User will be prompted to change password at next login.",
  "mustChangePassword": true
}
```
