# GitHub Environment Variables Setup Guide

## 🔐 GitHub Secrets Configuration

Since you're working on GitHub, you'll need to set up environment variables through GitHub Secrets and deployment platforms. Here's how:

### 1. GitHub Repository Secrets

Go to your repository on GitHub and set up secrets:

1. Navigate to: `Settings` → `Secrets and variables` → `Actions`
2. Click `New repository secret`
3. Add these secrets:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY = your_supabase_service_role_key
```

### 2. GitHub Codespaces Environment Variables

If using GitHub Codespaces:

1. Go to: `Settings` → `Codespaces` → `Repository secrets`
2. Add the same environment variables as above
3. They'll be automatically available in your Codespace

### 3. Local Development (Git-Safe)

For local development, you have several options:

#### Option A: Local .env.local (Recommended)
```bash
# Create .env.local locally (already gitignored)
cp .env.example .env.local
# Edit .env.local with your actual values
```

#### Option B: System Environment Variables
```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"
export SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

#### Option C: Use direnv (Advanced)
```bash
# Install direnv, then create .envrc
echo 'export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"' > .envrc
echo 'export NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"' >> .envrc
echo 'export SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"' >> .envrc
direnv allow
```

## 🚀 Deployment Platforms

### Vercel Deployment
1. Connect your GitHub repo to Vercel
2. In Vercel dashboard: `Settings` → `Environment Variables`
3. Add all three Supabase variables
4. Deploy automatically from GitHub pushes

### Netlify Deployment
1. Connect GitHub repo to Netlify
2. In Netlify dashboard: `Site settings` → `Environment variables`
3. Add the Supabase variables
4. Redeploy

### Railway Deployment
1. Connect GitHub repo to Railway
2. In Railway dashboard: `Variables` tab
3. Add the Supabase environment variables

## 🔧 GitHub Actions Workflow

If you're using GitHub Actions for CI/CD, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm run build
```

## 🛡️ Security Best Practices

### ✅ DO:
- Use GitHub Secrets for sensitive data
- Keep `.env.local` in `.gitignore` (already done)
- Use environment-specific variables
- Rotate keys regularly

### ❌ DON'T:
- Commit `.env` files with real values
- Put secrets in code comments
- Share secrets in issues/PRs
- Use production keys in development

## 🔍 Verification

To verify your setup is working:

1. **Local Development:**
   ```bash
   # Check if variables are loaded
   npm run dev
   # Test API endpoint
   curl http://localhost:3000/api/questions/filter-options
   # Should return method: "database" instead of "mock"
   ```

2. **GitHub Actions:**
   - Check the Actions tab for build logs
   - Ensure no environment variable errors

3. **Deployment:**
   - Test your deployed app's API endpoints
   - Check deployment platform logs

## 🆘 Troubleshooting

### Environment Variables Not Loading?
1. Check spelling and case sensitivity
2. Restart development server after adding variables
3. Verify `.gitignore` includes `.env*`
4. Check deployment platform variable names

### Still Getting Mock Data?
1. Verify URLs don't contain placeholder text
2. Check Supabase project is active
3. Verify anon key has correct permissions
4. Test service role key separately