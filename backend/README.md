# EcoCircuit — Backend API & System Documentation

**Platform:** EcoCircuit — Smart E-Waste Management Platform  
**Architecture:** Node.js, Express.js, PostgreSQL, Prisma ORM, Supabase Auth & JWT  
**Version:** 1.0.0  

---

## 1. Overview

EcoCircuit backend provides a secure, role-based RESTful API designed to orchestrate e-waste pickup logistics across three core personas:
1. **Citizens:** Schedule doorstep collections, track live chain-of-custody, and view recycling certificates.
2. **Collectors:** View nearby assigned runs, navigate to doorsteps, authenticate handoffs via OTP, and record digital scale weights.
3. **Administrators:** Review unassigned requests, assign fleet collectors, verify recycler partner licenses, and audit environmental impact metrics.

---

## 2. Directory Structure

```
backend/
├── .env.example              # Sample environment configuration
├── .env                      # Local development environment configuration
├── package.json              # Dependencies and lifecycle scripts
├── README.md                 # Complete system documentation
├── prisma/
│   ├── schema.prisma         # Production PostgreSQL schema definition
│   └── seed.js               # Database seeding script with realistic demo data
├── src/
│   ├── app.js                # Express app setup, security headers, CORS, static serving
│   ├── server.js             # HTTP server entry point with graceful shutdown
│   ├── config/
│   │   └── env.js            # Environment loader and configuration sanitization
│   ├── middleware/
│   │   ├── auth.js           # Supabase JWT & development token verification
│   │   ├── roleGuard.js      # Strict Role-Based Access Control (RBAC) guard
│   │   ├── validate.js       # Zod schema request validation middleware
│   │   ├── errorHandler.js   # Centralized error handler returning clean JSON
│   │   └── rateLimiter.js    # Rate limiting middleware (150 req / 15 min window)
│   ├── validators/
│   │   ├── authValidator.js      # Profile update and demo login validation
│   │   ├── pickupValidator.js    # 4-step pickup and state machine transition rules
│   │   ├── collectorValidator.js # Status update and weigh-in validation
│   │   └── adminValidator.js     # Collector verification and centre creation schemas
│   ├── controllers/
│   │   ├── authController.js     # Profile, role, and demo auth handlers
│   │   ├── pickupController.js   # Pickup CRUD, cancel, and audit history
│   │   ├── collectorController.js# Assigned queues, acceptance, status updates
│   │   ├── adminController.js    # Dispatching, partner verification, statistics
│   │   └── publicController.js   # Public categories and collection centre queries
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth/*
│   │   ├── pickupRoutes.js       # /api/pickups/*
│   │   ├── collectorRoutes.js    # /api/collector/*
│   │   ├── adminRoutes.js        # /api/admin/*
│   │   └── publicRoutes.js       # /api/*
│   └── services/
│       └── dbStore.js            # Resilient data layer supporting Prisma and in-memory test store
└── tests/
    └── api.test.js               # Comprehensive 21-test automated test suite
```

---

## 3. Quickstart & Setup Commands

### Prerequisites
- Node.js (v18.0.0 or higher; developed on Node v22 LTS)
- npm (v9.0.0+)
- PostgreSQL 14+ (optional for local mock testing; required for production PostgreSQL migrations)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Run Automated Tests
Execute the 21 automated tests covering public endpoints, authentication, RBAC authorization, pickup creation, status transitions, and history:
```bash
npm test
```

### 4. Start the Application Server
```bash
npm start
```
The server will boot on `http://localhost:5000` and automatically serve both:
- **The REST API:** `http://localhost:5000/api/*`
- **The Frontend:** `http://localhost:5000/code.html` or `http://localhost:5000/`

---

## 4. Environment Variables

Create `.env` by copying `.env.example`:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `5000` |
| `NODE_ENV` | Application environment | `development` / `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/ecocircuit_db?schema=public` |
| `SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_JWT_SECRET` | Secret used to sign & verify Supabase auth JWTs | `your-supabase-jwt-secret` |
| `JWT_SECRET` | Local fallback JWT secret for development tokens | `ecocircuit_secure_super_secret_jwt_key_2026_dev` |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `http://localhost:3000,http://localhost:5000` |
| `RATE_LIMIT_WINDOW_MS`| Rate limit time window in milliseconds | `900000` (15 mins) |
| `RATE_LIMIT_MAX` | Max allowed requests per IP per window | `150` |

---

## 5. REST API Reference

