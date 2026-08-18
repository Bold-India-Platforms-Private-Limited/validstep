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

---

## 11. Workspace Module (Interns/Projects) — `validstep.com/workspace/`

A separate, self-contained app living at `workspace/frontend` and `workspace/backend` —
its own `package.json`/dependencies/Prisma schema (targets a different database, `pm-db`),
nothing shared with the main app above. Mounted under `/workspace/` so it can be split
back out into its own repo later by moving one directory.

### Local dev
```bash
# Backend (own port, own .env — copy the one that was already on this machine, or
# provision fresh: DATABASE_URL/DIRECT_URL for pm-db, JWT_SECRET, ADMIN_EMAIL/PASSWORD,
# SMTP_*, CLOUDFLARE_R2_* — see workspace/backend/src/config for the full list read)
cd workspace/backend && npm install && npm run dev   # :5050

# Frontend
cd workspace/frontend && npm install && npm run dev  # :5175 in .claude/launch.json, or default 5173
```
Local dev serves at plain `/` (no `/workspace` prefix) — the prefix only applies to
production builds, see `vite.config.js`.

### One-time production setup

Everything below is driven by the existing `deploy.yml` / EC2 SSH pipeline and existing
Cloudflare Pages project — no new server access, no new pipeline, no new domain. Two
things still need a human, because neither can be done from inside this repo:

**1. Add one GitHub repo secret** (Settings → Secrets and variables → Actions → New repository secret)
   - Name: `WORKSPACE_ENV`
   - Value: the full contents of a workspace-backend `.env` file — `DATABASE_URL`/`DIRECT_URL`
     for the `pm-db` database, `JWT_SECRET`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `SMTP_*`,
     `CLOUDFLARE_R2_*`, `FRONTEND_URL=https://validstep.com/workspace` (see
     `workspace/backend/src/config` for the full list the code reads)

   Once that secret exists, the *next* push to `main` automatically writes it to
   `workspace/backend/.env` on the EC2 host, runs `prisma migrate deploy`, and starts/reloads
   a `workspace-backend` PM2 process alongside the existing `validstep` one. It also
   attempts to copy the updated `backend/api.validstep.com.conf` into
   `/etc/nginx/conf.d/` and reload nginx for the new `/workspace/` routes — best-effort
   (only applies if `ec2-user` has passwordless sudo and the path matches; logs a clear
   message either way, never touches the validstep deploy that already succeeded in the
   same run).

**2. Point Cloudflare Pages' build command at the new script**
   In the Pages project settings, change the build command to `bash scripts/build-with-workspace.sh`
   (output directory stays `frontend/dist`, root directory stays repo root). It builds both
   frontends and nests the workspace one under `frontend/dist/workspace/` — no new Pages
   project, no DNS change.

Until both of those happen, the workspace module's code ships with every deploy but stays
inert in production (no crash, no effect on validstep) — the backend step no-ops without
the secret, and the frontend keeps serving only the main app until Pages builds it in.

### Routes
Everything under `/workspace/*` — `/workspace/login`, `/workspace/admin`, `/workspace/app`, etc.
Admin/super-admin credentials are separate from validstep's own (`ADMIN_EMAIL`/`ADMIN_PASSWORD`
in the workspace backend's `.env`, bootstraps the super-admin account on first login).
