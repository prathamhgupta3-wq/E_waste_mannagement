# EcoCircuit — Backend Architecture & System Design

**Platform:** EcoCircuit — Smart E-Waste Management Platform  
**Architecture Version:** 1.0.0  
**Target Runtime:** Node.js (v22 LTS) / TypeScript  
**Design Standard:** Micro-Modular Monolith / Cloud-Ready Distributed Architecture  

---

## 1. High-Level Architectural Vision

EcoCircuit operates as an environmental intelligence and circular economy platform that bridges citizens, certified e-waste collectors, and platform administrators. The backend system must satisfy four non-negotiable architectural requirements:

1. **Strict Chain-of-Custody Integrity:** Every device moving from a citizen's hands through transport and into certified smelters must be cryptographically verified, timestamped, and auditable.
2. **Real-Time Telemetry & Dispatch:** Low-latency tracking of pickup drivers, geofenced drop-off kiosks, and live environmental ledger updates.
3. **Role-Based Isolation (RBAC):** Rigid separation between public citizens, licensed field collectors, and high-privilege administrators.
4. **Deterministic ESG & Carbon Computation:** Auditable calculations of diverted mass, precious metals extracted (Au, Cu, Li, Co), and Scope 3 carbon offsets with automated PDF certification generation.

```mermaid
flowchart TD
    subgraph Client Layer
        WebCitizen[Citizen Web App / Mobile Web]
        WebCollector[Collector Field PWA / Terminal]
        WebAdmin[Admin Telemetry Command Center]
    end

    subgraph Edge & Gateway Layer
        CDN[Edge CDN / Reverse Proxy]
        WAF[Web Application Firewall & Rate Limiter]
        Gateway[Next.js App Router & API Gateway /api/v1]
    end

    subgraph Application & Business Logic Layer
        AuthSvc[Auth & RBAC Service\nNextAuth / JWT + Argon2]
        PickupSvc[Pickup & Dispatch Engine\nGeo-Routing & Time Slots]
        CustodySvc[Chain-of-Custody Engine\nOTP / QR Barcode Verification]
        ValuationSvc[Material Valuation & Yield Engine\nAu, Cu, Li, Co Pricing]
        TelemetrySvc[Real-Time Telemetry Hub\nWebSockets / SSE]
        CertSvc[ESG & PDF Generation Worker\nDoD 5220 & ISO 14001]
    end

    subgraph Data & Storage Layer
        PostgreSQL[(Primary Database\nPostgreSQL 16 + Prisma ORM)]
        Redis[(Cache & Message Queue\nRedis 7 / BullMQ)]
        ObjectStorage[(Object Storage\nS3 / Cloudflare R2)]
    end

    Client Layer --> CDN
    CDN --> WAF
    WAF --> Gateway

    Gateway --> AuthSvc
    Gateway --> PickupSvc
    Gateway --> CustodySvc
    Gateway --> ValuationSvc
    Gateway --> TelemetrySvc
    Gateway --> CertSvc

    AuthSvc --> PostgreSQL
    PickupSvc --> PostgreSQL
    CustodySvc --> PostgreSQL
    ValuationSvc --> PostgreSQL
    TelemetrySvc --> Redis
    CertSvc --> ObjectStorage
    PickupSvc --> Redis
    Redis --> CertSvc
```

---

## 2. Recommended Technology Stack Selection

| Component | Selected Technology | Technical Justification |
| :--- | :--- | :--- |
| **Full-Stack Framework** | **Next.js 15 (App Router) + TypeScript** | Unifies frontend rendering with high-performance API Route Handlers and Server Actions. Provides end-to-end type safety, native streaming, zero-config SSR, and seamless deployment. |
| **Primary Database** | **PostgreSQL 16** | Robust relational model, ACID compliance for financial/reward transactions, native UUID support, JSONB capabilities for hardware telemetry, and spatial query support (`earthdistance` / PostGIS) for kiosk proximity. |
| **Object-Relational Mapping (ORM)** | **Prisma ORM** | Type-safe query generation directly derived from schema, automated migration management, expressive relation modeling, and rich seeding capabilities. |
| **Authentication & RBAC** | **Auth.js (NextAuth v5) / Custom JWT** | Industry-standard session management, supports credentials with Argon2id hashing, Google OAuth integration, secure HTTP-only cookies, and declarative role-based route middleware. |
| **Cache & Task Queue** | **Redis 7 + BullMQ** | High-throughput in-memory caching for live telemetry statistics, rate limiting, and reliable asynchronous queue processing for heavy background tasks (PDF generation, email receipts). |
| **Object Storage** | **Cloudflare R2 / AWS S3** | Zero-egress-fee or standard S3 object storage for citizen waste photos, enterprise serial manifest CSVs, and generated tamper-proof PDF audit certificates. |
| **Real-time Protocol** | **Server-Sent Events (SSE) / WebSocket** | Push-based driver location updates, live milestone tracking, and real-time dashboard updates without client polling overhead. |
| **Schema Validation** | **Zod** | Runtime type validation shared across frontend forms and backend API route handlers for foolproof data sanitization. |
| **PDF Generation** | **PDFKit / @react-pdf/renderer** | Server-side cryptographic generation of printable DoD 5220 data wipe certifications and ISO 14001 Scope 3 ESG audit certificates. |