### 5.1 Public Endpoints (No Auth Required)
- `GET /api/health` — System health check.
- `GET /api/categories` — List all 7 registered waste categories (Mobile Phones, Laptops, Batteries, Chargers, TVs, Appliances, Other).
- `GET /api/collection-centres` — List verified drop-off kiosks and smelter terminals.
- `POST /api/auth/demo-login` — Generate a JWT for testing (`{ "role": "CITIZEN" | "COLLECTOR" | "ADMIN" }`).

### 5.2 Authentication & User Profiles
All protected endpoints require `Authorization: Bearer <token>`.
- `GET /api/auth/profile` — Retrieve authenticated user profile (and collector profile if applicable).
- `PUT /api/auth/profile` — Update user name or contact phone (`{ "name": "...", "phone": "..." }`).
- `GET /api/auth/role` — Retrieve user verified role from database.

### 5.3 Pickup Management (Citizens & Shared)
- `POST /api/pickups` — Create a new pickup request:
  ```json
  {
    "pickupAddress": "Flat 402, Green Meadows Apt, 12th Main Rd",
    "locality": "Indiranagar",
    "pincode": "560038",
    "preferredDate": "2026-10-28",
    "preferredTimeSlot": "Morning (08:00 AM - 12:00 PM)",
    "items": [
      {
        "wasteCategoryId": "cat-mobile",
        "quantity": 2,
        "estimatedWeight": 0.5,
        "description": "Smartphones"
      }
    ]
  }
  ```
- `GET /api/pickups` — List user's pickup requests (Citizens see own; Admins see all).
- `GET /api/pickups/:id` — Retrieve full pickup details with items and status history.
- `POST /api/pickups/:id/cancel` — Cancel an eligible pickup request (allowed only in `PENDING` or `ASSIGNED` states).
- `GET /api/pickups/:id/history` — View chronological status transition audit trail.

### 5.4 Collector Operations (`COLLECTOR` Role Required)
- `GET /api/collector/assigned` — View queue of active pickups assigned to the authenticated collector.
- `POST /api/collector/pickups/:id/accept` — Accept assigned pickup (`ASSIGNED` $\rightarrow$ `ACCEPTED`).
- `PATCH /api/collector/pickups/:id/status` — Update pickup status along workflow:
  - `COLLECTED` (Doorstep OTP verified, tamper seal attached)
  - `DELIVERED_TO_RECYCLER` (Delivered to smelter facility)
  - `COMPLETED` (Weighed, catalogued, recycled)
  - `FAILED` (Failed collection at doorstep)
- `GET /api/collector/history` — View completed pickup history and aggregated mass statistics.

### 5.5 Administrator Command Center (`ADMIN` Role Required)
- `GET /api/admin/pickups` — List all requests across platform (supports `?status=` and `?pincode=` filters).
- `POST /api/admin/pickups/:id/assign` — Assign a collector to a pending pickup (`{ "collectorId": "user-collector-01" }`).
- `PATCH /api/admin/collectors/:id/verify` — Update collector verification status (`{ "verificationStatus": "VERIFIED" | "REJECTED" }`).
- `GET /api/admin/collection-centres` — List all drop-off facilities.
- `POST /api/admin/collection-centres` — Register new collection centre.
- `GET /api/admin/statistics` — Retrieve platform KPI metrics (total diverted kg, active collectors, request status counts).

---

## 6. Pickup State Machine & Status Transitions

```
[PENDING]
    │ (Admin assigns collector)
    ▼
[ASSIGNED]
    │ (Collector accepts job)
    ▼
[ACCEPTED]
    │ (Doorstep OTP verified & weighed)
    ▼
[COLLECTED]
    │ (Transported to smelter hub)
    ▼
[DELIVERED_TO_RECYCLER]
    │ (Smelter processes batch & issues certificate)
    ▼
[COMPLETED]
```

*Note: Requests in `PENDING`, `ASSIGNED`, or `ACCEPTED` states can be transitioned to `CANCELLED`. In-field disruptions can transition to `FAILED`.*

---

## 7. Security Architecture

1. **Role Verification:** Roles are never trusted from the client payload. The user's role is extracted exclusively from the cryptographically verified JWT claims and verified against the database record.
2. **Strict RBAC Guards:** Routes are guarded by `requireRole('COLLECTOR')` or `requireRole('ADMIN')`. Any role mismatch immediately returns `403 Forbidden`.
3. **Input Sanitization:** All request payloads are strictly validated using Zod schemas (`validate(schema)`), preventing malformed data, invalid pincodes, or type confusion attacks.
4. **Rate Limiting:** Protects against brute-force or spam submissions via `express-rate-limit`.
5. **Ownership Access Control (IDOR Prevention):** Citizens can only view and cancel their own pickup manifests.
