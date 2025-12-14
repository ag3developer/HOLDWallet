# ⚡ QUICK FIX: PostgreSQL Permissions (2 MINUTES)

## The Problem

```
psycopg2.errors.InsufficientPrivilege: permission denied for schema public
```

## The Solution - Run These 7 SQL Commands

### Step 1: Connect to Your Database

**Option A: DigitalOcean Console (Easiest)**

- Dashboard → Databases → Your DB → Console tab
- OR Click "Connection Details" and use connection info

**Option B: Command Line**

```bash
psql -h app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com \
     -U postgres -d defaultdb -p 25060 -W
# Enter the admin password when prompted
```

### Step 2: Copy & Paste All These Commands

```sql
ALTER USER "holdwallet-db" CREATEDB CREATEROLE;
GRANT ALL PRIVILEGES ON SCHEMA public TO "holdwallet-db";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "holdwallet-db";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "holdwallet-db";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "holdwallet-db";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "holdwallet-db";
GRANT CREATE ON SCHEMA public TO "holdwallet-db";
```

### Step 3: Redeploy in DigitalOcean

1. Dashboard → holdwallet app
2. Click **Deployments**
3. Click **Create Deployment** or **Redeploy**
4. Wait 5-10 minutes

### Step 4: Verify It Works

```bash
curl https://your-app-url.ondigitalocean.app/health
```

Should return: `{"status":"ok"}`

---

## That's It! ✅

Your backend will now:

- Create ENUM types
- Create tables automatically
- Start the API successfully

Any issues? Check `FIX_DATABASE_PERMISSIONS.md` for detailed troubleshooting.
