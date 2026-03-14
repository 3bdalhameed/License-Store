# License Store

A private digital license key store. Admin creates customer accounts, tops up credits, and customers use credits to purchase keys from their dashboard.

---

## Project Structure

```
license-store/
├── backend/     Node.js + Express + Prisma + PostgreSQL
└── frontend/    Next.js 14 + Tailwind CSS
```

---

## 1. Database — Neon (free PostgreSQL)

1. Go to https://neon.tech and create a free account
2. Create a new project
3. Copy the connection string — it looks like:
   `postgresql://user:password@host/dbname?sslmode=require`

---

## 2. Google Sheets Setup

### Create your sheet
Your sheet must have these columns in row 1:
| A     | B       | C      |
|-------|---------|--------|
| key   | product | status |

Example rows:
| XXXXX-XXXXX | Windows 11 Pro | unused |
| YYYYY-YYYYY | Office 2024    | unused |

### Create a Service Account
1. Go to https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts**
5. Create a service account, download the JSON key
6. From the JSON key copy:
   - `client_email` → GOOGLE_SERVICE_ACCOUNT_EMAIL
   - `private_key`  → GOOGLE_PRIVATE_KEY
7. **Share your Google Sheet** with the service account email (Editor access)
8. Copy the Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

---

## 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Push database schema
npx prisma db push

# Create the first admin account (run once)
npx ts-node scripts/createAdmin.ts

# Start dev server
npm run dev
```

### Environment variables (backend/.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=any-long-random-string
JWT_EXPIRES_IN=7d
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-sheet-id
PORT=4000
FRONTEND_URL=http://localhost:3000
```

---

## 4. Create Admin Account

Run this once after `prisma db push`:

```bash
cd backend
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: { email: 'admin@store.com', name: 'Admin', password: hashed, role: 'ADMIN' }
  });
  console.log('Admin created: admin@store.com / admin123');
}
main().finally(() => prisma.\$disconnect());
"
```

Change the email and password after first login!

---

## 5. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local
# Set: NEXT_PUBLIC_API_URL=http://localhost:4000

# Start dev server
npm run dev
```

Open http://localhost:3000

---

## 6. How to use

### Admin workflow
1. Login at `/login` with admin credentials
2. Go to **Products** tab → add your products with credit prices
3. Go to **Customers** tab → create customer accounts
4. Share login credentials with your customers
5. Click **Sync Google Sheets** to import keys from your sheet
6. Adjust credits for customers as needed

### Customer workflow
1. Login at `/login`
2. Browse products in the **Shop** tab
3. Click **Buy now** — credits are deducted instantly
4. Go to **My Orders** tab to see and copy their license key

---

## 7. Deploy

### Backend → Railway
1. Go to https://railway.app
2. New project → Deploy from GitHub
3. Add all environment variables from `.env`
4. Railway gives you a URL like `https://your-app.railway.app`

### Frontend → Vercel
1. Go to https://vercel.com
2. Import your GitHub repo, select the `frontend` folder
3. Add env variable: `NEXT_PUBLIC_API_URL=https://your-app.railway.app`
4. Deploy

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | Public | Login |
| GET | /api/auth/me | Any | Get current user |
| GET | /api/products | Any | List products |
| POST | /api/orders | Customer | Buy a product |
| GET | /api/orders | Customer | My orders |
| GET | /api/admin/customers | Admin | List customers |
| POST | /api/admin/customers | Admin | Create customer |
| DELETE | /api/admin/customers/:id | Admin | Delete customer |
| POST | /api/admin/credits | Admin | Adjust credits |
| GET | /api/admin/orders | Admin | All orders |
| POST | /api/admin/products | Admin | Create product |
| POST | /api/admin/sync-sheets | Admin | Sync Google Sheets |
