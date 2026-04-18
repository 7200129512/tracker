# User Data Isolation Migration - Step by Step Guide

## Overview
This migration adds `user_id` columns to all database tables to enable proper user data isolation. Each user will only see their own data.

## What Changed
1. **Database**: Added `user_id` column to all tables (income_entries, expense_entries, loans, investment_holdings, savings_transactions, monthly_notes)
2. **Frontend API**: Updated all API files to filter data by `user_id`
3. **Authentication**: Integrated Supabase Auth for user management

## Step 1: Apply Database Migration in Supabase

### Option A: Using Supabase Dashboard (Recommended)

1. Go to https://supabase.com and log in with sara9566@gmail.com
2. Select your "Tracker" project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the SQL from `backend/src/db/migrations/003_add_user_id_columns.sql`:

```sql
-- Add user_id column to all tables for multi-user support
-- This migration adds user_id foreign key references to auth.users

-- Add user_id to income_entries
ALTER TABLE income_entries
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to expense_entries
ALTER TABLE expense_entries
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to loans
ALTER TABLE loans
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to investment_holdings
ALTER TABLE investment_holdings
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to savings_transactions
ALTER TABLE savings_transactions
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to monthly_notes
ALTER TABLE monthly_notes
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX idx_income_entries_user_id ON income_entries(user_id);
CREATE INDEX idx_expense_entries_user_id ON expense_entries(user_id);
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_investment_holdings_user_id ON investment_holdings(user_id);
CREATE INDEX idx_savings_transactions_user_id ON savings_transactions(user_id);
CREATE INDEX idx_monthly_notes_user_id ON monthly_notes(user_id);
```

6. Click **Run** button
7. Wait for the query to complete (should take a few seconds)
8. You should see "Query executed successfully"

### Option B: Using psql Command Line

If you prefer command line:

```bash
psql postgresql://postgres:@sara4251@SARA@db.zcoildagsacuaceohddal.supabase.co:5432/postgres < backend/src/db/migrations/003_add_user_id_columns.sql
```

## Step 2: Verify Migration

1. In Supabase Dashboard, go to **Table Editor**
2. Click on each table and verify the `user_id` column exists:
   - income_entries
   - expense_entries
   - loans
   - investment_holdings
   - savings_transactions
   - monthly_notes

## Step 3: Migrate Existing Data

Since you already have data in the database, you need to associate it with your user account.

### Get Your User ID

1. Go to Supabase Dashboard
2. Go to **Authentication** → **Users**
3. Find your user (sara9566@gmail.com) and copy the **User ID** (UUID format)

### Update Existing Data

In Supabase SQL Editor, run this query (replace `YOUR_USER_ID` with the actual UUID):

```sql
-- Update all existing records to associate with your user account
UPDATE income_entries SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE expense_entries SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE loans SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE investment_holdings SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE savings_transactions SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE monthly_notes SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
```

## Step 4: Test the Application

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy to Netlify:
   ```bash
   npm run deploy
   ```

3. Test the application:
   - Go to https://tracker-2026-app.netlify.app
   - Sign up with a new email address
   - Verify that you see NO data (because this is a new user)
   - Sign out
   - Sign in with sara9566@gmail.com
   - Verify that you see all your existing data

## Step 5: Enable Row Level Security (Optional but Recommended)

For production, enable Row Level Security (RLS) to prevent users from accessing other users' data at the database level:

1. Go to Supabase Dashboard
2. Go to **Authentication** → **Policies**
3. For each table, create a policy:
   - Policy name: `Enable read access for own data`
   - Target roles: `authenticated`
   - Using expression: `auth.uid() = user_id`

This ensures that even if someone tries to bypass the frontend, they can only access their own data.

## Troubleshooting

### Issue: "Column user_id already exists"
- The migration has already been applied. Skip to Step 2.

### Issue: "User ID not found"
- Make sure you're logged in to Supabase with the correct account
- Check that the user exists in Authentication → Users

### Issue: "Dashboard still shows ₹0"
- Make sure you've completed Step 3 (migrating existing data)
- Sign out and sign back in
- Clear browser cache (Ctrl+Shift+Delete)

### Issue: "Cannot read property 'id' of null"
- Make sure you're signed in
- Check that your user_id is properly set in the database

## What Happens Next

After this migration:

1. **Each user sees only their own data** - The app filters all queries by `user_id`
2. **New data is automatically associated** - When you create income/expense/loan entries, they're automatically tagged with your user_id
3. **Multiple users can use the app** - Each user has their own isolated data
4. **Data is protected** - Even if someone gets database access, they can only see their own data (with RLS enabled)

## Files Changed

- `backend/src/db/migrations/003_add_user_id_columns.sql` - New migration file
- `frontend/src/api/income.ts` - Added user_id filtering
- `frontend/src/api/expenses.ts` - Added user_id filtering
- `frontend/src/api/loans.ts` - Added user_id filtering
- `frontend/src/api/investments.ts` - Added user_id filtering
- `frontend/src/api/savings.ts` - Added user_id filtering
- `frontend/src/api/dashboard.ts` - Already had user_id filtering
- `frontend/src/context/AuthContext.tsx` - Calls setupUserData on login
- `frontend/src/utils/setupUserData.ts` - Handles user data isolation setup

## Questions?

If you encounter any issues:
1. Check the browser console for error messages
2. Check the Supabase logs (Dashboard → Logs)
3. Verify that the migration was applied successfully
4. Make sure you're signed in with the correct user
