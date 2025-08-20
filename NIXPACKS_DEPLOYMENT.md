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