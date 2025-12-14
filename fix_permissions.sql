-- Fix PostgreSQL permissions for holdwallet-db user
-- Execute this as doadmin user

-- 1. Make sure user exists and grant basic permissions
ALTER USER "holdwallet-db" CREATEDB CREATEROLE CREATEUSER;

-- 2. Grant usage on public schema
GRANT USAGE ON SCHEMA public TO "holdwallet-db";

-- 3. Grant create on public schema
GRANT CREATE ON SCHEMA public TO "holdwallet-db";

-- 4. Grant all privileges on public schema
GRANT ALL PRIVILEGES ON SCHEMA public TO "holdwallet-db";

-- 5. Grant all on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "holdwallet-db";

-- 6. Grant all on existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "holdwallet-db";

-- 7. Set defaults for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO "holdwallet-db";

-- 8. Set defaults for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO "holdwallet-db";

-- 9. Set defaults for future types
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TYPES TO "holdwallet-db";

-- 10. Grant on types explicitly
GRANT ALL PRIVILEGES ON ALL TYPES IN SCHEMA public TO "holdwallet-db";

-- Verify
SELECT * FROM information_schema.role_table_grants 
WHERE grantee = 'holdwallet-db' 
LIMIT 10;
