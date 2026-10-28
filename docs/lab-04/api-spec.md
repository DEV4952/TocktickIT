# TokTickIT Lab 4 — REST API Specification

**Document Version:** 1.0.0  
**Status:** Approved for Implementation (Spec-DD Deliverable)  
**Base URL:** `http://localhost:3000/api`  
**Authors:** Sorawit Chaitong (@DEV4952)  
**Course:** CPE 334 Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Target Sprint:** Lab 4 — TokTickIT Actions Taken, Dashboards, and Final Regression  

---

## 1. Global Conventions & Standards

### 1.1. Protocol & Transport
- All requests are transmitted over HTTP/HTTPS.
- Request payload format: `Content-Type: application/json`.
- Response payload format: `Content-Type: application/json; charset=utf-8`.
- Date and time representations conform to ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).

### 1.2. Authentication & Session Resolution
- Client identity is determined via signed server-side session cookies (`toktick_session`) or `Bearer` tokens established in Lab 3.
- All endpoints extract authenticated user attributes: `{ id, email, role, isActive, mustChangePassword }`.
- If unauthenticated, endpoints reject the request with `401 Unauthorized`.
- If the authenticated account is inactive (`isActive: false`), endpoints return `403 Forbidden` (`ACCOUNT_INACTIVE`).
- If `mustChangePassword === true`, requests to business endpoints return `403 Forbidden` with error code `PASSWORD_CHANGE_REQUIRED`.