---

## 3. Subsystem Architecture & Core Modules

### 3.1 Authentication & Authorization Subsystem (RBAC)
EcoCircuit recognizes three distinct user roles with strict boundary enforcement:

1. **`CITIZEN`**:
   - Access to personal dashboard (`/portal`).
   - Create, reschedule, and cancel own pickup requests.
   - Access personal reward wallet and carbon ledger.
   - View public kiosk map and category yield catalog.
2. **`COLLECTOR`**:
   - Access to field operations terminal (`/collector`).
   - View assigned pickup tasks, pickup addresses, and navigation routes.
   - Execute doorstep handoff via OTP / QR scanner.
   - Record collected weights and submit hardware weigh-in telemetry.
   - Cannot access admin controls or other collectors' private manifests.
3. **`ADMIN`**:
   - Access to master command center (`/admin`).
   - Approve, suspend, or audit collectors and recycling centers.
   - Manual override and dispute resolution for pickup requests.
   - Global impact ledger adjustments, pricing updates, and system-wide CSV/PDF exports.

#### Session Security Pipeline
```mermaid
sequenceDiagram
    autonumber
    actor User as User (Citizen/Collector/Admin)
    participant Client as Next.js Client
    participant Middleware as Route Guard Middleware
    participant API as Auth Controller
    participant DB as PostgreSQL

    User->>Client: Enters Credentials (Email/Password or OAuth)
    Client->>API: POST /api/v1/auth/login
    API->>DB: Fetch user by email + hashed password
    DB-->>API: Return user record & role
    API->>API: Verify password via Argon2id
    API->>Client: Set HttpOnly, Secure, SameSite=Strict JWT Cookie
    Client->>Middleware: Requests Protected Route (e.g. /collector/queue)
    Middleware->>Middleware: Decodes JWT & checks role matches required permission
    alt Authorized
        Middleware-->>Client: Allow render / API execution
    else Unauthorized
        Middleware-->>Client: 403 Forbidden / Redirect to Login
    end
```

---

### 3.2 Pickup Scheduling & Logistics Engine

The pickup engine orchestrates the lifecycle of physical electronic waste.

#### Pickup Request State Machine
```mermaid
stateDiagram-v2
    [*] --> DRAFT: Citizen selects items & addresses
    DRAFT --> SUBMITTED: Citizen confirms pickup & generates OTP
    SUBMITTED --> ASSIGNED: Platform dispatches to nearest active Collector
    ASSIGNED --> EN_ROUTE: Collector accepts job & begins navigation
    EN_ROUTE --> ARRIVED: Collector arrives at doorstep
    ARRIVED --> VERIFIED: Collector enters Citizen OTP & scans hardware
    VERIFIED --> WEIGHED: Hardware weighed & physical seal tag applied
    WEIGHED --> IN_TRANSIT_SMELTER: Dispatched to certified R2v3 Smelter Hub
    IN_TRANSIT_SMELTER --> RECYCLED_COMPLETED: Smelter signs off; Eco-Rewards & Certificate Issued
    SUBMITTED --> CANCELLED: Cancelled by Citizen or Admin
    ASSIGNED --> CANCELLED: Cancelled prior to pickup
```

#### Key Logic Highlights:
- **Doorstep Dual-Verification:** To prevent fraudulent pickup claims, when a pickup status moves to `SUBMITTED`, the backend creates a cryptographically random 6-digit OTP and dynamic QR payload tied to the `pickup_id`. The collector must enter this code or scan the QR code within 50 meters of the geocoded address.
- **Weigh-in Rebalancing:** The citizen provides an estimated weight. Upon physical collection, the collector records actual calibrated weight. The system recalculates exact eco-rewards and precious metal recovery metrics based on actual weights.

---

