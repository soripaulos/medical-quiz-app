# Nixpacks Deployment Guide

This guide explains how to deploy your Next.js 15 medical prep application using Nixpacks.

## Files Created

1. **`nixpacks.toml`** - Main Nixpacks configuration file
2. **`.dockerignore`** - Optimizes build context by excluding unnecessary files

## Configuration Overview

### Build Process
- Uses `pnpm` for package management (faster than npm)
- Enables corepack for package manager version management
- Installs dependencies with `--frozen-lockfile` for reproducible builds
- Runs `pnpm run build` to create the production build
- Starts with `pnpm run start` for the production server

### Environment Variables

You'll need to set these environment variables in your deployment platform:

#### Required Supabase Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # If using server-side operations
```

#### Optional Variables
```bash
DATABASE_URL=your-database-connection-string  # If using direct database access
NODE_ENV=production  # Already set in nixpacks.toml
NEXT_TELEMETRY_DISABLED=1  # Already set in nixpacks.toml
```

## Deployment Platforms

### Railway
1. Connect your GitHub repository
2. Railway will automatically detect the `nixpacks.toml` file
3. Set your environment variables in the Railway dashboard
4. Deploy!

### Render
1. Connect your repository
2. Choose "Web Service"
3. Render will detect Nixpacks configuration
4. Set environment variables in Render dashboard
5. Deploy!

### Generic Nixpacks Deployment
```bash
# Build the image
nixpacks build . --name medprep-et

# Run the container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  medprep-et
```

## Build Optimization Features

1. **Frozen Lockfile**: Uses exact versions from `pnpm-lock.yaml`
2. **Production Build**: Optimized Next.js build with static optimization
3. **Minimal Image**: `.dockerignore` excludes unnecessary files
4. **Telemetry Disabled**: Reduces build time and privacy concerns

## Troubleshooting

### Build Issues
- Ensure all environment variables are set
- Check that `pnpm-lock.yaml` is committed to your repository
- Verify your Supabase configuration is correct

### Runtime Issues
- Check application logs for specific errors
- Ensure all required environment variables are available at runtime
- Verify your Supabase project is accessible from your deployment platform

### Performance
- The app uses image optimization disabled (`unoptimized: true` in next.config.mjs)
- This is suitable for platforms that don't support Next.js image optimization
- Consider enabling it if your platform supports it

## Next Steps

1. Set up your environment variables in your deployment platform
2. Connect your repository to your chosen platform
3. Deploy and test your application
4. Monitor logs for any issues

For more advanced configurations, refer to the [Nixpacks documentation](https://nixpacks.com/docs).

## Docker Compose Setup

In addition to Nixpacks, this project includes Docker Compose configurations for local development and production deployment.

### Files Created

- **`docker-compose.yml`** - Production-ready setup with PostgreSQL, Redis, and optional Nginx
- **`docker-compose.dev.yml`** - Development setup with full Supabase local stack
- **`Dockerfile`** - Multi-stage production build
- **`Dockerfile.dev`** - Development build with hot reloading
- **`.env.example`** - Template for environment variables

### Quick Start

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your actual values:**
   - Set your Supabase URL and keys
   - Configure database credentials
   - Add any custom environment variables

### Development Environment

Run the full development stack with Supabase local:

```bash
# Start all development services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

**Development Services:**
- **Next.js App**: http://localhost:3000
- **Supabase Studio**: http://localhost:54324
- **Supabase API**: http://localhost:54321
- **PostgreSQL**: localhost:54322
- **Redis**: localhost:6380

### Production Environment

Run the production stack:

```bash
# Build and start production services
docker-compose up -d --build

# With Nginx reverse proxy
docker-compose --profile production up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Production Services:**
- **Next.js App**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Nginx** (optional): http://localhost:80

### Docker Commands

```bash
# Build only the Next.js app
docker build -t medprep-app .

# Run standalone container
docker run -p 3000:3000 --env-file .env medprep-app

# Build development image
docker build -f Dockerfile.dev -t medprep-app-dev .

# Clean up unused images and volumes
docker system prune -a
docker volume prune
```

### Supabase Local Development

The development setup includes a complete Supabase local stack:

- **Database**: PostgreSQL with Supabase extensions
- **Auth**: GoTrue authentication server
- **API**: PostgREST API server
- **Realtime**: Real-time subscriptions
- **Studio**: Supabase management interface

Access Supabase Studio at http://localhost:54324 to:
- Manage database schema
- View and edit data
- Test API endpoints
- Monitor real-time events

### Environment Variables for Docker

Key variables for Docker Compose:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321  # For local development
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
POSTGRES_DB=medprep_db
POSTGRES_USER=medprep_user
POSTGRES_PASSWORD=secure-password

# Supabase Local (for dev environment)
SUPABASE_DB_PASSWORD=your-super-secret-and-long-postgres-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters-long
```

### Troubleshooting Docker

**Port Conflicts:**
- Development uses different ports (5433, 6380) to avoid conflicts
- Check if ports are already in use: `netstat -tulpn | grep :3000`

**Volume Issues:**
- Reset volumes: `docker-compose down -v`
- Clean up: `docker volume prune`

**Build Issues:**
- Clear build cache: `docker-compose build --no-cache`
- Check logs: `docker-compose logs [service-name]`

**Database Connection:**
- Ensure database is ready before app starts
- Check connection strings in environment variables
- Verify network connectivity between services