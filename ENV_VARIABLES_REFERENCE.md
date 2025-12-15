# Production Environment Variables - Reference

This file contains the exact variables you provided, properly organized.

## Backend Production Variables

```ini
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info

DATABASE_URL=psql -h app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com \
     -U doadmin \
     -d defaultdb \
     -p 25060 \
     -W

SECRET_KEY=EQdrBj2LpJJA2_PQRQzR14q75V50mc3m10dJVriqr7Q
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,http://localhost:3000
FRONTEND_URL=https://hold-wallet-deaj.vercel.app

ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org

TRANSFBANK_ENABLED=false
TRANSFBANK_API_URL=https://api.transfbank.com.br/v1
TRANSFBANK_API_KEY=
TRANSFBANK_WEBHOOK_SECRET=

SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

ROOT_PATH=v1
```

## Conversion Notes

### DATABASE_URL

The psql command you provided needs to be converted to PostgreSQL connection string:

```ini
# From:
DATABASE_URL=psql -h app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com \
     -U doadmin \
     -d defaultdb \
     -p 25060 \
     -W

# To:
DATABASE_URL=postgresql://doadmin:PASSWORD@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb
```

Replace PASSWORD with your actual password.

## Files Created/Updated

1. backend/.env.production - Configured with all variables
2. backend/.env.example - Updated with documentation
3. Frontend/.env.production - Updated for production
4. Frontend/.env.development - Updated for development
5. Frontend/.env.example - Updated with examples
6. Frontend/src/config/app.ts - Updated to load from env vars
7. Frontend/index.html - Updated CSP headers

## What's Already Configured

- Environment set to production
- Debug disabled
- Log level set to info
- JWT configuration ready
- RPC endpoints provided
- Redis configuration
- Celery configuration
- TransfBank integration (disabled)
- SMTP integration (disabled)

## What Needs Confirmation

- [ ] Database password
- [ ] All RPC URLs are accessible
- [ ] Redis is available
- [ ] CORS origins are correct
- [ ] Certificates are valid (SSL/TLS)
- [ ] Port 8000 (or your API port) is exposed

## Quick Validation

Run these commands to validate configuration:

```bash
# Check database
curl postgresql://doadmin:PASSWORD@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb

# Check RPC endpoints
curl https://eth.drpc.org
curl https://polygon-rpc.com
curl https://bsc-dataseed1.binance.org

# Check Redis
redis-cli ping
```

## Next Steps

1. Copy backend/.env.production to server
2. Replace PASSWORD placeholder
3. Run alembic migrations
4. Start backend server
5. Build and deploy frontend
6. Run validation tests
7. Monitor logs for issues

All configuration files are ready. You can proceed with deployment.
