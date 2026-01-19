<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15hCETU7GNpZLu43QhSVGAnbtx79bUHKm

## Run Locally

**Prerequisites:**  Node.js

### Setup Steps

1. Install dependencies:
   ```bash
   npm install
   cd api && npm install && cd ..
   ```

2. Configure environment variables:
   - Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
   - Set JWT_SECRET for local API development:
     ```bash
     cd api
     cp .dev.vars.example .dev.vars
     # Edit .dev.vars and set JWT_SECRET to any random string
     ```

3. Run the development servers:
   ```bash
   ./start-dev.sh
   ```

This will start:
- Backend API (Cloudflare Worker) on http://localhost:8787
- Frontend (Vite) on http://localhost:3000

### Local Development Notes

- The frontend will automatically connect to the local API (http://localhost:8787)
- JWT_SECRET is read from `api/.dev.vars` (gitignored for security)
- The local D1 database is stored in `api/.wrangler/state/v3/d1/`
- Logs are saved to `/tmp/egg-guardian-api.log` and `/tmp/egg-guardian-frontend.log`

## Deployment

The app is deployed on Cloudflare infrastructure:
- **Frontend**: Cloudflare Pages (childrenlearn.activing.fun)
- **API**: Cloudflare Workers (childrenlearn.activing.fun/api)
- **Database**: Cloudflare D1 (egg-guardian-db)

### Automatic Deployment

Deployments are automated via GitHub Actions workflow (`.github/workflows/cloudflare-deploy.yml`):
- Triggered on releases or manual workflow dispatch
- Creates/updates D1 database
- Applies database migrations
- Deploys Worker to production
- Builds and deploys frontend to Cloudflare Pages

### Required GitHub Secrets

Configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers, Pages, and D1 permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `JWT_SECRET` - Secret key for JWT authentication
