# MedPrep ET

A comprehensive medical quiz application for USMLE preparation, built with Next.js, TypeScript, and Supabase.

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/soripaulos-projects/v0-medical-quiz-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/F9zbFHQaqn8)

## 🚀 Quick Start

### Environment Setup (Required)

Since this project uses Supabase, you'll need to configure environment variables:

**For Local Development:**
```bash
# Run the setup script
./scripts/setup-env.sh

# Or manually create .env.local
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

**For GitHub/Deployment:**
See [GITHUB_ENVIRONMENT_SETUP.md](./GITHUB_ENVIRONMENT_SETUP.md) for detailed instructions on:
- GitHub Secrets configuration
- Vercel/Netlify deployment setup
- CI/CD environment variables

### Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/soripaulos-projects/v0-medical-quiz-app](https://vercel.com/soripaulos-projects/v0-medical-quiz-app)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/F9zbFHQaqn8](https://v0.dev/chat/projects/F9zbFHQaqn8)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository