# FormBit — Student Feedback Collection System

A full-stack web application for collecting and analysing student feedback in academic institutions. Supports CO (Course Outcome) attainment tracking for NBA/NAAC compliance.

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | React 18 + Vite, Tailwind CSS, Zustand, Recharts |
| Backend  | Node.js 18+, Express 5, Zod validation          |
| Database | PostgreSQL (hosted on [Neon](https://neon.tech)) |
| Hosting  | Vercel (frontend + backend as serverless)        |
| Email    | Nodemailer + Gmail SMTP                          |

---

## Local Development

### Prerequisites

- Node.js 18+
- A PostgreSQL database (local or Neon)

### Backend

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, SMTP credentials, etc.

# 3. Initialise the database schema and create the admin account
npm run init-db

# 4. (Optional) Seed academic master data
npm run seed

# 5. Start the dev server
npm run dev
# API available at http://localhost:3000
```

### Frontend

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
# App available at http://localhost:5173
```

The Vite dev server proxies `/api` requests to `http://localhost:3000` automatically.

---

## Vercel Deployment

### Step 1 — Create the Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a new project.
2. Copy the connection string (format: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).
3. Run the schema locally against your Neon database:

```bash
cd backend
DATABASE_URL="<your-neon-url>" npm run init-db
```

### Step 2 — Deploy the backend to Vercel

1. Push the `formbit/` folder to a new GitHub repository (or use the Vercel CLI).
2. In the Vercel dashboard, create a new project and set the **Root Directory** to `backend/`.
3. Set the following environment variables in Vercel:

| Variable        | Value                                      |
|-----------------|--------------------------------------------|
| `DATABASE_URL`  | Your Neon connection string                |
| `JWT_SECRET`    | A long random string (min 32 chars)        |
| `JWT_EXPIRES_IN`| `7d`                                       |
| `ADMIN_EMAIL`   | Admin account email                        |
| `ADMIN_PASSWORD`| Admin account password                     |
| `APP_BASE_URL`  | Your frontend Vercel URL (set after step 4)|
| `CORS_ORIGIN`   | Your frontend Vercel URL                   |
| `SMTP_HOST`     | `smtp.gmail.com`                           |
| `SMTP_PORT`     | `587`                                      |
| `SMTP_USER`     | Your Gmail address                         |
| `SMTP_PASS`     | Your Gmail App Password                    |
| `SMTP_FROM`     | `"FormBit <your@gmail.com>"`               |

4. Deploy. The backend will be available at `https://your-backend.vercel.app`.

### Step 3 — Seed the admin account

The admin account is created automatically by `init-db` using `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If you need to re-seed academic data, run:

```bash
# Locally, pointing at the production database
DATABASE_URL="<your-neon-url>" npm run seed
```

Or use the Vercel CLI:

```bash
vercel env pull .env.production
DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d= -f2) npm run seed
```

### Step 4 — Deploy the frontend to Vercel

1. Create another Vercel project, setting the **Root Directory** to `frontend/`.
2. Set the following environment variable:

| Variable           | Value                                    |
|--------------------|------------------------------------------|
| `VITE_API_BASE_URL`| `https://your-backend.vercel.app/api/v1` |

3. Deploy. The frontend will be available at `https://your-frontend.vercel.app`.
4. Go back to the backend Vercel project and update `APP_BASE_URL` and `CORS_ORIGIN` to the frontend URL, then redeploy.

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable        | Required | Description                                      |
|-----------------|----------|--------------------------------------------------|
| `PORT`          | No       | Local server port (default: 3000)                |
| `DATABASE_URL`  | Yes      | PostgreSQL connection string                     |
| `JWT_SECRET`    | Yes      | Secret key for signing JWTs (min 32 chars)       |
| `JWT_EXPIRES_IN`| No       | Token expiry (default: `7d`)                     |
| `ADMIN_EMAIL`   | Yes*     | Email for the initial admin account              |
| `ADMIN_PASSWORD`| Yes*     | Password for the initial admin account           |
| `APP_BASE_URL`  | Yes      | Frontend base URL (used in share links)          |
| `CORS_ORIGIN`   | Yes      | Allowed CORS origin(s), comma-separated          |
| `SMTP_HOST`     | No       | SMTP server host (default: smtp.gmail.com)       |
| `SMTP_PORT`     | No       | SMTP port (default: 587)                         |
| `SMTP_USER`     | No       | SMTP username / Gmail address                    |
| `SMTP_PASS`     | No       | SMTP password / Gmail App Password               |
| `SMTP_FROM`     | No       | Sender display name and address                  |

*Required only for `npm run init-db` / `npm run seed`.

### Frontend (`frontend/.env`)

| Variable           | Required | Description                                  |
|--------------------|----------|----------------------------------------------|
| `VITE_API_BASE_URL`| No       | Backend API base URL (default: `/api/v1`)    |

---

## Available Scripts

### Backend

| Script        | Description                                      |
|---------------|--------------------------------------------------|
| `npm start`   | Start the production server                      |
| `npm run dev` | Start with `--watch` for auto-reload             |
| `npm run init-db` | Apply schema.sql and seed the admin account  |
| `npm run seed`| Seed academic master data (programmes, branches, subjects, faculty) |

### Frontend

| Script           | Description                    |
|------------------|--------------------------------|
| `npm run dev`    | Start Vite dev server          |
| `npm run build`  | Build for production           |
| `npm run preview`| Preview the production build   |
