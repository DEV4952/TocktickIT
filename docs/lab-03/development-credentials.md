# Lab 3 — Development Credentials Reference

เอกสารรวบรวมบัญชีผู้ใช้งาน (Mock Users) และรหัสผ่านสำหรับการทดสอบระบบ TokTickIT ในสภาพแวดล้อม Development / Lab 3

---

## 🔑 ข้อมูลรหัสผ่านเริ่มต้น (Default Password)
> ทุกบัญชีในระบบที่ถูกสร้างผ่าน Database Seed ใช้รหัสผ่านเริ่มต้นเหมือนกันคือ:  
> **`Password123!`**

---

## 👥 ตารางสรุปบัญชีผู้ใช้แยกตามบทบาท (Role)

### 1. Requesters (ผู้ใช้งานทั่วไป / พนักงานแจ้งปัญหา)

| Status | Name | Email | Password | Department | Note |
|---|---|---|---|---|---|
| 🟢 **Active** | Alex Rivera | `alex.rivera@toktick.it` | `Password123!` | Engineering | บัญชีผู้ใช้ทั่วไป |
| 🟢 **Active** | Samantha Chen | `samantha.chen@toktick.it` | `Password123!` | Marketing | บัญชีผู้ใช้ทั่วไป |
| 🟢 **Active** | Marcus Vance | `marcus.vance@toktick.it` | `Password123!` | Finance | บัญชีผู้ใช้ทั่วไป |
| 🟢 **Active** | Elena Rostova | `elena.rostova@toktick.it` | `Password123!` | Design | บัญชีผู้ใช้ทั่วไป |
| 🟢 **Active** | Emily Davis | `emily.davis@toktick.it` | `Password123!` | Human Resources | ⚠️ **First Login** (`mustChangePassword: true`) — เมื่อ Login แล้วจะถูกบังคับให้เปลี่ยนรหัสผ่านทันที |
| 🔴 **Inactive** | Jordan Taylor | `jordan.taylor@toktick.it` | `Password123!` | Operations | ⛔ **Inactive Account** — ระบบจะปฏิเสธการ Login ด้วย HTTP 403 Forbidden |

---

### 2. IT Staff (เจ้าหน้าที่ฝ่ายไอที / ผู้รับเรื่อง)

| Status | Name | Email | Password | Department | Note |
|---|---|---|---|---|---|
| 🟢 **Active** | Michael Brown | `michael.brown@toktick.it` | `Password123!` | IT Support | เจ้าหน้าที่ IT ประจำคิว |
| 🟢 **Active** | Sarah Johnson | `sarah.johnson@toktick.it` | `Password123!` | IT Operations | เจ้าหน้าที่ IT ประจำคิว |
| 🟢 **Active** | David Lee | `david.lee@toktick.it` | `Password123!` | Network Operations | เจ้าหน้าที่ IT ประจำคิว |
| 🔴 **Inactive** | Kevin Patel | `kevin.patel@toktick.it` | `Password123!` | IT Support | ⛔ **Inactive Account** — ระบบจะปฏิเสธการ Login ด้วย HTTP 403 Forbidden |

---

### 3. Administrators (ผู้ดูแลระบบ)

| Status | Name | Email | Password | Department | Note |
|---|---|---|---|---|---|
| 🟢 **Active** | John Smith | `john.smith@toktick.it` | `Password123!` | System Administration | ผู้ดูแลระบบทั่วไป |
| 🟢 **Active** | Super Administrator | `admin@toktick.it` | `Password123!` | IT Governance | บัญชีผู้ดูแลระบบหลัก |
| 🔴 **Inactive** | *(None)* | - | - | - | - |

---

## 🧪 สถานการณ์ทดสอบที่แนะนำ (Test Scenarios)

1. **เข้าสู่ระบบปกติ (Standard Login)**:
   - ใช้ `alex.rivera@toktick.it` / `Password123!` -> เข้าสู่ระบบหน้า **My Tickets**
   - ใช้ `michael.brown@toktick.it` / `Password123!` -> เข้าสู่ระบบหน้า **My Queue**
   - ใช้ `admin@toktick.it` / `Password123!` -> เข้าสู่ระบบในฐานะ **Administrator**

2. **ทดสอบการบังคับเปลี่ยนรหัสผ่านครั้งแรก (Mandatory First-Login Password Change)**:
   - ใช้ `emily.davis@toktick.it` / `Password123!`
   - ระบบจะแสดงหน้าจอ **Change Password Required** และล็อคไม่ให้เข้าถึงฟังก์ชันอื่นจนกว่าจะเปลี่ยนรหัสผ่านสำเร็จ

3. **ทดสอบบัญชีที่ถูกระงับ (Inactive Account Rejection)**:
   - ใช้ `jordan.taylor@toktick.it` หรือ `kevin.patel@toktick.it` พร้อมรหัส `Password123!`
   - ระบบจะปฏิเสธการเข้าสู่ระบบและแสดงข้อความแจ้งเตือนสีแดงว่าบัญชีถูกระงับการใช้งาน
