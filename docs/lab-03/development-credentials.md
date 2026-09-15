# Lab 3 — Development Credentials Reference

This document provides mock user accounts and authentication credentials for testing the TokTickIT system in the Lab 3 Development environment.

---

## 🔑 Default Authentication Credentials

> All seeded test accounts in the system share the identical default initial password:  
> **`Password123!`**

---

## 👥 User Accounts by Role & Status

### 1. Requesters

| Status | Name | Email | Department | Notes |
|---|---|---|---|---|
| 🟢 **Active** | Alex Rivera | `alex.rivera@toktick.it` | Engineering | Standard Requester account |
| 🟢 **Active** | Samantha Chen | `samantha.chen@toktick.it` | Marketing | Standard Requester account |
| 🟢 **Active** | Marcus Vance | `marcus.vance@toktick.it` | Finance | Standard Requester account |
| 🟢 **Active** | Elena Rostova | `elena.rostova@toktick.it` | Design | Standard Requester account |
| 🟢 **Active** | Emily Davis | `emily.davis@toktick.it` | Human Resources | ⚠️ **First Login** (`mustChangePassword: true`) — Mandatory password change prompt on login |
| 🔴 **Inactive** | Jordan Taylor | `jordan.taylor@toktick.it` | Operations | ⛔ **Suspended Account** — Login rejected with HTTP 403 Forbidden |

---

### 2. IT Staff

| Status | Name | Email | Department | Notes |
|---|---|---|---|---|
| 🟢 **Active** | Michael Brown | `michael.brown@toktick.it` | IT Support | Operational IT queue access |
| 🟢 **Active** | Sarah Johnson | `sarah.johnson@toktick.it` | IT Operations | Operational IT queue access |
| 🟢 **Active** | David Lee | `david.lee@toktick.it` | Network Operations | Operational IT queue access |
| 🔴 **Inactive** | Kevin Patel | `kevin.patel@toktick.it` | IT Support | ⛔ **Suspended Account** — Login rejected with HTTP 403 Forbidden |

---

### 3. Administrators

| Status | Name | Email | Department | Notes |
|---|---|---|---|---|
| 🟢 **Active** | John Smith | `john.smith@toktick.it` | System Administration | System Administrator |
| 🟢 **Active** | Super Administrator | `admin@toktick.it` | IT Governance | Primary Root Administrator |
| 🔴 **Inactive** | *(None)* | - | - | - |

---

## 🧪 Recommended Test Scenarios

1. **Standard Authentication**:
   - Log in with `alex.rivera@toktick.it` / `Password123!` -> Navigates to **My Tickets**.
   - Log in with `michael.brown@toktick.it` / `Password123!` -> Navigates to **My Queue**.
   - Log in with `admin@toktick.it` / `Password123!` -> Navigates to **Administrator Dashboard**.

2. **Mandatory First-Login Password Change**:
   - Log in with `emily.davis@toktick.it` / `Password123!`.
   - The app renders the **Change Password Required** screen and locks business routes until password is updated.

3. **Inactive / Suspended Account Rejection**:
   - Attempt login with `jordan.taylor@toktick.it` or `kevin.patel@toktick.it` with `Password123!`.
   - Authentication rejects with HTTP 403 Forbidden and displays an account suspension warning banner.
