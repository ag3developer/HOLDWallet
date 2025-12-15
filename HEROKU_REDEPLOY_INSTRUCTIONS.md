# Heroku Redeploy Instructions

## Current Status

✅ Code has been updated and pushed to GitHub (commit ca522ce1)
❌ Heroku needs to be redeployed to pick up the new changes

## What Changed

- Added **PathRewriteMiddleware** to `backend/app/main.py`
- This middleware automatically rewrites `/v1/...` requests to `/api/v1/...`
- This enables Heroku to properly route API calls without needing Digital Ocean's app.yaml rewriting

## How to Redeploy

### Option 1: Using Heroku Dashboard (Easiest)

1. Go to https://dashboard.heroku.com
2. Select your **wolknow-backend** app
3. Go to the **Deploy** tab
4. Click **Deploy Branch** button (under "Manual Deploy")
5. Wait 5-10 minutes for the build and deployment to complete
6. Check logs to verify success

### Option 2: Using Heroku CLI

```bash
# Install Heroku CLI if needed
# macOS: brew tap heroku/brew && brew install heroku

# Login to Heroku
heroku login

# Deploy
heroku apps:list  # Find your app name
heroku deploy --app=your-app-name --git-branch=main

# Watch logs
heroku logs --app=your-app-name --tail
```

### Option 3: Enable Automatic Deploys (GitHub Integration)

1. Heroku Dashboard → Your App → **Deploy** tab
2. Connect to GitHub (if not already connected)
3. Enable **Automatic Deploys** from main branch
4. Future pushes to main will deploy automatically

## Testing After Deployment

### Test 1: Health Check

```bash
curl https://api.wolknow.com/v1/health
```

Expected: `{"status":"healthy"}` or similar

### Test 2: Root Endpoint

```bash
curl https://api.wolknow.com/v1/
```

Expected: Status response with version info

### Test 3: Login Endpoint

```bash
curl -X POST https://api.wolknow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"app@holdwallet.com","password":"Abc123@@"}'
```

Expected: Either token response or meaningful error (NOT 404)

### Test 4: Check Backend Logs

```bash
heroku logs --app=wolknow-backend --tail
```

Look for: `🎉 Wolknow Backend started successfully`

## Troubleshooting

### Still Getting 404?

1. Check if deployment completed: `heroku releases --app=wolknow-backend`
2. Verify latest release is deployed
3. Check logs for errors during startup
4. Restart dyno: `heroku dyno:restart --app=wolknow-backend`

### Database Connection Issues?

Database credentials are stored in Heroku environment variables. Verify:

```bash
heroku config --app=wolknow-backend | grep DATABASE_URL
```

### Redis Connection Issues?

The warning about Redis is non-critical. The app will work without it (caching disabled).

## Important Notes

- ✅ Path rewriting is now handled by FastAPI middleware (not Heroku/nginx)
- ✅ Both `/v1/...` and `/api/v1/...` routes will work
- ✅ No need for app.yaml (that's Digital Ocean syntax)
- ⚠️ Procfile is what Heroku uses for deployment
