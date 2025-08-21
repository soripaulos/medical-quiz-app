# MedPrep ET - Coolify Deployment Guide

This guide provides step-by-step instructions for deploying the MedPrep ET medical quiz application on Coolify, a self-hosted Platform-as-a-Service (PaaS) solution.

## Prerequisites

Before starting, ensure you have:

- A Linux server (Ubuntu 20.04+ or Debian 11+ recommended)
- Root access to the server
- A domain name pointing to your server
- At least 2GB RAM and 20GB storage
- A Supabase project set up (see Database Setup section)

## Part 1: Coolify Installation and Setup

### Step 1: Prepare Your Server

1. **Update your server:**
   ```bash
   apt update && apt upgrade -y
   ```

2. **Install curl (if not already installed):**
   ```bash
   apt install curl -y
   ```

3. **Ensure you're logged in as root user**

### Step 2: Install Coolify

1. **Run the Coolify installation script:**
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
   
   This will install:
   - Docker
   - Docker Compose
   - Coolify platform

2. **Wait for installation to complete** (usually takes 5-10 minutes)

3. **Access Coolify dashboard:**
   - Open your browser and navigate to: `http://YOUR_SERVER_IP:8000`
   - Complete the initial setup wizard

### Step 3: Configure Domain and SSL

1. **Configure DNS:**
   - In your domain registrar's DNS settings, create:
     - A record: `@` pointing to your server IP
     - A record: `*` (wildcard) pointing to your server IP

2. **Set up domain in Coolify:**
   - Go to Settings → Configuration
   - Enter your domain in "Instance Domain" (e.g., `coolify.yourdomain.com`)
   - Save changes
   - Wait for SSL certificate provisioning (5-10 minutes)

3. **Access Coolify securely:**
   - Navigate to: `https://coolify.yourdomain.com`

### Step 4: Configure Firewall (Recommended)

```bash
ufw allow 80
ufw allow 443
ufw allow 22
ufw enable
```

## Part 2: Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Wait for project initialization (2-3 minutes)
4. Note down your project credentials:
   - Project URL
   - Anon (public) key
   - Service role (secret) key

### Step 2: Set Up Database Schema

1. **Access Supabase SQL Editor:**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor

2. **Run database scripts in order:**
   Execute the following scripts from the `/scripts/` folder in your project:

   ```sql
   -- Run these scripts in order:
   -- 1. 01-create-tables.sql
   -- 2. 02-seed-data.sql
   -- 3. 03-update-schema.sql
   -- 4. 04-simplified-schema.sql
   -- 5. 05-user-progress-tables.sql
   -- 6. 06-comprehensive-auth-policies.sql
   -- 7. 07-fix-profile-issues.sql
   -- 8. 08-create-demo-user.sql
   -- 9. 09-add-updated-at-user-sessions.sql
   -- 10. 10-add-track-progress-to-sessions.sql
   -- 11. 11-add-session-metrics.sql
   -- 12. 12-add-active-session-tracking.sql
   -- 13. 13-enable-realtime.sql
   -- 14. 14-session-activity-tracking.sql
   -- 15. 15-optimize-queries.sql
   -- 16. 16-improved-rpc-functions.sql
   ```

3. **Enable Row Level Security:**
   - Ensure RLS is enabled on all tables (should be done by the scripts)

### Step 3: Configure Authentication

1. **Enable Auth providers in Supabase:**
   - Go to Authentication → Settings
   - Configure your preferred auth providers (Email, Google, etc.)
   - Set site URL to your future Coolify domain

## Part 3: Deploy MedPrep ET on Coolify

### Step 1: Create New Project

1. **In Coolify dashboard:**
   - Click "Projects"
   - Click "New Project"
   - Name: `medprep-et`
   - Save

### Step 2: Add Application

1. **Add new resource:**
   - Click "Add Resource" → "Application"
   - Choose "Public Repository"

2. **Configure Git repository:**
   - Repository URL: `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME`
   - Branch: `main` (or your default branch)
   - Build Pack: `nixpacks` (recommended for Next.js)

