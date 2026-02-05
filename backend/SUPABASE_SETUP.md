# ACN (Agent Credit Network) - Supabase Migration Setup

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

### Required Variables

```bash
# Supabase PostgreSQL Connection String
# Get this from your Supabase Dashboard:
# 1. Go to Project Settings > Database
# 2. Copy the Connection string (URI format)
# 3. Replace [YOUR-PASSWORD] with your database password
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Secret key for admin operations (auto-generated in production)
ACN_AGENT_SECRET=your-secret-key-here

# Optional: JWT secret for future auth features
JWT_SECRET=your-jwt-secret-here
```

## Setting Up Supabase

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Sign up/login with risuenotheshotcaller@gmail.com
3. Click "New Project"
4. Name: `acn-production`
5. Database Password: Generate a strong password (save it!)
6. Region: Choose closest to your users (e.g., us-east-1)
7. Click "Create new project"

### 2. Get Connection Details
After project creation:
1. Go to Project Settings (gear icon) > Database
2. Under "Connection string", select "URI" format
3. Copy the connection string
4. Replace `[YOUR-PASSWORD]` with your database password
5. Set this as `DATABASE_URL` in your environment variables

### 3. Create Tables
1. Go to SQL Editor (left sidebar)
2. Click "New query"
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run"
5. All tables and indexes will be created

### 4. Update Render Environment Variables
1. Go to your Render dashboard
2. Select the ACN service
3. Go to "Environment" tab
4. Add/Update:
   - `DATABASE_URL`: Your Supabase connection string
   - `ACN_AGENT_SECRET`: Generate a secure random string
5. Click "Save Changes"
6. Deploy will automatically restart

## Connection String Format

### For Local Development
```bash
# If running PostgreSQL locally
DATABASE_URL=postgresql://localhost:5432/acn
```

### For Supabase (Production)
```bash
# Standard format
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# With SSL (required for most cloud providers)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require
```

## Switching Back to SQLite (Emergency)

If you need to revert to SQLite temporarily:

1. Update `render.yaml`:
   ```yaml
   startCommand: node server-sqlite.js
   ```

2. Or set environment variable:
   ```bash
   DATABASE_URL=sqlite://./acn.db
   ```

## Testing the Migration

After deployment:

1. Check health endpoint:
   ```bash
   curl https://your-render-url.onrender.com/health
   ```
   Should return: `{"status": "healthy", "database": "PostgreSQL (Supabase) - connected"}`

2. Register a test agent:
   ```bash
   curl -X POST https://your-render-url.onrender.com/api/agents/register \
     -H "Content-Type: application/json" \
     -H "x-agent-id: TestAgent" \
     -d '{"address": "0xTest123", "name": "TestAgent"}'
   ```

3. Verify data persists by checking the agent:
   ```bash
   curl https://your-render-url.onrender.com/api/agents/0xTest123
   ```

4. Trigger a redeploy in Render and verify data is still there

## Troubleshooting

### Connection Errors
- Verify your password is correct (no special characters that need URL encoding)
- Check that your IP is allowed in Supabase (Settings > Database > Network Restrictions)
- For Render: Ensure `sslmode=require` is in the connection string

### Table Not Found Errors
- Run the schema SQL in Supabase SQL Editor again
- Check that tables were created by going to Table Editor

### SSL Errors
- Add `?sslmode=require` to your connection string
- Or set `ssl: { rejectUnauthorized: false }` in db-supabase.js (already done)

## Migration Checklist

- [ ] Created Supabase project
- [ ] Ran schema SQL to create tables
- [ ] Copied connection string to environment variables
- [ ] Updated Render environment variables
- [ ] Deployed new server-supabase.js
- [ ] Tested agent registration
- [ ] Tested loan creation
- [ ] Verified data persists after redeploy
