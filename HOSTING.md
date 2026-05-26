# SH Shop - Cloud Hosting Guide
## Frontend: Vercel | Backend: Render | Database: Supabase

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │     │   Render     │     │  Supabase    │
│  (Frontend)  │────▶│  (Backend)   │────▶│ (PostgreSQL) │
│  Next.js     │     │  Express.js  │     │  Database    │
│  Free tier   │     │  Free tier   │     │  Free tier   │
└──────────────┘     └──────────────┘     └──────────────┘
     ▲                                          
     │                                          
   Client                                      
  (Browser)                                     
```

---

## Step 1: Create Supabase Database

1. Go to [https://supabase.com](https://supabase.com) and sign up
2. Click **New Project**
3. Set:
   - **Project name**: `sh-shop`
   - **Database password**: generate a strong password (save it!)
   - **Region**: choose closest to your users
4. After creation, go to **Settings** → **Database**
5. Copy the **Connection string (URI)** — it looks like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
6. **Important**: Use the **Transaction mode** (port 6543) connection string for Prisma

> Save this connection string — you'll use it as `DATABASE_URL` on Render.

---

## Step 2: Deploy Backend on Render

1. Go to [https://render.com](https://render.com) and sign up with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo: `maosokhun/my_ecomerce`
4. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `sh-shop-backend` |
| **Root Directory** | `shop-backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm ci && npx prisma generate && npm run build` |
| **Start Command** | `npx prisma migrate deploy && node dist/server.js` |
| **Instance Type** | Free |

5. Add **Environment Variables** (click "Add Environment Variable"):

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase connection string from Step 1 |
| `JWT_SECRET` | `P6NC94YW0eZg1C_ayQ71CyORum42Cg-HcOmyImebKL1CcfL28euYtibptopIoT2L` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | (leave empty for now, fill after Vercel deploy) |
| `CORS_ALLOW_VERCEL` | `1` |
| `GOOGLE_CLIENT_ID` | `344579051559-08m325r6s85gg9t7ejhckcn91l3c853i.apps.googleusercontent.com` |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | `1635751367657263` |
| `STRIPE_SECRET_KEY` | Your Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Your Stripe webhook secret |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |
| `TELEGRAM_USER_BOT_TOKEN` | Your user notification bot token |
| `TELEGRAM_USER_CHAT_ID` | Your user notification chat ID |

6. Click **Create Web Service**
7. Wait for deployment (3-5 minutes)
8. Copy your backend URL (e.g., `https://sh-shop-backend.onrender.com`)

---

## Step 3: Seed the Database (First Time Only)

After Render deploys, go to Render dashboard → **Shell** tab and run:

```bash
ADMIN_EMAIL=admin@shophub.com ADMIN_PASSWORD=YourAdminPass123! npx prisma db seed
```

---

## Step 4: Deploy Frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign up with GitHub
2. Click **Add New** → **Project**
3. Import your repo: `maosokhun/my_ecomerce`
4. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `shop-frontend` |

5. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://sh-shop-backend.onrender.com/api` (your Render URL + /api) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your Stripe publishable key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `344579051559-08m325r6s85gg9t7ejhckcn91l3c853i.apps.googleusercontent.com` |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | `1635751367657263` |

6. Click **Deploy**
7. Copy your Vercel URL (e.g., `https://sh-shop.vercel.app`)

---

## Step 5: Update Render FRONTEND_URL

1. Go back to **Render** dashboard → your backend service
2. Go to **Environment** tab
3. Update `FRONTEND_URL` with your Vercel URL:
   ```
   https://sh-shop.vercel.app
   ```
4. Click **Save Changes** (Render will auto-restart)

---

## Step 6: Update Google & Facebook OAuth

### Google (Google Cloud Console):
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Go to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client
4. Add to **Authorized JavaScript origins**:
   - `https://sh-shop.vercel.app`
5. Add to **Authorized redirect URIs**:
   - `https://sh-shop.vercel.app`

### Facebook (Meta Developer Console):
1. Go to [https://developers.facebook.com](https://developers.facebook.com)
2. Go to your App → **Settings** → **Basic**
3. Add to **App Domains**: `sh-shop.vercel.app`
4. Go to **Facebook Login** → **Settings**
5. Add **Valid OAuth Redirect URI**: `https://sh-shop.vercel.app/`

---

## How It Works After Setup

```
User opens sh-shop.vercel.app
        │
        ▼
   Vercel (Frontend)
   Serves React pages
        │
        │ API calls to NEXT_PUBLIC_API_URL
        ▼
   Render (Backend)
   Express.js handles requests
        │
        │ Prisma queries
        ▼
   Supabase (Database)
   PostgreSQL stores data
```

### Auto-Deploy:
- **Push to GitHub** → Vercel auto-rebuilds frontend
- **Push to GitHub** → Render auto-rebuilds backend
- No manual commands needed!

---

## Free Tier Limits

| Service | Limit | Note |
|---------|-------|------|
| **Vercel** | 100GB bandwidth/month | More than enough |
| **Render** | Spins down after 15min idle | First request takes ~30s to wake |
| **Supabase** | 500MB database, 2 projects | Enough for a school project |

---

## Custom Domain (Optional)

### On Vercel:
1. Go to **Settings** → **Domains**
2. Add your domain (e.g., `myshop.com`)
3. Update DNS records as instructed

### On Render:
1. Go to **Settings** → **Custom Domains**
2. Add your API domain (e.g., `api.myshop.com`)
3. Update DNS records as instructed

Then update:
- Vercel: `NEXT_PUBLIC_API_URL=https://api.myshop.com/api`
- Render: `FRONTEND_URL=https://myshop.com`

---

## Troubleshooting

### CORS errors
Make sure `FRONTEND_URL` on Render matches your Vercel URL exactly, and `CORS_ALLOW_VERCEL=1` is set.

### Database connection fails
- Check Supabase connection string has correct password
- Use **Transaction mode** (port 6543) not Session mode
- Add `?pgbouncer=true` to the end of DATABASE_URL if using pooler

### Render spins down (cold start)
Free tier spins down after 15 minutes of inactivity. First request takes ~30 seconds. Upgrade to paid ($7/month) for always-on.

### Images not loading
Make sure Render URL hostname is in `next.config.ts` → `images.remotePatterns` (it auto-adds from `NEXT_PUBLIC_API_URL`).
