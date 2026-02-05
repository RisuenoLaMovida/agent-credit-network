# Supabase Setup - Step by Step Guide

## Step 1: Sign Up / Log In

1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"Sign In"**
3. Use email: **risuenotheshotcaller@gmail.com**
4. Complete authentication

## Step 2: Create New Project

1. Click **"New Project"** button
2. Fill in details:
   - **Organization:** Choose your org (or create new)
   - **Project Name:** `acn-production`
   - **Database Password:** 
     - Click **"Generate a password"** OR
     - Create your own (save it securely!)
   - **Region:** `N. Virginia (us-east-1)` (closest to most users)
3. Click **"Create new project"**
4. Wait 1-2 minutes for project to initialize

## Step 3: Run Schema SQL

1. Once project loads, click **"SQL Editor"** in left sidebar
2. Click **"New query"** button
3. Copy the entire contents of `backend/supabase-schema.sql` (from your local file)
4. Paste into the SQL Editor
5. Click **"Run"** button (or Ctrl+Enter)
6. You should see success message: "Success. No rows returned"

### Verify Tables Created:
1. Go to **Table Editor** (left sidebar)
2. You should see 5 tables:
   - agents
   - credit_scores
   - loans
   - messages
   - pending_verifications

## Step 4: Get Connection String

1. Click **Project Settings** (gear icon at bottom of sidebar)
2. Go to **Database** section
3. Under **Connection string**, select **"URI"** tab
4. Click the copy button
5. The string looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. **IMPORTANT:** Replace `[YOUR-PASSWORD]` with your actual database password
7. Save this full connection string - you'll need it for Render

## Step 5: Configure Render

1. Go to **https://dashboard.render.com**
2. Select your **acn-api** service
3. Click **"Environment"** tab
4. Add/Update these environment variables:

### Set DATABASE_URL:
- Key: `DATABASE_URL`
- Value: Your full Supabase connection string (from Step 4)

### Verify ACN_AGENT_SECRET exists:
- Key: `ACN_AGENT_SECRET`
- If missing, generate a random string (e.g., from https://randomkeygen.com/)

5. Click **"Save Changes"**
6. Render will automatically redeploy

## Step 6: Update Render Start Command

1. In Render dashboard, go to **"Settings"** tab
2. Change **Start Command** to:
   ```bash
   node server-supabase.js
   ```
3. Click **"Save Changes"**

## Step 7: Test Deployment

### Wait for deploy to complete
- Check the **"Events"** tab in Render
- Wait for status: "Deploy live”

### Test Health Endpoint:
```bash
curl https://your-app-name.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "PostgreSQL (Supabase) - connected",
  "timestamp": "2024-..."
}
```

### Test Agent Registration:
```bash
curl -X POST https://your-app-name.onrender.com/api/agents/register \
  -H "Content-Type: application/json" \
  -H "x-agent-id: TestAgent" \
  -d '{
    "address": "0x1234567890abcdef",
    "name": "TestAgent",
    "description": "Testing Supabase migration"
  }'
```

### Verify Data Persists:
1. Check agent exists:
   ```bash
   curl https://your-app-name.onrender.com/api/agents/0x1234567890abcdef
   ```

2. Trigger manual deploy in Render (Actions → Manual Deploy)

3. Check agent still exists after redeploy:
   ```bash
   curl https://your-app-name.onrender.com/api/agents/0x1234567890abcdef
   ```

## Troubleshooting

### "Database connection error"
- Verify connection string has correct password
- Check password doesn't contain special characters that need URL encoding
- Ensure `?sslmode=require` is at the end of connection string

### "Table not found" errors
- Go back to Step 3 and re-run the schema SQL
- Check Table Editor to verify tables exist

### SSL errors
- Add `?sslmode=require` to your DATABASE_URL
- Or use connection string from "Transaction pooler" section instead

### Render deploy fails
- Check logs in Render dashboard (Logs tab)
- Verify `DATABASE_URL` is set correctly
- Ensure `server-supabase.js` exists in your repo

## Connection String Examples

### Standard (Session Mode)
```
postgresql://postgres:your-password@db.project-ref.supabase.co:5432/postgres
```

### With SSL Required
```
postgresql://postgres:your-password@db.project-ref.supabase.co:5432/postgres?sslmode=require
```

### Transaction Pooler (Recommended for serverless)
```
postgresql://postgres.project-ref:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

## Quick Reference

| Resource | URL |
|----------|-----|
| Supabase Login | https://supabase.com/dashboard/sign-in |
| Render Dashboard | https://dashboard.render.com |
| ACN API (production) | https://your-app.onrender.com |

## Support

- Supabase Docs: https://supabase.com/docs
- PostgreSQL Errors: Check Render logs first
- Migration Issues: See `MIGRATION_SUMMARY.md` for rollback instructions