### 1.3. Standard Error Envelope
All error responses adhere to a consistent contract:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable explanation of failure condition.",
  "details": []
}
```

---

## 2. Role-Based Authorization Matrix

| Endpoint | Method | Requester (Owner) | Requester (Other) | IT Staff | Administrator | Unauthenticated |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `/api/tickets/:ticketId/actions` | `POST` | ❌ 403 | ❌ 403 | ✅ 201 | ✅ 201 | ❌ 401 |
| `/api/tickets/:ticketId/actions` | `GET` | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/tickets/:ticketId/actions/:id` | `GET` | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/tickets/:ticketId/actions/:id` | `PUT` | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/dashboard/requester` | `GET` | ✅ 200 | ✅ 200* | ❌ 403 | ❌ 403 | ❌ 401 |
| `/api/dashboard/staff` | `GET` | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/dashboard/admin` | `GET` | ❌ 403 | ❌ 403 | ❌ 403 | ✅ 200 | ❌ 401 |
| `/api/staff/tickets/:id/status` | `PATCH` | ❌ 403 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |
| `/api/tickets/:id/resolve-indication`| `POST` | ✅ 200 | ❌ 403 | ✅ 200 | ✅ 200 | ❌ 401 |

*\*Note: `/api/dashboard/requester` aggregates strictly data owned by the authenticated requester (`requesterId = session.userId`).*

---

## 3. Actions Taken API Endpoints

### 3.1. Create Action Taken
Record a new operational action taken under a specified ticket.

- **Method:** `POST`
- **Endpoint:** `/api/tickets/:ticketId/actions`
- **Access:** Authenticated `IT_STAFF` or `ADMINISTRATOR`
- **Path Parameters:**
  - `ticketId` (integer, required): ID of the parent ticket.

#### Request Body Schema
```json
{
  "actionDateTime": "2026-10-28T14:30:00.000Z",
  "description": "Inspected access point AP-04 in North Building. Reset PoE switch port.",
  "result": "Access point rebooted successfully and SSIDs are broadcasting normally.",
  "followUpRequired": true,
  "followUpNote": "Monitor Wi-Fi signal strength during peak hours tomorrow at 10:00 AM.",
  "attachmentNotes": "Refer to ping-test-log.txt uploaded in Ticket Attachments."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `actionDateTime` | string (ISO-8601) | Optional | Timestamp work was performed. Defaults to current server time if omitted. |
| `description` | string | **Yes** | Detailed description of action taken (min 5, max 3000 chars). |
| `result` | string | **Yes** | Outcome of the action (min 3, max 3000 chars). |
| `followUpRequired` | boolean | **Yes** | Whether follow-up action is required. |
| `followUpNote` | string | Conditional | **Required** if `followUpRequired === true` (min 3 chars). Ignored/null if false. |
| `attachmentNotes` | string | Optional | Notes indicating relevant attachments or screenshots (max 1000 chars). |

#### Response `201 Created`
```json
{
  "message": "Action taken recorded successfully",
  "action": {
    "id": 12,
    "ticketId": 45,
    "actionDateTime": "2026-10-28T14:30:00.000Z",
    "description": "Inspected access point AP-04 in North Building. Reset PoE switch port.",
    "result": "Access point rebooted successfully and SSIDs are broadcasting normally.",
    "performedBy": {
      "id": 3,
      "name": "Sarah Connor",
      "email": "sarah.connor@toktick.it",
      "role": "IT_STAFF"
    },
    "followUpRequired": true,
    "followUpNote": "Monitor Wi-Fi signal strength during peak hours tomorrow at 10:00 AM.",
    "attachmentNotes": "Refer to ping-test-log.txt uploaded in Ticket Attachments.",
    "createdAt": "2026-10-28T14:35:12.120Z",
    "updatedAt": "2026-10-28T14:35:12.120Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid payload shape or illegal future timestamp (`actionDateTime` > 5 minutes in future).
- `401 Unauthorized`: Session missing or expired.
- `403 Forbidden`: Authenticated user is a `REQUESTER`.
- `404 Not Found`: Parent `ticketId` does not exist.
- `422 Unprocessable Entity`: Validation failure (e.g. `followUpRequired` is true but `followUpNote` is empty or missing).
```json
{
  "error": "VALIDATION_FAILED",
  "message": "Follow-up note is mandatory when follow-up is required.",
  "details": [
    { "field": "followUpNote", "issue": "Must not be empty when followUpRequired is true" }
  ]
}
```
- `422 Unprocessable Entity` (Inactive Performer Safeguard):
```json
{
  "error": "INACTIVE_USER_REJECTED",
  "message": "Actions cannot be recorded by or assigned to an inactive user account."
}
```

---

### 3.2. List Actions Taken for Ticket
Retrieve all Actions Taken lines for a specific ticket, sorted chronologically.

- **Method:** `GET`
- **Endpoint:** `/api/tickets/:ticketId/actions`
- **Access:** Authenticated `IT_STAFF`, `ADMINISTRATOR`, or Ticket Owner `REQUESTER`
- **Path Parameters:**
  - `ticketId` (integer, required): ID of the parent ticket.

#### Response `200 OK`
```json
{
  "ticketId": 45,
  "ticketNumber": "TKT-2026-00045",
  "totalActions": 2,
  "actions": [
    {
      "id": 11,
      "ticketId": 45,
      "actionDateTime": "2026-10-28T10:15:00.000Z",
      "description": "Remote diagnostic ping and traceroute conducted.",
      "result": "Severe packet loss (40%) identified on default gateway.",
      "performedBy": {
        "id": 2,
        "name": "Alex Mercer",
        "email": "alex.mercer@toktick.it",
        "role": "IT_STAFF"
      },
      "followUpRequired": true,
      "followUpNote": "On-site dispatch scheduled for 14:00.",
      "attachmentNotes": null,
      "createdAt": "2026-10-28T10:20:00.000Z",
      "updatedAt": "2026-10-28T10:20:00.000Z"
    },
    {
      "id": 12,
      "ticketId": 45,
      "actionDateTime": "2026-10-28T14:30:00.000Z",
      "description": "Inspected access point AP-04 in North Building. Reset PoE switch port.",
      "result": "Access point rebooted successfully and SSIDs are broadcasting normally.",
      "performedBy": {
        "id": 3,
        "name": "Sarah Connor",
        "email": "sarah.connor@toktick.it",
        "role": "IT_STAFF"
      },
      "followUpRequired": true,
      "followUpNote": "Monitor Wi-Fi signal strength during peak hours tomorrow at 10:00 AM.",
      "attachmentNotes": "Refer to ping-test-log.txt uploaded in Ticket Attachments.",
      "createdAt": "2026-10-28T14:35:12.120Z",
      "updatedAt": "2026-10-28T14:35:12.120Z"
    }
  ]
}
```

---

### 3.3. Get Action Taken Detail
Retrieve a single Action Taken record.

- **Method:** `GET`
- **Endpoint:** `/api/tickets/:ticketId/actions/:id`
- **Access:** Authenticated `IT_STAFF`, `ADMINISTRATOR`, or Ticket Owner `REQUESTER`

---

### 3.4. Update Action Taken
Modify an existing Action Taken record. Note that `performedById` is immutable to preserve audit integrity; `updatedAt` is updated to current time.

- **Method:** `PUT`
- **Endpoint:** `/api/tickets/:ticketId/actions/:id`
- **Access:** Authenticated `IT_STAFF` or `ADMINISTRATOR`

#### Request Body Schema
```json
{
  "actionDateTime": "2026-10-28T14:30:00.000Z",
  "description": "Inspected access point AP-04. Replaced damaged RJ45 connector and rebooted PoE.",
  "result": "Signal strength verified at -52 dBm across 5GHz band.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Added ap04-speedtest.png to Ticket Attachments."
}
```

#### Response `200 OK`
```json
{
  "message": "Action taken updated successfully",
  "action": {
    "id": 12,
    "ticketId": 45,
    "actionDateTime": "2026-10-28T14:30:00.000Z",
    "description": "Inspected access point AP-04. Replaced damaged RJ45 connector and rebooted PoE.",
    "result": "Signal strength verified at -52 dBm across 5GHz band.",
    "performedBy": {
      "id": 3,
      "name": "Sarah Connor",
      "email": "sarah.connor@toktick.it",
      "role": "IT_STAFF"
    },
    "followUpRequired": false,
    "followUpNote": null,
    "attachmentNotes": "Added ap04-speedtest.png to Ticket Attachments.",
    "createdAt": "2026-10-28T14:35:12.120Z",
    "updatedAt": "2026-10-28T15:10:00.000Z"
  }
}
```

---

## 4. Dashboard Analytics Endpoints

### 4.1. Requester Dashboard Endpoint
Returns concise operational metrics and recent tickets strictly scoped to the authenticated Requester.

- **Method:** `GET`
- **Endpoint:** `/api/dashboard/requester`
- **Access:** Authenticated `REQUESTER`

#### Response `200 OK`
```json
{
  "user": {
    "id": 10,
    "name": "Jennifer Aniston",
    "email": "jennifer.a@toktick.it"
  },
  "metrics": {
    "myOpenTickets": 3,
    "waitingForRequester": 1,
    "inProgress": 2,
    "resolved": 5,
    "closed": 12
  },
  "drillDownLinks": {
    "myOpenTickets": "/tickets?statusGroup=open",
    "waitingForRequester": "/tickets?status=WAITING_FOR_REQUESTER",
    "inProgress": "/tickets?status=IN_PROGRESS",
    "resolved": "/tickets?status=RESOLVED",
    "closed": "/tickets?status=CLOSED"
  },
  "recentTickets": [
    {
      "id": 45,
      "ticketNumber": "TKT-2026-00045",
      "title": "Laptop battery drains quickly after OS update",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "categoryName": "Hardware",
      "updatedAt": "2026-10-28T09:14:00.000Z"
    },
    {
      "id": 42,
      "ticketNumber": "TKT-2026-00042",
      "title": "Request software access for Figma",
      "status": "RESOLVED",
      "priority": "MEDIUM",
      "categoryName": "Software",
      "updatedAt": "2026-10-27T17:30:00.000Z"
    },
    {
      "id": 38,
      "ticketNumber": "TKT-2026-00038",
      "title": "Need second monitor for workstation",
      "status": "RESOLVED",
      "priority": "LOW",
      "categoryName": "Hardware",
      "updatedAt": "2026-10-25T11:05:00.000Z"
    },
    {
      "id": 31,
      "ticketNumber": "TKT-2026-00031",
      "title": "Email not syncing on mobile Outlook",
      "status": "RESOLVED",
      "priority": "HIGH",
      "categoryName": "Network & Email",
      "updatedAt": "2026-10-24T08:20:00.000Z"
    },
    {
      "id": 20,
      "ticketNumber": "TKT-2026-00020",
      "title": "Password reset for finance portal",
      "status": "CLOSED",
      "priority": "URGENT",
      "categoryName": "Security",
      "updatedAt": "2026-10-20T14:00:00.000Z"
    }
  ]
}
```

#### Calculation Rules (BR-09, BR-10)
- `myOpenTickets`: Total tickets where `requesterId = user.id` and `status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')`.
- `waitingForRequester`: Total tickets where `requesterId = user.id` and `status = 'WAITING_FOR_REQUESTER'`.
- `inProgress`: Total tickets where `requesterId = user.id` and `status = 'IN_PROGRESS'`.
- `resolved`: Total tickets where `requesterId = user.id` and `status = 'RESOLVED'`.
- `closed`: Total tickets where `requesterId = user.id` and `status = 'CLOSED'`.
- `recentTickets`: Up to 5 most recently updated tickets owned by user (`updatedAt DESC`).

---

### 4.2. IT Staff Dashboard Endpoint
Returns operational queue counts, daily deltas, status/priority breakdowns, and recent activity for IT Staff and Administrators.

- **Method:** `GET`
- **Endpoint:** `/api/dashboard/staff`
- **Access:** Authenticated `IT_STAFF` or `ADMINISTRATOR`

#### Response `200 OK`
```json
{
  "user": {
    "id": 2,
    "name": "Michael Scott",
    "role": "IT_STAFF"
  },
  "metrics": {
    "newCount": 14,
    "newDelta": "+2 from yesterday",
    "openCount": 23,
    "openDelta": "-1 from yesterday",
    "inProgressCount": 18,
    "inProgressDelta": "+4 from yesterday",
    "waitingRequesterCount": 7,
    "waitingRequesterDelta": "+1 from yesterday",
    "myAssignedCount": 16,
    "myAssignedDelta": "+1 from yesterday",
    "unassignedCount": 9
  },
  "drillDownLinks": {
    "new": "/staff/queue?status=NEW",
    "open": "/staff/queue?status=OPEN",
    "inProgress": "/staff/queue?status=IN_PROGRESS",
    "waitingRequester": "/staff/queue?status=WAITING_FOR_REQUESTER",
    "myAssigned": "/staff/queue?assignedToMe=true",
    "unassigned": "/staff/queue?unassigned=true"
  },
  "breakdowns": {
    "byStatus": {
      "NEW": 14,
      "OPEN": 23,
      "IN_PROGRESS": 18,
      "WAITING_FOR_REQUESTER": 7,
      "RESOLVED": 34,
      "CLOSED": 88,
      "REOPENED": 3,
      "CANCELLED": 5
    },
    "byPriority": {
      "URGENT": 4,
      "HIGH": 15,
      "MEDIUM": 28,
      "LOW": 8
    }
  },
  "recentTickets": [
    {
      "id": 54,
      "ticketNumber": "TKT-2026-00054",
      "title": "Laptop battery drains quickly",
      "status": "IN_PROGRESS",
      "itPriority": "HIGH",
      "requesterName": "Jennifer Aniston",
      "ownerName": "Michael Scott",
      "updatedAt": "2026-10-28T09:14:00.000Z"
    },
    {
      "id": 53,
      "ticketNumber": "TKT-2026-00053",
      "title": "Printer large drawing offline",
      "status": "OPEN",
      "itPriority": "MEDIUM",
      "requesterName": "Jim Halpert",
      "ownerName": null,
      "updatedAt": "2026-10-28T08:12:00.000Z"
    },
    {
      "id": 52,
      "ticketNumber": "TKT-2026-00052",
      "title": "Outlook freezing intermittently",
      "status": "IN_PROGRESS",
      "itPriority": "HIGH",
      "requesterName": "Pam Beesly",
      "ownerName": "Michael Scott",
      "updatedAt": "2026-10-28T07:22:00.000Z"
    },
    {
      "id": 51,
      "ticketNumber": "TKT-2026-00051",
      "title": "Phone not receiving calls",
      "status": "OPEN",
      "itPriority": "MEDIUM",
      "requesterName": "Dwight Schrute",
      "ownerName": null,
      "updatedAt": "2026-10-27T16:01:00.000Z"
    },
    {
      "id": 50,
      "ticketNumber": "TKT-2026-00050",
      "title": "VPN disconnects randomly",
      "status": "RESOLVED",
      "itPriority": "URGENT",
      "requesterName": "Stanley Hudson",
      "ownerName": "Michael Scott",
      "updatedAt": "2026-10-27T15:04:00.000Z"
    }
  ]
}
```

---

### 4.3. Administrator Dashboard Endpoint
Reuses the IT Staff dashboard operational metrics and includes system user statistics.

- **Method:** `GET`
- **Endpoint:** `/api/dashboard/admin`
- **Access:** Authenticated `ADMINISTRATOR`

#### Response `200 OK`
```json
{
  "user": {
    "id": 1,
    "name": "David Wallace",
    "role": "ADMINISTRATOR"
  },
  "userMetrics": {
    "totalUsers": 12,
    "activeUsers": 10,
    "inactiveUsers": 2,
    "requesterCount": 6,
    "itStaffCount": 4,
    "adminCount": 2
  },
  "staffMetrics": {
    "newCount": 14,
    "newDelta": "+2 from yesterday",
    "openCount": 23,
    "openDelta": "-1 from yesterday",
    "inProgressCount": 18,
    "inProgressDelta": "+4 from yesterday",
    "waitingRequesterCount": 7,
    "waitingRequesterDelta": "+1 from yesterday",
    "myAssignedCount": 0,
    "unassignedCount": 9
  },
  "breakdowns": {
    "byStatus": { ... },
    "byPriority": { ... }
  },
  "recentTickets": [ ... ]
}
```

---

## 5. Ticket Workflow Status & Concurrency Conflict API

### 5.1. Advance Ticket Status
Transitions a ticket to a new lifecycle status while enforcing the status transition matrix (BR-06) and verifying that the update is not stale (BR-08).

- **Method:** `PATCH`
- **Endpoint:** `/api/staff/tickets/:id/status`
- **Access:** Authenticated `IT_STAFF` or `ADMINISTRATOR`
- **Path Parameters:**
  - `id` (integer, required): ID of the ticket.

#### Request Body Schema
```json
{
  "status": "RESOLVED",
  "currentUpdatedAt": "2026-10-28T09:14:00.000Z",
  "resolutionNote": "Replaced bad battery cell and verified charging cycle."
}
```

#### Response `200 OK` (Successful Transition)
```json
{
  "message": "Ticket status updated successfully",
  "ticket": {
    "id": 45,
    "ticketNumber": "TKT-2026-00045",
    "status": "RESOLVED",
    "updatedAt": "2026-10-28T14:40:00.000Z"
  }
}
```

#### Error Response `409 Conflict` (Stale / Concurrent Update)
Triggered when the ticket has been modified by another user since `currentUpdatedAt` was loaded:
```json
{
  "error": "CONFLICT",
  "message": "The ticket has been updated by another user since you loaded it. Please refresh and review the latest changes before reapplying your update.",
  "conflictDetails": {
    "clientSuppliedUpdatedAt": "2026-10-28T09:14:00.000Z",
    "serverActualUpdatedAt": "2026-10-28T14:38:10.000Z",
    "currentStatus": "IN_PROGRESS",
    "currentOwner": {
      "id": 4,
      "name": "Dwight Schrute"
    }
  }
}
```

#### Error Response `422 Unprocessable Entity` (Illegal Transition)
```json
{
  "error": "ILLEGAL_STATUS_TRANSITION",
  "message": "Cannot transition ticket from NEW to RESOLVED. Permitted transitions from NEW are: OPEN, IN_PROGRESS, CANCELLED.",
  "details": {
    "fromStatus": "NEW",
    "attemptedStatus": "RESOLVED",
    "permittedTransitions": ["OPEN", "IN_PROGRESS", "CANCELLED"]
  }
}
```

---

## 6. Safe Error Envelope Reference

| HTTP Status | Error Code | Example Scenario |
|---|---|---|
| `400 Bad Request` | `BAD_REQUEST` | Malformed JSON body, missing path parameter. |
| `401 Unauthorized` | `UNAUTHORIZED` | User has no active session cookie. |
| `403 Forbidden` | `FORBIDDEN` | Requester attempts to update an Action Taken or access staff dashboard. |
| `404 Not Found` | `NOT_FOUND` | Ticket ID or Action ID does not exist in the database. |
| `409 Conflict` | `CONFLICT` | Concurrent modification detected (`updatedAt` mismatch). |
| `422 Unprocessable Entity` | `VALIDATION_FAILED` | `followUpRequired` is true but `followUpNote` is empty. |
| `422 Unprocessable Entity` | `INACTIVE_USER_REJECTED` | Assignee or actor account is inactive (`isActive: false`). |
| `422 Unprocessable Entity` | `ILLEGAL_STATUS_TRANSITION` | Attempted status change violates state machine transition matrix. |
| `500 Internal Server Error`| `INTERNAL_ERROR` | Unexpected unhandled database or server exception. |
