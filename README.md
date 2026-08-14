# TokTickIT — IT Service Desk

TokTickIT is a full-stack IT Service Desk and ticketing web application designed to manage IT service requests, categorize issues, and provide system health monitoring.

---

## Overview

TokTickIT provides an automated IT helpdesk foundation where users can check system availability and view supported IT service request categories (e.g., Account & Access, Hardware, Software, Network).

### Key Features
- **System Health Monitoring:** Real-time API health checks (`/api/health`) with responsive UI status indicators (Online/Offline/Loading).
- **IT Category Management:** Dynamic category retrieval (`/api/categories`) backed by PostgreSQL and Prisma ORM.
- **Idempotent Database Seeding:** Seed script supporting safe multiple executions without duplicating category entries.
- **Automated Testing Suite:** End-to-end unit and integration tests for both client and server layers.

### Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Bootstrap 5 |
| **Backend** | Node.js, Express.js, TypeScript, TSX |
| **Database & ORM** | PostgreSQL, Prisma ORM |
| **Testing** | Vitest, React Testing Library, Supertest, JSDOM |

---

## Prerequisites

Before running or developing TokTickIT, ensure you have the following software installed on your machine:

1. **Node.js & npm**
   - **Node.js:** `v18.0.0` or higher (LTS recommended, e.g., `v20.x` or `v22.x`)
   - **npm:** `v9.0.0` or higher
   - Verify installation:
     ```bash
     node -v
     npm -v
     ```

2. **PostgreSQL Database**
   - PostgreSQL `14.x` or higher running locally or accessible remotely.
   - A dedicated database instance (default name: `toktickit`).
   - Example connection string:
     ```text
     postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public
     ```

3. **Git**
   - Git CLI installed to clone and manage branches.
   - Verify installation:
     ```bash
     git --version
     ```

---

## Project Structure

```text
toktickit/
├── client/                 # Frontend application (React + Vite + TypeScript)
│   ├── src/                # UI components and API client
│   ├── tests/              # Frontend unit and component tests (Vitest)
│   ├── .env.example        # Client environment variables template
│   └── package.json
├── server/                 # Backend API (Express + TypeScript + Prisma)
│   ├── prisma/             # Prisma schema, migrations, and seed scripts
│   ├── src/                # Express application and route handlers
│   ├── tests/              # Backend integration tests (Supertest + Vitest)
│   ├── .env.example        # Server environment variables template
│   └── package.json
└── docs/                   # Lab documentation and reports
```

---

## Getting Started

### 1. Backend Setup

1. Navigate to the `server` directory and install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update `DATABASE_URL` and `PORT` in `server/.env` according to your PostgreSQL credentials.

3. Run database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

4. Seed the initial categories:
   ```bash
   npm run prisma:seed
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run at `http://localhost:3000`.

---

### 2. Frontend Setup

1. Open a new terminal, navigate to the `client` directory, and install dependencies:
   ```bash
   cd client
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Ensure `VITE_API_URL` points to the backend API (e.g., `http://localhost:3000`).

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The client application will run at `http://localhost:5173`.

---

## Running Tests

### Backend Tests (Supertest & Vitest)
```bash
cd server
npm test
```

### Frontend Tests (Vitest & React Testing Library)
```bash
cd client
npm test
```

---

## API Reference

| Method | Endpoint | Description | Response Status |
|---|---|---|---|
| `GET` | `/api/health` | Health check endpoint | `200 OK` (`{ status: "ok", service: "TokTickIT API" }`) |
| `GET` | `/api/categories` | List all supported IT request categories | `200 OK` (`[ { "id": 1, "name": "..." } ]`) |