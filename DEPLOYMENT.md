# SH Shop - Docker Deployment Guide

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │            Docker Compose               │
                    │                                         │
 Client ──HTTPS──▶  │  ┌───────────┐    ┌──────────────────┐  │
 (Browser)   :443   │  │   Nginx   │───▶│  Frontend (Next)  │  │
                    │  │  (Proxy)  │    │     :3000         │  │
                    │  │  :80/:443 │    └──────────────────┘  │
                    │  │           │    ┌──────────────────┐  │
                    │  │           │───▶│  Backend (Express)│  │
                    │  └───────────┘    │     :5000         │  │
                    │                   │        │          │  │
                    │                   └────────┼──────────┘  │
                    │                   ┌────────▼──────────┐  │
                    │                   │  PostgreSQL 16    │  │
                    │                   │     :5432         │  │
                    │                   └──────────────────┘  │
                    └─────────────────────────────────────────┘
```

**Services:**
- **Nginx** — Reverse proxy, SSL termination, security headers
- **Frontend** — Next.js 15 (React) web application
- **Backend** — Express.js REST API with Prisma ORM
- **PostgreSQL** — Database (data persisted in Docker volume)

**Security:** Only Nginx ports (80, 443) are exposed. All other services are internal-only.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git installed
- Terminal (PowerShell on Windows, Terminal on Mac/Linux)

---

## Step 1: Clone the Project

```bash
git clone https://github.com/maosokhun/my_ecomerce.git
cd my_ecomerce
```

---

## Step 2: Generate SSL Certificate

Create a self-signed SSL certificate for HTTPS:

**Windows (PowerShell):**
```powershell
mkdir nginx -ErrorAction SilentlyContinue
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout nginx/localhost-key.pem `
  -out nginx/localhost.pem `
  -subj "/CN=localhost"
```

**Mac/Linux:**
```bash
mkdir -p nginx
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/localhost-key.pem \
  -out nginx/localhost.pem \
  -subj "/CN=localhost"
```

---

## Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# ============================
# Docker Deployment Secrets
# ============================

# JWT (generate a random 64-char string)
JWT_SECRET=your-random-64-character-secret-key-here

# Frontend URL
FRONTEND_URL=https://localhost

# Stripe (for card payments - get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Google Login (get from https://console.cloud.google.com)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=

# Facebook Login (get from https://developers.facebook.com)
NEXT_PUBLIC_FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# Cloudinary (for product image uploads - get from https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# KHQR Payment
KHQR_PROVIDER=mock

# Telegram Notifications (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

---

## Step 4: Build Docker Images

```bash
docker compose build --no-cache
```

This builds 2 images:
- `businesssytemonlineshopping-backend` (~656 MB) — Express.js API
- `businesssytemonlineshopping-frontend` (~2.2 GB) — Next.js app

It also pulls 2 official images:
- `postgres:16-alpine` (~395 MB) — Database
- `nginx:alpine` (~94 MB) — Reverse proxy

**Expected time:** 2-5 minutes depending on internet speed.

---

## Step 5: Start All Services

```bash
docker compose up -d
```

This starts 4 containers in order:
1. **PostgreSQL** starts first (with health check)
2. **Backend** starts after PostgreSQL is healthy (runs database migrations automatically)
3. **Frontend** starts after backend
4. **Nginx** starts last (depends on frontend + backend)

---

## Step 6: Seed the Database (First Time Only)

```bash
docker compose exec backend npx prisma db seed
```

This creates:
- Admin user account
- Sample product categories
- Sample products
- Cambodia location data

---

## Step 7: Open the Website

Open your browser and go to:

**https://localhost**

> **Note:** Your browser will show a "Not secure" warning because of the self-signed certificate.
> Click **Advanced → Proceed to localhost** to continue.
> This is normal for localhost. Use Let's Encrypt for a real domain.

---

## Useful Commands

### Check status of all containers
```bash
docker compose ps
```

### View logs
```bash
# All services
docker compose logs

# Specific service
docker compose logs backend
docker compose logs frontend
docker compose logs nginx
docker compose logs postgres

# Follow logs in real-time
docker compose logs -f backend
```

### Stop all services
```bash
docker compose down
```

### Stop and delete all data (database included)
```bash
docker compose down -v
```

### Rebuild after code changes
```bash
docker compose build --no-cache
docker compose up -d
```

### Rebuild only one service
```bash
docker compose build frontend --no-cache
docker compose up -d frontend
docker compose restart nginx
```

### Access database directly
```bash
docker compose exec postgres psql -U postgres -d shopdb
```

### Run database migrations manually
```bash
docker compose exec backend npx prisma migrate deploy
```

### Check health
```bash
# From inside Docker network
docker exec sh-shop-nginx wget -qO- http://backend:5000/health
```

---

## Project Files Structure

```
project-root/
├── .env                          # Environment variables (secrets)
├── docker-compose.yml            # Orchestrates all 4 services
├── nginx/
│   ├── default.conf              # Nginx reverse proxy config
│   ├── localhost.pem             # SSL certificate
│   └── localhost-key.pem         # SSL private key
├── shop-backend/
│   ├── Dockerfile                # Backend Docker image build
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   ├── seed.ts               # Database seeder
│   │   └── migrations/           # Database migrations
│   └── src/                      # Express.js source code
├── shop-frontend/
│   ├── Dockerfile                # Frontend Docker image build
│   └── src/                      # Next.js source code
└── .github/
    └── workflows/
        └── deploy.yml            # CI/CD pipeline (GitHub Actions)
```

---

## Docker Compose Services Explained

| Service | Image | Internal Port | Exposed Port | Purpose |
|---------|-------|---------------|--------------|---------|
| postgres | postgres:16-alpine | 5432 | None (internal) | Database |
| backend | Custom (Node.js) | 5000 | None (internal) | REST API |
| frontend | Custom (Node.js) | 3000 | None (internal) | Web UI |
| nginx | nginx:alpine | 80, 443 | 80, 443 | Reverse proxy + SSL |

---

## Security Features

- **HTTPS** with TLS 1.2/1.3 encryption
- **Security headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- **Non-root containers**: Both backend and frontend run as `node` user
- **Internal-only ports**: Only Nginx is exposed to the host
- **JWT access + refresh tokens**: 15-minute access, 7-day refresh
- **Token revocation**: Password change invalidates all sessions
- **Rate limiting**: Auth endpoints limited to 10 requests/15 minutes
- **Account lockout**: 5 failed logins = 15-minute lockout
- **Audit logging**: All auth events logged with IP address
- **Input validation**: Strong password policy, display name sanitization

---

## Troubleshooting

### Container won't start
```bash
docker compose logs <service-name>
```

### Port already in use
```bash
# Check what's using port 80 or 443
netstat -ano | findstr ":80 "
netstat -ano | findstr ":443 "

# Kill the process
taskkill /PID <PID> /F
```

### Database connection error
```bash
# Check if PostgreSQL is healthy
docker compose ps
# Should show "healthy" for postgres
```

### Reset everything from scratch
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
docker compose exec backend npx prisma db seed
```
