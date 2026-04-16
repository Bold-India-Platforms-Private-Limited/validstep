# Credential SaaS Platform — Setup Guide

## Prerequisites
- Node.js 18+
- Docker & Docker Compose (for local PostgreSQL + Redis)
- npm

---

## 1. Start Database & Redis

```bash
cd /path/to/project
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432` (db: `credentialdb`, user: `postgres`, pass: `password123`)
- Redis on `localhost:6379`

---

## 2. Backend Setup

```bash
cd backend

# Copy env (already pre-filled with test PayU credentials)
cp .env.example .env

# Update DATABASE_URL and REDIS_URL in .env if different from defaults:
# DATABASE_URL=postgresql://postgres:password123@localhost:5432/credentialdb
# REDIS_URL=redis://localhost:6379

# Run DB migrations
npx prisma migrate dev --name init

# Seed default super admin + pricing config
npm run seed

# Start dev server
npm run dev
```

Backend runs on: `http://localhost:5000`

**Default Super Admin credentials** (from seed):
- Email: `admin@boldindiaplatforms.com`
- Password: `Admin@123`

---

## 3. Frontend Setup

```bash
cd frontend

# Copy env
cp .env.example .env

# Start dev server
npm run dev
```

Frontend runs on: `http://localhost:3000`

---

## 4. Platform Routes

| URL | Purpose |
|-----|---------|
| `/auth/company/register` | B2B Company registration |
| `/auth/company/login` | Company login |
| `/auth/user/login` | User login |
| `/auth/admin/login` | Super admin login |
| `/company/dashboard` | Company dashboard |
| `/company/programs` | Manage programs |
| `/company/batches` | Manage batches |
| `/company/batches/create` | Create new batch |
| `/company/batches/:id` | Batch detail (orders, templates, issue certs) |
| `/order/:slug` | Public order page for students |
| `/verify/:hash` | Public certificate verification |
| `/dashboard` | User certificate dashboard |
| `/admin/dashboard` | Super admin dashboard |
| `/admin/companies` | Manage companies |
| `/admin/pricing` | Set certificate prices |

---

## 5. End-to-End Flow

### Company Flow
1. Register at `/auth/company/register`
2. Create a Program (e.g., "SDE Internship")
3. Create a Batch (select program, set dates, role, ID prefix like "BLU", set price)
4. Copy the unique batch link from Batch Detail → Overview tab
5. Share link with interns/students
6. Once students pay, go to Orders tab → select PAID orders → click "Issue Certificates"
7. Students can then download their certificates

### Student Flow
1. Open batch link: `/order/{slug}`
2. Fill in Name, Email, Phone → Register & Pay
3. Auto-redirected to PayU payment page (test mode)
4. After payment → redirected to `/dashboard`
5. Dashboard shows: payment status, batch details, certificate status
6. Once company issues → Download button activates

---

## 6. PayU Test Mode

Currently configured with test credentials:
- MID: `12517188`
- PayU Test URL: `https://test.payu.in/_payment`

For test payments, use PayU test cards:
- Card: `5123456789012346`
- CVV: `123`, Expiry: any future date

---

## 7. API Endpoints Reference

### Auth
```
POST /api/auth/company/register
POST /api/auth/company/login
POST /api/auth/user/register       (body: { name, email, phone, password, batch_slug })
POST /api/auth/user/login
POST /api/auth/superadmin/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Company (Bearer token required)
```
GET  /api/company/profile
PUT  /api/company/profile
POST /api/company/programs
GET  /api/company/programs
POST /api/company/batches
GET  /api/company/batches
GET  /api/company/batches/:id
PUT  /api/company/batches/:id
POST /api/company/batches/:id/templates
GET  /api/company/batches/:id/templates
POST /api/company/batches/:id/issue-certificates   (body: { orderIds: [] })
GET  /api/company/batches/:id/orders
GET  /api/company/dashboard
```

### Payment
```
POST /api/payment/initiate         (body: { batch_id })
POST /api/payment/webhook          (PayU webhook)
POST /api/payment/success
POST /api/payment/failure
```

### User (Bearer token required)
```
GET  /api/user/dashboard
GET  /api/user/orders
GET  /api/user/certificates
GET  /api/user/certificates/:id/download
```

### Public (no auth)
```
GET  /api/public/batch/:slug
GET  /api/public/verify/:hash
```

### Admin (Bearer token required)
```
GET  /api/admin/companies
GET  /api/admin/companies/:id
PUT  /api/admin/companies/:id/status
GET  /api/admin/batches
GET  /api/admin/orders
GET  /api/admin/pricing
PUT  /api/admin/pricing
GET  /api/admin/dashboard
```

---

## 8. Certificate Templates

Three built-in templates per batch (company can customize):
- **CLASSIC** — Traditional layout with header bar, formal styling
- **MODERN** — Contemporary design with accent colors
- **MINIMAL** — Clean, minimalist design

Companies can customize: background color, accent color, font, show/hide logo & signature.

---

## 9. Scaling Notes

- Stateless JWT auth (horizontal scaling ready)
- Redis for rate limiting, caching, session blacklist
- BullMQ job queue for async certificate generation
- Prisma connection pooling
- Atomic serial number generation via DB transactions (no duplicates under load)
- All batch public info cached in Redis (5 min TTL)

---

## 10. Production Checklist

- [ ] Set strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Update `FRONTEND_URL`, `BACKEND_URL`, `ALLOWED_ORIGINS` to production domains
- [ ] Switch PayU to live credentials (`PAYU_KEY`, `PAYU_SALT`, `PAYU_MID`)
- [ ] Set `PAYU_BASE_URL=https://secure.payu.in`
- [ ] Configure managed PostgreSQL (e.g., Supabase, RDS)
- [ ] Configure managed Redis (e.g., Upstash, ElastiCache)
- [ ] Set up file storage for certificates (S3 + CloudFront) — update `certificate_url` logic
- [ ] Configure reverse proxy (nginx) with SSL
- [ ] Register PayU webhook URL: `https://yourdomain.com/api/payment/webhook`