### Step 3: Configure Build Settings

1. **Build Configuration:**
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
   - Port: `3000`

2. **Node.js Settings:**
   - Node Version: `18` or `20`
   - Package Manager: `pnpm`

### Step 4: Set Environment Variables

1. **Add the following environment variables:**

   **Public Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **Private Variables:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NODE_ENV=production
   ```

2. **Important:** Replace the placeholder values with your actual Supabase credentials

### Step 5: Configure Domain

1. **Set custom domain:**
   - In application settings, go to "Domains"
   - Add domain: `medprep.yourdomain.com` (or your preferred subdomain)
   - Save and wait for SSL certificate provisioning

### Step 6: Deploy Application

1. **Start deployment:**
   - Click "Deploy" button
   - Monitor build logs for any errors
   - Deployment typically takes 3-5 minutes

2. **Verify deployment:**
   - Once complete, visit your domain: `https://medprep.yourdomain.com`
   - Check that the application loads correctly

## Part 4: Post-Deployment Configuration

### Step 1: Update Supabase Auth Settings

1. **Configure Site URL:**
   - In Supabase dashboard, go to Authentication → Settings
   - Set Site URL to: `https://medprep.yourdomain.com`
   - Add to Redirect URLs: `https://medprep.yourdomain.com/auth/callback`

### Step 2: Test Application Features

1. **Test user registration/login**
2. **Verify quiz functionality**
3. **Check progress tracking**
4. **Test real-time features**

### Step 3: Set Up Monitoring (Optional)

1. **Enable application monitoring in Coolify:**
   - Go to application settings
   - Enable monitoring and logging
   - Set up alerts if needed

## Troubleshooting

### Common Issues and Solutions

1. **Build fails with dependency errors:**
   - Check Node.js version compatibility
   - Ensure `pnpm-lock.yaml` is committed
   - Try clearing build cache in Coolify

2. **Environment variables not working:**
   - Verify variable names match exactly
   - Check for trailing spaces
   - Ensure private variables are marked as such

3. **Database connection issues:**
   - Verify Supabase URL and keys
   - Check RLS policies are properly configured
   - Ensure database scripts ran successfully

4. **Authentication not working:**
   - Verify Site URL in Supabase matches your domain
   - Check redirect URLs are configured
   - Ensure auth provider settings are correct

5. **Application not accessible:**
   - Check domain DNS propagation
   - Verify SSL certificate status
   - Check Coolify proxy configuration

### Logs and Debugging

1. **View application logs:**
   - In Coolify, go to your application
   - Click on "Logs" tab
   - Monitor build and runtime logs

2. **Check Supabase logs:**
   - In Supabase dashboard, go to Logs
   - Monitor API and Auth logs

## Maintenance

### Regular Updates

1. **Update application:**
   - Push changes to your Git repository
   - Coolify will auto-deploy if configured
   - Or manually trigger deployment in Coolify

2. **Update Coolify:**
   - Coolify updates automatically
   - Check for manual updates in Settings

3. **Monitor resources:**
   - Check server resources regularly
   - Scale up if needed
   - Monitor database usage in Supabase

### Backup Strategy

1. **Database backups:**
   - Supabase provides automatic backups
   - Consider additional backup strategy for production

2. **Application backups:**
   - Your Git repository serves as source backup
   - Consider backing up environment variables

## Security Considerations

1. **Keep secrets secure:**
   - Never commit environment variables to Git
   - Use Coolify's secret management
   - Rotate keys periodically

2. **Enable security headers:**
   - Configure CSP headers in Next.js
   - Enable HSTS
   - Use secure cookies

3. **Monitor access:**
   - Review Supabase auth logs
   - Monitor unusual activity
   - Set up alerts for failed logins

## Support

- **Coolify Documentation:** [coolify.io/docs](https://coolify.io/docs)
- **Supabase Documentation:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Documentation:** [nextjs.org/docs](https://nextjs.org/docs)

---

**Deployment completed!** Your MedPrep ET application should now be running on Coolify at your configured domain.