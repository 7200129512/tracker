# Deployment Guide

Your Portfolio Tracker application is ready to deploy! Follow these steps:

## ✅ Step 1: Code is on GitHub
Your code is already pushed to: https://github.com/7200129512/tracker

## 🚀 Step 2: Deploy Backend to Render

1. **Go to Render**: https://render.com
2. **Sign up/Login** with your GitHub account (sara9566@gmail.com)
3. **Click "New +"** → Select **"Web Service"**
4. **Connect your GitHub repository**: `7200129512/tracker`
5. **Configure the service**:
   - **Name**: `portfolio-tracker-backend`
   - **Region**: Singapore (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build --workspace=backend`
   - **Start Command**: `npm run start --workspace=backend`
   - **Plan**: Free
6. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=postgresql://postgres:@sara4251@SARA@db.zcoldagsacuaceohddal.supabase.co:5432/postgres
   FRONTEND_URL=https://your-app-name.vercel.app
   MARKET_DATA_REFRESH_CRON=*/15 9-15 * * 1-5
   ```
   (We'll update FRONTEND_URL after deploying frontend)

7. **Click "Create Web Service"**
8. **Wait for deployment** (takes 2-3 minutes)
9. **Copy your backend URL** (will be like: `https://portfolio-tracker-backend.onrender.com`)

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
   - **Value**: `https://portfolio-tracker-backend.onrender.com` (your backend URL from Step 2)
7. **Click "Deploy"**
8. **Wait for deployment** (takes 1-2 minutes)
9. **Copy your frontend URL** (will be like: `https://tracker-xyz.vercel.app`)

## 🔄 Step 4: Update Backend Environment Variable

1. **Go back to Render dashboard**
2. **Click on your backend service**
3. **Go to "Environment"** tab
4. **Update `FRONTEND_URL`** with your Vercel URL from Step 3
5. **Click "Save Changes"** (this will redeploy the backend)

## 🗄️ Step 5: Run Database Migrations

After backend is deployed on Render:

1. **Go to your Render service dashboard**
2. **Click "Shell"** tab (on the left)
3. **Run this command**:
   ```bash
   npm run migrate --workspace=backend
   ```
4. **Wait for "Migrations completed successfully"** message

## ✅ Done!

Your application is now live! Open your Vercel URL in the browser.

### Your Live URLs:
- **Frontend**: https://tracker-[your-id].vercel.app
- **Backend**: https://portfolio-tracker-backend.onrender.com
- **Database**: Supabase (already configured)

### Important Notes:
- **Free tier limitations**:
  - Render: Backend may sleep after 15 minutes of inactivity (first request takes ~30 seconds to wake up)
  - Vercel: Unlimited bandwidth for personal projects
  - Supabase: 500MB database storage, 2GB bandwidth/month
- **Automatic deployments**: Any push to `main` branch will auto-deploy
- **Custom domain**: You can add a custom domain in Vercel settings (free)

### Troubleshooting:
- If backend fails to start, check environment variables in Render
- If frontend can't connect to backend, verify `VITE_API_BASE_URL` in Vercel
- If database connection fails, check `DATABASE_URL` in Render
- Check logs in Render dashboard for backend errors

## 🎉 Enjoy Your Portfolio Tracker!
