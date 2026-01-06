# INSPIRE-LAB - Quick Start Guide

## What Was Built

A production-grade, invite-only professional networking platform with:

### Core Features
- **Invite-only authentication** - Users can only sign up with valid invite codes
- **Credentials auth** - Email/password authentication (magic link via Resend optional)
- **Rich user profiles** - Avatar, name, handle, role, bio, location
- **Profile sections** - Links, Skills, Tools, Projects, Qualifications
- **Follow system** - Users can follow/unfollow each other
- **Home feed** - Tile grid with cursor pagination
- **Black/white theme** - Minimalist design with color for actions only

### Tech Stack
- Next.js 16 with App Router
- TypeScript with strict typing
- Tailwind CSS 3.4
- Prisma 6 + PostgreSQL
- NextAuth v5 (beta)
- Zod validation
- React Hook Form
- UploadThing for images
- Server Actions

## Quick Setup

### 1. Install Dependencies
```bash
cd inspire-lab
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/inspire-lab"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

### 3. Initialize Database
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000

## Test Credentials

The seed script creates 3 users:

**Email:** alice@example.com
**Password:** password123

**Email:** bob@example.com
**Password:** password123

**Email:** charlie@example.com
**Password:** password123

## Invite Codes

For new signups:
- `WELCOME2024` (10 uses remaining)
- `BETA-ACCESS` (5 uses remaining)

## Project Structure

```
inspire-lab/
├── app/
│   ├── actions/          # Server actions (auth, profile, follow, users)
│   ├── api/              # API routes (NextAuth, UploadThing)
│   ├── auth/             # Auth pages (signin, signup)
│   ├── profile/edit/     # Edit profile page
│   ├── [handle]/         # Dynamic profile pages
│   ├── layout.tsx        # Root layout with header
│   └── page.tsx          # Home feed with pagination
│
├── components/
│   ├── sections/         # Profile edit sections
│   ├── ui/               # Reusable UI (Button, Input, Textarea)
│   ├── avatar-upload.tsx
│   ├── follow-button.tsx
│   ├── header.tsx
│   ├── load-more-button.tsx
│   ├── profile-card.tsx
│   └── profile-edit-form.tsx
│
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── auth.config.ts    # Auth config
│   ├── prisma.ts         # Prisma client
│   ├── uploadthing.ts    # UploadThing utilities
│   └── validations.ts    # Zod schemas
│
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed script
│
└── types/
    └── next-auth.d.ts    # NextAuth type extensions
```

## Key Features Walkthrough

### 1. Authentication Flow
- Navigate to `/auth/signup`
- Enter name, email, password, and invite code
- System validates invite code and creates account
- Auto-generates unique handle from email
- Redirects to home feed

### 2. Profile Management
- Click "Edit Profile" in header
- Update basic info (name, handle, role, bio, location)
- Upload avatar via UploadThing
- Add links, skills, tools, projects, qualifications
- Changes save immediately and revalidate cache

### 3. Following Users
- Browse profiles on home feed
- Click any profile card to view full profile
- Click "Follow" button on profile page
- Follower/following counts update in real-time

### 4. Cursor Pagination
- Home feed loads 12 profiles per page
- Click "Load More" to fetch next page
- Uses cursor-based pagination for performance

## Database Schema

### Core Models
- **User** - Auth and profile data
- **InviteCode** - Invite codes with usage tracking
- **Follow** - Follow relationships
- **Link** - Profile links
- **Skill** - User skills
- **Tool** - Tools user works with
- **Project** - Portfolio projects
- **Qualification** - Education/certifications

### Auth Models (NextAuth)
- **Account** - OAuth accounts
- **Session** - User sessions
- **VerificationToken** - Email verification

## Production Deployment

### 1. Database
Create PostgreSQL database (Supabase, Railway, Neon, etc.)

### 2. Environment Variables
Set in your hosting platform:
```
DATABASE_URL=your-production-db-url
NEXTAUTH_URL=your-production-url
NEXTAUTH_SECRET=generate-new-secret
UPLOADTHING_SECRET=your-uploadthing-secret (optional)
UPLOADTHING_APP_ID=your-uploadthing-app-id (optional)
```

### 3. Build and Deploy
```bash
npm run build
npm start
```

Recommended: Vercel (zero-config), Railway, or Render

## Next Steps

1. **Add magic link auth** - Set up Resend API key for passwordless auth
2. **Configure UploadThing** - Enable avatar and project image uploads
3. **Create invite codes** - Use Prisma Studio to create new invite codes
4. **Customize theme** - Modify colors in `tailwind.config.ts`
5. **Add features** - Build on the solid foundation!

## Support

- See `README.md` for detailed documentation
- Check Prisma Studio (`npm run db:studio`) to view/edit data
- All routes are SSR with server actions for mutations
- Strong typing throughout - TypeScript will guide you

Enjoy building with INSPIRE-LAB!
