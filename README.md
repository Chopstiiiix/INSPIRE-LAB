# INSPIRE-LAB

A production-grade, invite-only professional networking platform built with Next.js 14+.

## Features

- **Invite-only signup** with unique invite codes
- **User profiles** with avatar, bio, role title, location, and links
- **Skills, Tools, Projects, and Qualifications** sections
- **Follow/unfollow** system
- **Home feed** with cursor pagination and tile grid layout
- **Black/white minimalist design** with color for action meaning
- **Authentication** via Email Magic Link (Resend) or Credentials
- **Image uploads** via UploadThing
- **Strong typing** with TypeScript and Zod validation
- **Clean architecture** with server actions

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Prisma** with PostgreSQL for database
- **Auth.js (NextAuth)** for authentication
- **Zod** for validation
- **React Hook Form** for forms
- **UploadThing** for file uploads
- **Server Actions** for mutations
- **Matrix Synapse** for E2EE chat
- **LiveKit** for video calls

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- (Optional) Resend account for magic link emails
- (Optional) UploadThing account for image uploads

## Setup Instructions

### 1. Clone and Install

```bash
cd inspire-lab
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database (required)
DATABASE_URL="postgresql://user:password@localhost:5432/inspire-lab"

# NextAuth (required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Email (optional - if not set, credentials auth will be used)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# UploadThing (optional - for avatar/image uploads)
UPLOADTHING_SECRET="sk_live_..."
UPLOADTHING_APP_ID="..."
```

#### Generate NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### 3. Database Setup

Generate Prisma client and push schema:

```bash
npm run db:generate
npm run db:push
```

### 4. Seed Database

Seed with sample data (3 users, invite codes, profiles):

```bash
npm run db:seed
```

This creates:
- 3 test users (alice@example.com, bob@example.com, charlie@example.com)
- Password for all: `password123`
- Invite codes: `WELCOME2024` (10 uses), `BETA-ACCESS` (5 uses)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
inspire-lab/
├── app/
│   ├── actions/           # Server actions
│   │   ├── auth.ts
│   │   ├── follow.ts
│   │   ├── profile.ts
│   │   └── users.ts
│   ├── api/
│   │   ├── auth/          # NextAuth API routes
│   │   └── uploadthing/   # UploadThing API routes
│   ├── auth/              # Auth pages (signin, signup)
│   ├── profile/edit/      # Edit profile page
│   ├── [handle]/          # Dynamic profile pages
│   ├── layout.tsx
│   ├── page.tsx           # Home feed
│   └── globals.css
├── components/
│   ├── sections/          # Profile sections (links, skills, etc.)
│   ├── ui/                # Reusable UI components
│   ├── avatar-upload.tsx
│   ├── follow-button.tsx
│   ├── header.tsx
│   ├── load-more-button.tsx
│   ├── profile-card.tsx
│   ├── profile-edit-form.tsx
│   └── session-provider.tsx
├── lib/
│   ├── auth.ts            # Auth.js configuration
│   ├── prisma.ts          # Prisma client singleton
│   ├── uploadthing.ts     # UploadThing utilities
│   └── validations.ts     # Zod schemas
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed script
└── types/
    └── next-auth.d.ts     # NextAuth type extensions
```

## Database Schema

### Core Models

- **User**: Email, password, profile info, handle
- **InviteCode**: Code, max uses, creator, expiry
- **Follow**: Follow relationships between users
- **Link**: User profile links
- **Skill**: User skills
- **Tool**: Tools user works with
- **Project**: Portfolio projects
- **Qualification**: Education/certifications

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint

npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Create and run migrations
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio
```

## Usage

### Creating Invite Codes

Users can create invite codes programmatically or via Prisma Studio:

```bash
npm run db:studio
```

Navigate to InviteCode model and create new codes.

### Authentication Flow

1. User visits `/auth/signup`
2. Enters email, password, name, and valid invite code
3. System validates invite code (not expired, has remaining uses)
4. Creates account and auto-generates unique handle
5. Redirects to home feed

### Profile Features

- Edit profile at `/profile/edit`
- Add/remove links, skills, tools, projects, qualifications
- Upload avatar via UploadThing
- View profile at `/@handle`

### Follow System

- Follow/unfollow users from their profile page
- Follower/following counts displayed on profiles
- Cannot follow yourself

## Deployment

### Database

1. Create PostgreSQL database (Supabase, Railway, Neon, etc.)
2. Update `DATABASE_URL` in production environment

### Environment Variables

Set all required environment variables in your hosting platform:
- `DATABASE_URL`
- `NEXTAUTH_URL` (your production URL)
- `NEXTAUTH_SECRET`
- `RESEND_API_KEY` (if using magic links)
- `EMAIL_FROM` (if using magic links)
- `UPLOADTHING_SECRET` (if using uploads)
- `UPLOADTHING_APP_ID` (if using uploads)

### Build and Deploy

```bash
npm run build
npm start
```

Recommended platforms: Vercel, Railway, Render

## License

MIT
