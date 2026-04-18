# Quick Start (No Database Setup Required)

Since you don't have PostgreSQL installed locally and don't have a Supabase account yet, here's how to run the app:

## Option 1: Get a Free Database (Recommended — 5 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Sign up (free, no credit card)
3. Click "New Project"
4. Pick any name (e.g., "portfolio-tracker")
5. Set a database password (save it!)
6. Wait 2 minutes for setup
7. Go to **Settings → Database → Connection string → URI**
8. Copy the connection string (looks like `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`)
9. Paste it in `backend/.env` as `DATABASE_URL`
10. Run migrations:

```bash
cd backend
npm run migrate
```

11. Start the servers:

```bash
# Terminal 1
npm run dev:backend

# Terminal 2 (new terminal)
npm run dev:frontend
```

12. Open `http://localhost:5173`

## Option 2: Install PostgreSQL Locally

**Windows:**
1. Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Run installer, set password for `postgres` user
3. Open Command Prompt and run:

```bash
createdb portfolio_tracker
```

4. Update `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/portfolio_tracker
```

5. Run migrations and start servers (same as Option 1, steps 10-12)

## What You'll See

Once running, the app will have:
- Pre-populated expenses (rent ₹14,000, car EMI ₹18,552, other ₹15,000)
- Pre-populated car loan (₹10,54,000 outstanding)
- Empty income, investments, and savings (add your own data)

## Troubleshooting

**"ECONNREFUSED" error?**
- You need a database. Follow Option 1 or 2 above.

**Frontend shows "Network Error"?**
- Make sure backend is running on port 3000
- Check `backend/.env` has correct `DATABASE_URL`

**Stock prices not updating?**
- Prices refresh every 15 min during market hours (09:15-15:30 IST, Mon-Fri)
- Click "Refresh Prices" button in the top bar to fetch manually
- Use NSE symbols like `RELIANCE.NS` or BSE symbols like `500325.BO`

## Next Steps

1. Add your income sources (Income page)
2. Add your investments (Investments page → use `.NS` suffix for NSE stocks)
3. Add savings transactions (Savings page)
4. View your dashboard

## Deploy to Production (Free)

Once you're happy with the app locally:

1. **Database**: Already on Supabase (free tier)
2. **Backend**: Deploy to [render.com](https://render.com) or [railway.app](https://railway.app) (free tier)
3. **Frontend**: Deploy to [vercel.com](https://vercel.com) or [netlify.com](https://netlify.com) (free tier)

See `README.md` for detailed deployment instructions.
