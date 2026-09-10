# 💼 PeoplePay360 — Next-Gen HRMS & Automated Payroll Platform

<p align="center">
  <strong>An enterprise-grade, full-stack Human Resource Management & Automated Payroll Engine built with modern Innowise pastel aesthetics, Turing-complete mathematical formula evaluation, multi-tier RBAC permissions, real-time shift punch tracking, 2-step payrun creation wizard, algorithmic operational audit, automated payslip PDF generation, and Gmail/SMTP email delivery.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%206-6366f1?style=for-the-badge&logo=react&logoColor=white" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%205-10b981?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Backend" />
  <img src="https://img.shields.io/badge/Database-MySQL%208%20%7C%20Prisma%20ORM-0ea5e9?style=for-the-badge&logo=prisma&logoColor=white" alt="Database" />
  <img src="https://img.shields.io/badge/Formulas-Math.js%20Rule%20Engine-f59e0b?style=for-the-badge&logo=javascript&logoColor=white" alt="Engine" />
  <img src="https://img.shields.io/badge/Email-Nodemailer%20%7C%20Gmail%20SMTP-ea4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" />
  <img src="https://img.shields.io/badge/Currency-Indian%20Rupee%20(%E2%82%B9)-ec4899?style=for-the-badge" alt="Currency" />
  <img src="https://img.shields.io/badge/Security-JWT%20%7C%205--Role%20RBAC%20%7C%20Zod-8b5cf6?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="Security" />
</p>

---

## 📑 Table of Contents