### 3.3 Dynamic Material Valuation & ESG Engine

EcoCircuit calculates environmental metrics dynamically:
- **Material Recovery Breakdown:**
  $$\text{Yield}_{\text{material}} = \sum (\text{Item Weight} \times \text{Category Recovery Factor} \times \text{Material Concentration})$$
  Example for Smartphones: 99.2% recovery yield, yielding calibrated milligrams of Gold (Au), grams of Copper (Cu), and grams of Lithium (Li).
- **Carbon Offset (MT $\text{CO}_2$e):**
  $$\text{Offset} = \text{Diverted Weight (kg)} \times \text{Emissions Factor} (\approx 2.45 \text{ kg } \text{CO}_2\text{e saved per kg recycled})$$
- **Reward Credit Formulation:**
  $$\text{Reward} = \text{Base Category Rate} + (\text{Actual Weight} \times \text{Unit Rate}) \times \text{Condition Multiplier}$$

---

### 3.4 Asynchronous Worker & Queue Pipeline (BullMQ + Redis)

Certain operations are computational or I/O heavy and must not block standard HTTP request cycles:

```mermaid
flowchart LR
    API[Next.js API Handler] -->|Push Job| Queue[Redis BullMQ]
    
    subgraph Background Workers
        W1[Certificate PDF Worker\nGenerates DoD 5220 & ESG Vouchers]
        W2[Notification Worker\nSends Email & SMS Telemetry]
        W3[Impact Aggregator\nRecalculates Global Landing Page Tickers]
    end

    Queue --> W1
    Queue --> W2
    Queue --> W3

    W1 --> S3[Cloudflare R2 Storage]
    W2 --> SMTP[Email / Twilio SMS]
    W3 --> RedisCache[Redis Cached Stats]
```

---

## 4. Security Architecture & Threat Mitigation

| Threat Vector | Mitigation Strategy | Implementation |
| :--- | :--- | :--- |
| **Broken Object Level Auth (IDOR)** | Ownership verification on all database queries. | `prisma.pickupRequest.findFirst({ where: { id, userId: session.user.id } })` |
| **Pickup Spoofing / Ghost Collections** | Cryptographic handoff validation. | One-time 6-digit OTP + QR token issued to citizen, validated on collector scan with GPS geofencing. |
| **DDoS & Scraping Attacks** | Edge rate limiting & IP throttling. | `upstash/ratelimit` or Redis sliding-window: 60 requests/minute for public APIs, 10/min for auth. |
| **Malicious File Uploads** | Strict file type validation and sandboxed storage. | Server-side MIME inspection (Magic bytes), 10MB cap, stored in private S3 bucket with signed URLs. |
| **Data Destruction Non-Compliance** | Tamper-proof audit logs. | Append-only `ChainOfCustodyLog` table with SHA-256 hash chaining of preceding event logs. |
| **SQL Injection & XSS** | Type-safe ORM & React output escaping. | Prisma parameterized queries; Zod sanitization for HTML/script characters on all inputs. |

---

## 5. Deployment, Containerization & Infrastructure

### 5.1 Dockerized Service Topology
EcoCircuit is packaged as a lightweight multi-container setup via Docker Compose:
- **`app`**: Next.js 15 runtime (Node 22 Alpine, multi-stage build, non-root user).
- **`postgres`**: PostgreSQL 16 Alpine with persistent volume.
- **`redis`**: Redis 7 Alpine for queue management and distributed caching.

### 5.2 Environment Configuration Architecture
```
# Runtime Configuration (.env)
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://ecocircuit:secret_pass@localhost:5432/ecocircuit_db?schema=public&connection_limit=20"

# Redis & Cache
REDIS_URL="redis://localhost:6379"

# Authentication
NEXTAUTH_URL="https://ecocircuit.com"
NEXTAUTH_SECRET="super-secret-crypto-key"
JWT_EXPIRATION="7d"

# Storage
STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
STORAGE_BUCKET="ecocircuit-assets"
STORAGE_ACCESS_KEY="r2_access_key"
STORAGE_SECRET_KEY="r2_secret_key"

# Geocoding & Telemetry
MAPBOX_ACCESS_TOKEN="pk.mock_token"
```

### 5.3 Scalability & Health Checks
- **Health Endpoint (`/api/v1/health`):** Verifies PostgreSQL connection, Redis ping, and queue readiness.
- **Connection Pooling:** Prisma connection pooling tuned to database connection limits.
- **Graceful Shutdown:** SIGTERM handling closing Redis connections and active Prisma transactions cleanly.
