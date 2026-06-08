# LoveMarriage Backend — Render.com Deployment

## Deploy to Render (Free Tier)
1. Create account at https://render.com
2. New → Web Service → Connect GitHub repo
3. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

## Required Environment Variables (set in Render Dashboard)
Set each of these in Render → Your Service → Environment:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate a long random string>
JWT_REFRESH_SECRET=<generate another long random string>
ENCRYPTION_KEY=<32-char random string>

# Resend (email OTP)
RESEND_API_KEY=<from resend.com>
FROM_EMAIL=hello@lovemarriage.app
FROM_NAME=LoveMarriage

# MongoDB Atlas
MONGO_URI=<connection string from atlas>

# Cloudflare R2 (optional for now - photos use local fallback)
# R2_ENDPOINT=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET_NAME=lovemarriage-photos
```

## Generate Secure Secrets (run locally)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run twice — once for JWT_SECRET, once for JWT_REFRESH_SECRET.
Run once with length 16 for ENCRYPTION_KEY.
