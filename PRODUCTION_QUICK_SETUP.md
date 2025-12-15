# Production Setup - Quick Start

## Backend Variables Configured ✅

File: `backend/.env.production`

```
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=info
DATABASE_URL=postgresql://doadmin:PASSWORD@app-1265fb66-9e7e-4f8c-b1fc-efab8c026006-do-user-22787082-0.l.db.ondigitalocean.com:25060/defaultdb
SECRET_KEY=EQdrBj2LpJJA2_PQRQzR14q75V50mc3m10dJVriqr7Q
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ALLOWED_ORIGINS=https://hold-wallet-deaj.vercel.app,https://wolknow.com,http://localhost:3000
FRONTEND_URL=https://hold-wallet-deaj.vercel.app
ETHEREUM_RPC_URL=https://eth.drpc.org
POLYGON_RPC_URL=https://polygon-rpc.com
BSC_RPC_URL=https://bsc-dataseed1.binance.org
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
ROOT_PATH=v1
```

**TODO:** Replace PASSWORD with actual database password

## Frontend Variables Configured ✅

File: `Frontend/.env.production`

```
NODE_ENV=production
VITE_API_URL=https://api.wolknow.com/api/v1
VITE_WS_URL=wss://api.wolknow.com/ws
VITE_APP_URL=https://hold-wallet-deaj.vercel.app
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SENTRY=false
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

## Development Variables ✅

File: `Frontend/.env.development`

```
NODE_ENV=development
VITE_API_URL=http://127.0.0.1:8000/api/v1
VITE_WS_URL=ws://127.0.0.1:8000/ws
VITE_APP_URL=http://localhost:5173
```

## Deploy Steps

### Backend

```bash
cd backend
export ENVIRONMENT=production
python -m alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend

```bash
cd Frontend
npm run build
# Upload dist/ to Vercel or your hosting
```

## Security Checklist

- [x] Environment set to production
- [x] Debug mode disabled
- [x] CORS configured for frontend domain
- [x] JWT algorithm configured
- [x] Database URL pointing to production
- [x] RPC endpoints verified
- [x] CSP headers configured
- [x] HTTPS required

## Test Endpoints

```bash
# Check API health
curl https://api.wolknow.com/api/v1/health

# Test CORS
curl -H "Origin: https://hold-wallet-deaj.vercel.app" \
     -X OPTIONS https://api.wolknow.com/api/v1/auth/login -v

# Test login
curl -X POST https://api.wolknow.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
```

## Environment Details

- Frontend: https://hold-wallet-deaj.vercel.app
- API: https://api.wolknow.com/api/v1
- Domain: https://wolknow.com
- Database: DigitalOcean PostgreSQL
- Cache: Redis required

Status: Ready for Production Deployment
