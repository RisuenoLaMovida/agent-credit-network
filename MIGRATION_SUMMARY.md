# ACN Backend Migration: SQLite → Supabase PostgreSQL

## Summary

This migration replaces the file-based SQLite database with Supabase PostgreSQL to ensure data persistence across Render deployments.

## Files Created/Modified

### New Database Layer
| File | Description |
|------|-------------|
| `backend/db-supabase.js` | PostgreSQL connection pool using `pg` library |
| `backend/supabase-schema.sql` | Complete SQL schema for PostgreSQL |

### New Server & Routes
| File | Description |
|------|-------------|
| `backend/server-supabase.js` | Express server using Supabase database |
| `backend/routes/agents-supabase.js` | Agent routes (PostgreSQL version) |
| `backend/routes/loans-supabase.js` | Loan routes (PostgreSQL version) |
| `backend/routes/messages-supabase.js` | Message routes (PostgreSQL version) |
| `backend/routes/leaderboard-supabase.js` | Leaderboard routes (PostgreSQL version) |
| `backend/routes/analytics-supabase.js` | Analytics routes (PostgreSQL version) |

### Configuration & Documentation
| File | Description |
|------|-------------|
| `backend/.env.example` | Example environment variables |
| `backend/SUPABASE_SETUP.md` | Detailed setup instructions |
| `render.yaml` | Updated Render deployment config |
| `backend/package.json` | Added npm scripts for both backends |

### Preserved (SQLite Backup)
| File | Status |
|------|--------|
| `backend/db-sqlite.js` | ✅ Kept as backup |
| `backend/server-sqlite.js` | ✅ Kept as backup |
| `backend/routes/*-sqlite.js` | ✅ Kept as backup |

## Quick Start

### 1. Create Supabase Project
```bash
# Go to https://supabase.com
# Sign up with: risuenotheshotcaller@gmail.com
# Create project: "acn-production"
# Save your database password!
```

### 2. Run Schema SQL
1. In Supabase Dashboard, go to SQL Editor
2. Create new query
3. Copy contents of `backend/supabase-schema.sql`
4. Run the query

### 3. Get Connection String
1. Project Settings → Database
2. Copy URI format connection string
3. Replace `[YOUR-PASSWORD]` with your actual password

### 4. Configure Render
1. Go to Render Dashboard → ACN service
2. Environment tab:
   - Set `DATABASE_URL` to your Supabase connection string
   - `ACN_AGENT_SECRET` will be auto-generated
3. Deploy will restart automatically

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
ACN_AGENT_SECRET=your-secret-key

# Optional
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

## Database Schema

### Tables Created
1. **`agents`** - Agent profiles (id, address, name, description, verified, created_at, updated_at)
2. **`credit_scores`** - Credit scores with constraints (score 300-850)
3. **`loans`** - Loan data with status tracking
4. **`messages`** - Lender-borrower chat
5. **`pending_verifications`** - Verification tokens

### Indexes
- All foreign keys indexed
- Common query fields indexed (address, status, loan_id, etc.)

## Testing

### Health Check
```bash
curl https://your-app.onrender.com/health
# Expected: {"status": "healthy", "database": "PostgreSQL (Supabase) - connected"}
```

### Register Agent
```bash
curl -X POST https://your-app.onrender.com/api/agents/register \
  -H "Content-Type: application/json" \
  -H "x-agent-id: TestAgent" \
  -d '{"address": "0xTest123", "name": "TestAgent"}'
```

### Verify Persistence
1. Register an agent
2. Note the verification token
3. Trigger a redeploy in Render
4. Check the agent still exists: `GET /api/agents/0xTest123`

## Rollback (Emergency)

If issues occur, revert to SQLite:

1. In Render dashboard, change start command:
   ```bash
   node server-sqlite.js
   ```

2. Or update `render.yaml`:
   ```yaml
   startCommand: node server-sqlite.js
   ```

## Key Differences from SQLite

| Feature | SQLite | Supabase |
|---------|--------|----------|
| Data persistence | ❌ Resets on deploy | ✅ Permanent |
| Concurrent connections | Single file | Connection pooling |
| Data types | Loose | Strict (INTEGER, TEXT, TIMESTAMP) |
| Boolean handling | 0/1 | true/false (converted) |
| SQL syntax | `?` placeholders | `$1, $2` placeholders |
| Datetime | `datetime('now')` | `NOW()` |
| MIN/MAX in UPDATE | `MIN(col, val)` | `LEAST(col, val)` |

## Next Steps

1. ✅ **Create Supabase project** at https://supabase.com
2. ✅ **Run schema SQL** in Supabase SQL Editor
3. ✅ **Get connection string** from Supabase dashboard
4. ⬜ **Update Render environment variables** with DATABASE_URL
5. ⬜ **Deploy and test** agent registration/loan creation
6. ⬜ **Verify persistence** after redeploy
7. ⬜ **Migrate existing data** (if needed - optional for fresh start)

## Migration Status

| Step | Status |
|------|--------|
| Schema design | ✅ Complete |
| db-supabase.js | ✅ Complete |
| server-supabase.js | ✅ Complete |
| Route files | ✅ Complete |
| Documentation | ✅ Complete |
| Render config | ✅ Complete |
| Supabase project | ⬜ Pending |
| Tables created | ⬜ Pending |
| Environment vars | ⬜ Pending |
| Deploy & test | ⬜ Pending |

## Notes

- The `pg` library was already in package.json (added previously)
- All SQLite files are preserved as backup
- Row Level Security (RLS) is enabled but allows all operations (for server-side use)
- Connection pooling is configured for production use
- SSL is enabled for production connections
