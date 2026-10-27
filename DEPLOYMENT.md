# EcoCircuit — Production Deployment & Database Migration Guide

**Platform:** EcoCircuit — Smart E-Waste Management Platform  
**Target Environment:** Node.js (v18+), PostgreSQL (v14+), Supabase Auth, Prisma ORM  
**Date:** October 2026  

---

## 1. Architecture Overview

EcoCircuit uses a decoupled yet unified deployment model:
- **Backend API Server:** Node.js / Express.js serving REST APIs (`/api/*`), performing cryptographic JWT verification, role-based access control (RBAC), and orchestrating the pickup state machine.
- **Database Layer:** PostgreSQL managed via Prisma ORM schema (`schema.prisma`), enforcing relational constraints, foreign keys, cascade rules, and audit logging.
- **Authentication:** Supabase Auth compatible token validation + bcrypt password hashing. Admin self-registration is strictly forbidden; admin accounts are securely provisioned via administrative APIs.
- **Frontend Client:** High-performance HTML5/Tailwind/ES6 single-page web app served directly via Express or CDN (Vercel, Cloudflare, Netlify).

---

## 2. Environment Variables Configuration

Create a production `.env` file in the `backend/` directory from `.env.example`:

```bash
cd backend
cp .env.example .env
```

### Production Configuration Parameters

| Variable | Description | Production Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for Node.js server | `5000` |
| `NODE_ENV` | Runtime environment | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://ecouser:StrongPassword@db.example.com:5432/ecocircuit_db?schema=public&sslmode=require` |
| `SUPABASE_URL` | Supabase project URL | `https://xyzcompany.supabase.co` |
| `SUPABASE_JWT_SECRET` | Secret used to sign/verify Supabase Auth JWTs | `a-very-long-production-jwt-secret-string-min-32-chars` |
| `JWT_SECRET` | Fallback cryptographic signing secret | `ecocircuit_prod_hmac_sha256_super_secret_2026` |
| `JWT_EXPIRES_IN` | Session duration | `7d` |
| `CORS_ORIGIN` | Allowed web origins (comma-separated) | `https://ecocircuit.org,https://www.ecocircuit.org` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiter window in ms | `900000` (15 mins) |
| `RATE_LIMIT_MAX` | Max requests per IP window | `150` |

---

## 3. Database Migration Steps (PostgreSQL & Prisma)

### Step 1: Provision PostgreSQL Database
Create the production database and user:
```sql
CREATE DATABASE ecocircuit_db;
CREATE USER ecouser WITH ENCRYPTED PASSWORD 'StrongPassword';
GRANT ALL PRIVILEGES ON DATABASE ecocircuit_db TO ecouser;
```

### Step 2: Generate Prisma Client
```bash
cd backend
npx prisma generate
```

### Step 3: Apply Migrations
Run the database migrations to create all relational tables:
```bash
npx prisma migrate deploy
```
*(For development or initial schema creation: `npx prisma migrate dev --name init`)*

### Step 4: Seed Initial Data
Populate standard waste categories, verified collection centres, and bootstrap demo personas:
```bash
npm run prisma:seed
```

---

## 4. Backend Deployment Guide

### Option A: PM2 Process Manager (Recommended for Linux/VPS)

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Start the application:**
   ```bash
   cd backend
   pm2 start src/server.js --name "ecocircuit-api" -i max --env production
   ```

3. **Configure automatic startup on system reboot:**
   ```bash
   pm2 startup
   pm2 save
   ```

4. **Monitor logs:**
   ```bash
   pm2 logs ecocircuit-api
   ```

---

### Option B: Docker Container Deployment

Create a `Dockerfile` in `backend/`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY . .

EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "src/server.js"]
```

Build and run:
```bash
docker build -t ecocircuit-backend:1.0.0 .
docker run -d -p 5000:5000 --env-file .env --name ecocircuit-prod ecocircuit-backend:1.0.0
```

---

### Option C: Reverse Proxy with Nginx & SSL (Certbot)

Configure Nginx as a reverse proxy in `/etc/nginx/sites-available/ecocircuit`:

```nginx
server {
    server_name ecocircuit.org www.ecocircuit.org;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable SSL:
```bash
sudo certbot --nginx -d ecocircuit.org -d www.ecocircuit.org
```

---

## 5. Frontend Deployment

### Serving through Express (Unified Mode)
The Node.js Express server automatically serves `code.html` and static files at the root URL `/` and `/code.html`. No additional frontend configuration is needed.

### Decoupled CDN Deployment (Vercel / Cloudflare / Netlify)
If hosting the static frontend separately:
1. Place `index.html`, `code.html`, and any static assets in the publish directory.
2. In the frontend script, ensure API calls point to the production backend origin (`https://api.ecocircuit.org` or your deployed URL).
3. Set `CORS_ORIGIN="https://ecocircuit.org"` in the backend `.env`.

---

## 6. Health & Smoke Test Verification

Run these smoke tests immediately following deployment:

1. **System Health Check:**
   ```bash
   curl -I https://ecocircuit.org/api/health
   # Expected: HTTP/1.1 200 OK
   # Response: {"status":"HEALTHY","service":"EcoCircuit Backend API","version":"1.0.0",...}
   ```

2. **Public Categories Retrieval:**
   ```bash
   curl https://ecocircuit.org/api/categories
   # Expected: HTTP/1.1 200 OK with 7 categories
   ```

3. **Collection Centres Locator:**
   ```bash
   curl https://ecocircuit.org/api/collection-centres
   # Expected: HTTP/1.1 200 OK with verified centres
   ```

4. **Automated Integration Test Verification:**
   ```bash
   cd backend && npm test
   # Expected: 38/38 tests passing
   ```