- [✨ Platform Overview](#-platform-overview)
- [🌟 Key Feature Modules](#-key-feature-modules)
  - [1. Executive KPI & Analytics Dashboard](#1--executive-kpi--analytics-dashboard)
  - [2. Comprehensive Workforce & Employee Directory](#2--comprehensive-workforce--employee-directory)
  - [3. Employment Contracts & Work Schedules](#3--employment-contracts--work-schedules)
  - [4. Real-Time Shift Punch & Attendance Engine](#4--real-time-shift-punch--attendance-engine)
  - [5. Leave Entitlements & Multi-Tier Approvals](#5--leave-entitlements--multi-tier-approvals)
  - [6. Salary Structures & Math.js Rule Engine](#6--salary-structures--mathjs-rule-engine)
  - [7. 5-Stage Automated Batch Payroll Lifecycle](#7--5-stage-automated-batch-payroll-lifecycle)
  - [8. 2-Step Payrun Creation Wizard & Staff Picker](#8--2-step-payrun-creation-wizard--staff-picker)
  - [9. Algorithmic Operational Validation Audit](#9--algorithmic-operational-validation-audit)
  - [10. Pixel-Perfect PDF Payslips & Bulk Email Dispatch](#10--pixel-perfect-pdf-payslips--bulk-email-dispatch)
  - [11. Interactive Real-Time Notification Bell System](#11--interactive-real-time-notification-bell-system)
  - [12. AI Copilot Drawer & C-Suite Briefing Memo](#12--ai-copilot-drawer--c-suite-briefing-memo)
  - [13. Employee Self-Service (ESS) Portal](#13--employee-self-service-ess-portal)
- [🔐 5-Tier Role-Based Access Control (RBAC)](#-5-tier-role-based-access-control-rbac)
- [🔄 Payrun Processing Lifecycle](#-payrun-processing-lifecycle)
- [🛠️ Architecture & Tech Stack](#️-architecture--tech-stack)
- [⚡ Quick Start & Installation](#-quick-start--installation)
- [🔑 1-Click Demo Credentials](#-1-click-demo-credentials)
- [📡 Comprehensive REST API Directory](#-comprehensive-rest-api-directory)
- [🇮🇳 Currency & Localization](#-currency--localization)
- [📄 License](#-license)

---

## ✨ Platform Overview

**PeoplePay360** bridges modern workforce management and enterprise payroll automation into a single, cohesive, high-performance web platform. Built without bulky utility frameworks, it features a bespoke **Innowise pastel design system** (`#f6f5fb`, `#edeaf7`, `#5554aa`, `#059669`, `#f43f5e`) engineered with smooth micro-transitions, glassmorphic overlays, and accessible high-contrast typography.

The system empowers organizations to formulate complex, customizable compensation structures using **Turing-complete mathematical expressions**, automatically deduct Unpaid Loss of Pay (LOP) based on real-time attendance logs, enforce strict **5-tier role-based permissions**, execute multi-step payrun audits, and disburse itemized PDF payslips directly to employee inboxes with a single click.

---

## 🌟 Key Feature Modules

### 1. 📊 Executive KPI & Analytics Dashboard
- **Live Workforce Vital Signs**: Instant tracking of Total Active Staff, Monthly Payroll Burn, Today's Punch Attendance Rate, and Pending Time-Off Requests.
- **Interactive Recharts Visuals**:
  - **6-Month Spend Trajectory**: Area gradient line chart illustrating gross disbursements, statutory deductions, and net payout evolution over time.
  - **Department Distribution Donut**: Interactive headcount composition across Engineering, Product, Sales, Marketing, and HR & Operations with contextual hover cards.
- **Batch Cycle Ledger**: Quick-glance list of recent payruns with color-coded status pills (`DRAFT`, `CALCULATED`, `REVIEW`, `APPROVED`, `PAID`) and formatted Indian Rupee (`₹`) totals.

### 2. 👥 Comprehensive Workforce & Employee Directory
- **Employee 360° Dossiers**: Complete staff profiles detailing Employee Code (`EMP-XXXX`), Name, Corporate Email, Phone, Department, Job Position, Manager Hierarchy, Joining Date, and Employment Status.
- **Interactive Kanban & Grid Views**: Toggle between high-density tabular data with sortable columns and visual department cards.
- **High-Capacity Pagination & Filtering**: Instant fuzzy search across staff records with dynamic department filtering and configurable page sizes (10, 25, 50, 100, 250, 500 records).

### 3. 📜 Employment Contracts & Work Schedules
- **Multi-Model Compensation**: Supports `MONTHLY`, `WEEKLY`, and `HOURLY` pay agreements with customizable base wages.
- **Contract Timeline Lifecycle**: Start dates, optional termination dates, automatic expiration flagging, and contract-to-salary-structure bindings.
- **Working Shift Schedules**: Flexible shift definitions (start time, end time, working weekdays) with automatic weekly scheduled hours calculation linked directly to contract records.

### 4. ⏱️ Real-Time Shift Punch & Attendance Engine
- **Navbar Quick Clock-In / Clock-Out**: Single-click shift punching accessible from anywhere in the app with active shift timers and instant status notifications.
- **Automated Hours & Overtime Tracking**: Calculates exact worked hours (`workedHours`), half-day classifications, tardiness flags, and unexcused absences.
- **Managerial Attendance Audits**: Dedicated administrative screens for HR managers to review daily logs, correct punch anomalies, and track workforce punctuality.

### 5. 🌴 Leave Entitlements & Multi-Tier Approvals
- **Configurable Leave Types**: Paid Annual Leave, Casual Leave, Sick Leave, Parental Leave, and Unpaid Loss-of-Pay (LOP).
- **Dynamic Balance Ledgers**: Real-time tracking of employee allocations, days utilized, and remaining available balances.
- **Approval Workflow**: Employees submit time-off requests with reason notes; HR Managers and Admins can approve or refuse requests with automatic balance updates and payroll LOP adjustments.

### 6. 🧮 Salary Structures & Math.js Rule Engine
- **Formula-Driven Components**: Build custom earnings (Basic, HRA, Conveyance, Special Allowance) and deductions (PF, ESI, Professional Tax, TDS) using dynamic mathematical expressions (e.g. `BASIC * 0.50`, `BASIC * 0.12`, or tiered progressive tax formulas).
- **Dependency Graph Sequencing**: Component evaluation respects sequence dependencies (e.g., Gross Pay is calculated before statutory deductions).
- **Interactive Rule Sandbox**: Real-time evaluator to test formulas against mock employee inputs (`BASIC`, `WORKED_DAYS`, `LOP_DAYS`) before saving to live structures.

### 7. 💳 5-Stage Automated Batch Payroll Lifecycle
- **Strict State Machine**: Governs cycle integrity through distinct sequential stages:
  $$\text{DRAFT} \longrightarrow \text{CALCULATED} \longrightarrow \text{REVIEW} \longrightarrow \text{APPROVED} \longrightarrow \text{PAID}$$
- **Batch Rule Execution**: Evaluates all salary rules across hundreds of active employees in a single atomic database transaction.
- **One-Click Re-Opening**: Admins and Payroll Managers can reopen finalized or calculated batches back to `DRAFT` to adjust rules or re-sync newly contracted staff.

### 8. 🪄 2-Step Payrun Creation Wizard & Staff Picker
- **Step 1 — Scope & Boundaries**: Configure payrun name, salary structure template, period start/end dates, and scheduled disbursement dates with built-in date validation.
- **Step 2 — Interactive Staff Picker**: Visual checklist of all eligible employees with live status badges:
  - `✓ Active Contract` with contract wage breakdown.
  - `⚠️ Contract Expired` or `No Contract` warnings.
  - `Bank Verified` indicator ensuring payout routing compliance.
  - "Select All" / "Deselect All" convenience toggles.

### 9. 🛡️ Algorithmic Operational Validation Audit
- **Automated Sanity Verification**: Inspects computed batches for missing IFSC or bank account numbers, negative net payouts, missing salary rules, and contract overlaps.
- **Smart Draft Auto-Compute**: Clicking "Validate" on a fresh `DRAFT` cycle automatically triggers rule computation first before rendering audit results.
- **Severity Alert Modal**: Color-coded severity chips (`ShieldAlert` for critical errors, `AlertTriangle` for warnings, `CheckCircle2` for verified checks) providing full visibility before managerial sign-off.

### 10. 📄 Pixel-Perfect PDF Payslips & Bulk Email Dispatch
- **Automated Emailing**: Marking a payrun as `PAID` or clicking `Send Payslips` automatically compiles each employee's official **Payslip PDF statement** and delivers it directly to their email via **Nodemailer (Gmail SMTP)**.
- **Enterprise PDF Formatting**: Formatted with company header, payslip reference number (`PS-YYYY-MM-XXXX`), employee dossier, itemized earnings and deductions tables, and net payout callout.
- **Unicode-Safe Currency Notation**: Uses standard `Rs.` notation in PDF output for flawless font rendering, and `₹` with `en-IN` number formatting across the web UI.

### 11. 🔔 Interactive Real-Time Notification Bell System
- **Live Popover Dropdown**: Embedded in the global topbar with dynamic unread badge counter (`1-9`, `9+`).
- **Context-Aware Category Icons**: Visually distinct icons for Attendance, Leave, Payroll, and System updates.
- **Mark as Read & Polling**: Real-time mark-as-read toggles, "Mark all read" header action, and automated 45-second background polling with click-outside dismissal.

### 12. 🤖 AI Copilot Drawer & C-Suite Briefing Memo
- **Payroll AI Copilot**: Slide-over AI assistant drawer providing instant answers to payroll regulations, salary tax calculations, and workforce anomalies.
- **Executive Briefing Memo**: Generates an automated leadership sign-off memo summarizing batch gross totals, statutory withholdings, net disbursements, and workforce coverage for executive presentation.

### 13. 👤 Employee Self-Service (ESS) Portal
- **Strict Data Isolation**: Dedicated employee view isolating personal salary slips, punch history, and leave balances without access to administrative controls.
- **Self-Service Punching**: Clock in and clock out directly from the portal with real-time shift status.
- **On-Demand PDF Downloads**: Instant single-click download of personal itemized PDF salary statements.

---

## 🔐 5-Tier Role-Based Access Control (RBAC)

The platform enforces strict role boundaries across 5 specialized system roles:

```
                  ┌──────────────────────────────┐
                  │       1. Admin (Full)        │
                  │   System, Users, RBAC, All   │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
  ┌─────────────────────────────┐ ┌─────────────────────────────┐
  │   4. HR Payroll Manager     │ │        2. HR Manager        │
  │ Full CRUD Payroll & HR      │ │ Full CRUD HR & Approvals    │
  │ Approve & Disburse Batches  │ │ Zero Payroll / Payruns      │
  └──────────────┬──────────────┘ └──────────────┬──────────────┘
                 │                               │
                 ▼                               │
  ┌─────────────────────────────┐                │
  │     3. HR Payroll User      │                │
  │ HR CRUD + Payrun CRU        │                │
  │ Read-only Salary Structures │                │
  └──────────────┬──────────────┘                │
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                  ┌──────────────────────────────┐
                  │         5. Employee          │
                  │  Personal Portal, Punches,   │
                  │  Own Leaves & Payslips Only  │
                  └──────────────────────────────┘
```

### RBAC Permission Matrix

| Capability / Module | Employee | HR Manager | HR Payroll User | HR Payroll Manager | Admin |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Self-Service Portal (Own Slips, Punches, Leaves)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Employee Directory (View, Create, Edit, Terminate)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Attendance Tracking (View All Logs, Manual Edits)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Contracts & Schedules (Full CRUD)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Leave Management (Approve / Refuse Requests)** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Payruns & Batches (Create, View, Calculate)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Salary Structures & Rules (View / Read-Only)** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Salary Structures & Rules (Create, Edit, Delete)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Payrun Managerial Actions (Approve, Disburse, Email)** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **User Management & Role Reassignment** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **System Administration & Audit Logs** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🔄 Payrun Processing Lifecycle

```mermaid
flowchart LR
    A[1. New Cycle Wizard] -->|Select Staff & Structure| B[DRAFT Batch]
    B -->|Calculate Engine| C[CALCULATED State]
    C -->|Run Operational Audit| D{Validation Warnings?}
    D -->|Errors Detected| C
    D -->|Audit Cleared| E[REVIEW State]
    E -->|Manager Sign-off| F[APPROVED State]
    F -->|Disburse & Finalize| G[PAID State]
    G -->|Automated SMTP| H[PDF Payslips Emailed]
```

1. **New Cycle Wizard**: Configure batch name, date ranges, salary structure, and select active staff.
2. **Batch Computation**: The Math.js rule engine aggregates attendance records, computes LOP deductions, evaluates earnings/deductions, and generates payslips.
3. **Operational Validation Audit**: Algorithmic scan checks for missing bank accounts, zero net pay, and contract date overlaps.
4. **Managerial Review & Approval**: HR Payroll Manager or Admin reviews itemized breakdowns and signs off on the payrun.
5. **Mark Paid & Disburse**: Batches transition to `PAID`, locking records against tampering.
6. **Automatic Email Delivery**: Official PDF statements are compiled in-memory and emailed directly to each employee's inbox.

---

## 🛠️ Architecture & Tech Stack

```
PeoplePay360/
├── client/                             # React 19 + Vite 6 Single Page Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── AI/                     # Payroll Copilot Slide-over Drawer
│   │   │   ├── Common/                 # DataTable, StatCard, Badge, Modal, Tabs
│   │   │   └── Layout/                 # Navbar (Notifications, Punch Button), Sidebar
│   │   ├── contexts/                   # AuthContext (JWT State, RBAC, 1-Click Demos)
│   │   ├── pages/
│   │   │   ├── Admin/                  # UserManagementPage (RBAC & Account Controls)
│   │   │   ├── Attendance/             # AttendancePage (Shift Logs, Punctuality Stats)
│   │   │   ├── Auth/                   # LoginPage (1-Click Demo Profiles, Inline Alerts)
│   │   │   ├── Contracts/              # ContractsPage (Contracts & Work Shifts)
│   │   │   ├── Dashboard/              # DashboardPage (Recharts Trends, Headcount Donut)
│   │   │   ├── Employees/              # EmployeeListPage (Kanban Board, CRUD Modals)
│   │   │   ├── Leave/                  # LeavePage (Time-Off Requests & Approvals)
│   │   │   ├── Payroll/                # PayrollPage (Wizard, Batch Engine, Audit Modal)
│   │   │   ├── Payslips/               # PayslipsPage (Itemized Statements, PDF Streamer)
│   │   │   ├── Portal/                 # EmployeePortalPage (Employee Self-Service)
│   │   │   └── Salary/                 # SalaryStructurePage (Math.js Formula Sandbox)
│   │   ├── services/                   # Axios Client with Auto-Refresh Interceptors
│   │   └── index.css                   # Handcrafted Innowise Pastel Design System
│   └── vite.config.js
│
├── server/                             # Node.js + Express 5 REST API Engine
│   ├── prisma/
│   │   ├── schema.prisma               # 20+ Normalized Relational Models
│   │   └── seed.js                     # Multi-Role Seeder (5 Roles, Staff, Contracts, Payruns)
│   ├── scripts/
│   │   ├── check-db.js                 # Database Connectivity & Health Diagnostic
│   │   ├── test-roles.js               # Automated 5-Role RBAC Verification Suite
│   │   └── generate-pdf.js             # Standalone PDF Payslip Generation Utility
│   ├── src/
│   │   ├── config/                     # Environment, Prisma Client, SMTP Setup
│   │   ├── controllers/                # REST Controllers (Auth, Employee, Payroll, Leave, etc.)
│   │   ├── middleware/                 # JWT Authentication, RBAC Guard, Audit Logger
│   │   ├── routes/                     # Domain Route Definitions
│   │   ├── services/
│   │   │   ├── payroll.service.js      # Payrun State Machine, Batch Engine, Validation Audit
│   │   │   ├── email.service.js        # Nodemailer Gmail SMTP Dispatcher
│   │   │   ├── pdf.service.js          # In-Memory PDFKit Payslip Generator
│   │   │   ├── salaryRuleEngine.service.js # Math.js Formula Parser & Evaluator
│   │   │   ├── attendance.service.js   # Punch Logs & Worked Hours Engine
│   │   │   └── employee.service.js     # Workforce Directory & Auto-Code Generator
│   │   └── validators/                 # Zod Validation Schemas
│   └── src/app.js                      # Express Application Entrypoint
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL Server** (v8.0 or higher) running locally or via Docker
- **npm** (v9.0 or higher)

### 2. Clone the Repository
```bash
git clone https://github.com/Anvesh-999/PayPilot360.git
cd PayPilot360
```

### 3. Server Configuration & Database Setup
Navigate to the `server/` directory and install dependencies:
```bash
cd server
npm install
```

Create and configure your `server/.env` file:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MySQL Connection String
DATABASE_URL="mysql://root:your_password@localhost:3306/peoplepay360"

# JWT Authentication Secrets
JWT_SECRET="peoplepay360-jwt-access-secret-key-2026"
JWT_REFRESH_SECRET="peoplepay360-jwt-refresh-secret-key-2026"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Nodemailer Email Configuration (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_16_digit_google_app_password"

# Optional: Groq API Key for AI Copilot Drawer
GROQ_API_KEY="your_groq_api_key"
```

Push schema to MySQL and seed database with 5-role accounts and test workforce:
```bash
# Push Prisma Schema to MySQL
npx prisma db push

# Seed 5 roles, employees, contracts, rules, attendance & payruns
npm run seed
```

Start backend API server:
```bash
npm run dev
# Server will run on http://localhost:5000
```

### 4. Client Setup & Launch
In a new terminal window, navigate to `client/`:
```bash
cd client
npm install
npm run dev
# Client will launch on http://localhost:5173
```

---

## 🔑 1-Click Demo Credentials

The login screen features **1-Click Quick Demo Profile Buttons** to instantaneously populate and test each of the 5 roles with default password **`Password@123`**:

| Role | Email Address | Password | Permissions & Purpose |
|:---|:---|:---:|:---|
| **Admin** | `admin@peoplepay360.com` | `Password@123` | Full access across all modules, User Management & role assignments |
| **HR Manager** | `hr.manager@peoplepay360.com` | `Password@123` | Full CRUD on Employees, Contracts, Attendance & Leaves (Zero Payroll) |
| **HR Payroll User** | `payroll.user@peoplepay360.com` | `Password@123` | All HR permissions + Payruns/Payslips CRU + Salary Structure Read-Only |
| **HR Payroll Manager** | `payroll.manager@peoplepay360.com` | `Password@123` | All HR permissions + Full CRUD on Payruns, Rules, Approvals & Disbursals |
| **Employee** | `aisha.verma@peoplepay360.com` | `Password@123` | Self-Service Portal, personal punch logs, own leave requests & payslips |

---

## 📡 Comprehensive REST API Directory

All backend endpoints are prefixed with `/api` and protected by JWT authentication (with the exception of `/auth/login` and `/health`).

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticate credentials and issue JWT cookies.
- `POST /api/auth/refresh` — Refresh expired access token using refresh token.
- `GET  /api/auth/me` — Retrieve active authenticated user profile and permissions.
- `POST /api/auth/logout` — Clear session cookies and invalidate token.

### 👥 Employees (`/api/employees`)
- `GET    /api/employees` — Search, filter, and paginate employee records (up to 500/page).
- `POST   /api/employees` — Onboard new staff with auto-generated code (`EMP-XXXX`).
- `GET    /api/employees/:id` — Retrieve comprehensive employee dossier.
- `PUT    /api/employees/:id` — Update employee demographic and job data.
- `DELETE /api/employees/:id` — Mark employee as terminated.

### 📜 Contracts & Working Schedules (`/api/contracts`)
- `GET    /api/contracts` — List employment contracts with status filters.
- `POST   /api/contracts` — Create contract with wage and salary structure binding.
- `PUT    /api/contracts/:id` — Update contract wage and date boundaries.
- `GET    /api/contracts/schedules` — List configured weekly working schedules.
- `POST   /api/contracts/schedules` — Create shift schedule with auto-calculated weekly hours.

### ⏱️ Attendance (`/api/attendance`)
- `POST /api/attendance/check-in` — Quick shift clock-in with live timestamp.
- `POST /api/attendance/check-out` — Shift clock-out with automatic hours worked calculation.
- `GET  /api/attendance/my-today` — Real-time punch status for the active session.
- `GET  /api/attendance` — Organization-wide attendance history and punctuality logs.

### 🌴 Leaves & Time-Off (`/api/leave` & `/api/leaves`)
- `GET   /api/leave/types` — List configured leave categories.
- `GET   /api/leave/balances/my` — Fetch current user's available leave balances.
- `GET   /api/leave/requests` — View all employee leave applications.
- `POST  /api/leave/requests` — Submit new leave application with date range and reason.
- `PATCH /api/leave/requests/:id/approve` — Approve leave request (HR Manager / Admin).
- `PATCH /api/leave/requests/:id/reject` — Reject leave request.

### 🧮 Salary Structures & Formula Engine (`/api/salary`)
- `GET  /api/salary/structures` — List configured salary structures and assigned rules.
- `POST /api/salary/structures` — Create new salary structure template.
- `GET  /api/salary/rules` — List dynamic mathematical calculation rules.
- `POST /api/salary/rules` — Define new rule expression (e.g. `BASIC * 0.40`).
- `POST /api/salary/evaluate` — Interactive Math.js sandbox evaluator.

### 💳 Payroll Batch Engine (`/api/payroll`)
- `GET  /api/payroll/payruns` — List monthly payrun cycles and batch lifecycle states.
- `POST /api/payroll/payruns` — Initialize new payrun batch via wizard.
- `POST /api/payroll/payruns/:id/select-employees` — Associate selected staff with batch.
- `POST /api/payroll/payruns/:id/calculate` — Execute Math.js engine across all enrolled employees.
- `POST /api/payroll/payruns/:id/validate` — Perform operational audit (bank details, contracts, LOP).
- `POST /api/payroll/payruns/:id/approve` — Approve batch for disbursement (HR Payroll Manager / Admin).
- `POST /api/payroll/payruns/:id/mark-paid` — Lock cycle as PAID and disburse funds.
- `POST /api/payroll/payruns/:id/send-payslips` — Trigger bulk PDF generation and email dispatch.
- `POST /api/payroll/payruns/:id/reset` — Re-open cycle back to `DRAFT` status for adjustments.

### 📄 Payslips (`/api/payslips`)
- `GET /api/payslips` — List payslips with generated reference codes (`PS-YYYY-MM-XXXX`).
- `GET /api/payslips/:id` — Detailed component breakdown (Gross, Basic, HRA, PF, TDS, Net).
- `GET /api/payslips/:id/pdf` — Stream downloadable formatted PDF salary statement.

### 🔔 Notifications (`/api/notifications`)
- `GET /api/notifications` — Fetch user notifications and unread counter.
- `PUT /api/notifications/:id/read` — Mark individual notification as read.
- `PUT /api/notifications/read-all` — Mark all user notifications as read.

### 👑 Administrative User Management (`/api/admin`)
- `GET  /api/admin/users` — List registered system users, roles, and status.
- `POST /api/admin/users` — Provision new user account with assigned role.
- `PUT  /api/admin/users/:id/role` — Reassign user role with immediate session sync.
- `PUT  /api/admin/users/:id/reset-password` — Administrative password reset.

---

## 🇮🇳 Currency & Localization

PeoplePay360 is optimized for corporate financial compliance and Indian corporate standards:
- **Web UI Notation**: Formatted with the official Unicode Indian Rupee symbol (`₹`) and the Indian numbering standard (`en-IN`, e.g., `₹4,25,000.00`).
- **PDF Compatibility**: Payslip PDF generators utilize WinAnsi-safe notation (`Rs.`) to guarantee zero text corruption across all operating systems, mobile PDF readers, and printers.
- **Statutory Rules Pre-Configured**: Pre-seeded with Indian statutory benchmarks including Provident Fund (PF at 12%), Employee State Insurance (ESI), House Rent Allowance (HRA at 40–50%), and Professional Tax (PT).

---

## 📄 License

This project is licensed under the **ISC License**. Open and free for educational, evaluation, and commercial deployment.
