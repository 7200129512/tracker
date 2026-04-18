# Deployment Guide - 24/7 Free Hosting

Your Portfolio Tracker application is ready to deploy with **lifetime free 24/7 hosting**!

## ✅ Step 1: Code is on GitHub
Your code is already pushed to: https://github.com/7200129512/tracker

## 🚀 Step 2: Deploy Backend to Koyeb (Never Sleeps!)

1. **Go to Koyeb**: https://www.koyeb.com
2. **Sign up/Login** with your GitHub account (sara9566@gmail.com)
3. **Click "Create App"**
4. **Select "GitHub"** as deployment method
5. **Connect your GitHub repository**: `7200129512/tracker`
6. **Configure the service**:
   - **Builder**: Docker
   - **Dockerfile**: `Dockerfile` (auto-detected)
   - **App Name**: `portfolio-tracker`
   - **Service Name**: `backend`
   - **Region**: Singapore (or closest to you)
   - **Instance Type**: Free (Nano - 512MB RAM)
   - **Port**: `3000`
7. **Add Environment Variables** (click "Environment variables"):
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://postgres:@sara4251@SARA@db.zcoldagsacuaceohddal.supabase.co:5432/postgres
   FRONTEND_URL=https://your-app-name.vercel.app
   MARKET_DATA_REFRESH_CRON=*/15 9-15 * * 1-5
   ```
   (We'll update FRONTEND_URL after deploying frontend)

8. **Click "Deploy"**
9. **Wait for deployment** (takes 3-5 minutes)
10. **Copy your backend URL** (will be like: `https://portfolio-tracker-backend-your-org.koyeb.app`)

## 🎨 Step 3: Deploy Frontend to Vercel

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** with your GitHub account (sara9566@gmail.com)
3. **Click "Add New..."** → Select **"Project"**
4. **Import your GitHub repository**: `7200129512/tracker`
5. **Configure the project**:
   - **Framework Preset**: Vite
   - **Root Directory**: Leave as `./` (root)
   - **Build Command**: `npm run build --workspace=frontend`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install`
6. **Add Environment Variable**:
   - Click "Environment Variables"
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://portfolio-tracker-backend-your-org.koyeb.app` (your backend URL from Step 2)
7. **Click "Deploy"**
8. **Wait for deployment** (takes 1-2 minutes)
9. **Copy your frontend URL** (will be like: `https://tracker-xyz.vercel.app`)

## 🔄 Step 4: Update Backend Environment Variable

1. **Go back to Koyeb dashboard**
2. **Click on your app** → **Settings**
3. **Go to "Environment variables"** section
4. **Edit `FRONTEND_URL`** with your Vercel URL from Step 3
5. **Click "Update"** (this will redeploy the backend automatically)

## 🗄️ Step 5: Run Database Migrations

After backend is deployed on Koyeb:

**Option A: Using Koyeb CLI (Recommended)**
1. Install Koyeb CLI: https://www.koyeb.com/docs/cli/installation
2. Login: `koyeb login`
3. Run migration:
   ```bash
   koyeb exec portfolio-tracker/backend -- npm run migrate --workspace=backend
   ```

**Option B: Run Locally (Easier)**
Since your database is on Supabase, you can run migrations from your local machine:
1. Open terminal in your project folder
2. Run: `npm run migrate --workspace=backend`
3. Migrations will run against your Supabase database

## ✅ Done!

Your application is now live! Open your Vercel URL in the browser.

### Your Live URLs:
- **Frontend**: https://tracker-[your-id].vercel.app
- **Backend**: https://portfolio-tracker-backend-your-org.koyeb.app
- **Database**: Supabase (already configured)

### Important Notes:
- **Free tier benefits**:
  - ✅ Koyeb: **Never sleeps!** Always responds instantly (24/7)
  - ✅ Vercel: Unlimited bandwidth for personal projects
  - ✅ Supabase: 500MB database storage, 2GB bandwidth/month
- **Automatic deployments**: Any push to `main` branch will auto-deploy
- **Custom domain**: You can add a custom domain in both Vercel and Koyeb (free)

### Troubleshooting:
- If backend fails to start, check environment variables in Koyeb
- If frontend can't connect to backend, verify `VITE_API_BASE_URL` in Vercel
- If database connection fails, check `DATABASE_URL` in Koyeb
- Check logs in Koyeb dashboard for backend errors
- Koyeb deployment logs: Click your app → Logs tab

## 🎉 Enjoy Your Portfolio Tracker!
