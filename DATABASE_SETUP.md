# Database Setup Guide

Complete guide for setting up the INSPIRE-LAB database with Prisma and PostgreSQL.

## Prerequisites

- PostgreSQL 15+ installed and running
- Node.js 18+ installed
- `.env` file configured with DATABASE_URL

## Quick Start

```bash
# 1. Reset database and apply schema (DESTRUCTIVE - deletes all data)
npm run db:reset

# 2. Or use individual commands:
npm run db:push    # Apply schema changes
npm run db:seed    # Populate with test data
```

## Available Commands

### Schema Management

```bash
# Generate Prisma Client (auto-runs after db:push)
npm run db:generate

# Push schema to database (development only, no migration files)
npm run db:push

# Create a migration file (production-ready)
npx prisma migrate dev --name <migration_name>

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: Deletes all data and reseeds)
npm run db:reset
```

### Data Seeding

```bash
# Run seed script
npm run db:seed

# Reset + reseed (fresh start)
npm run db:reset
```

### Database Introspection & Studio

```bash
# Open Prisma Studio (visual database editor)
npx prisma studio

# Pull schema from existing database
npx prisma db pull
```

## Schema Overview

The INSPIRE-LAB database includes:

### Core Models
- **User** - User accounts with status (PENDING/ACTIVE/SUSPENDED) and roles (USER/ADMIN/MODERATOR)
- **Account/Session/VerificationToken** - Auth.js authentication models
- **InviteCode** - Invite codes with usage limits and expiration
- **InviteRedemption** - Tracks who used which invite codes

### Skills & Tools
- **SkillTag** - Predefined skill tags (e.g., JavaScript, React, Python)
- **UserSkill** - User's skills with level (BEGINNER/INTERMEDIATE/ADVANCED/EXPERT) and featured flag
- **ToolTag** - Predefined tool tags (e.g., VS Code, Figma, Docker)
- **UserTool** - User's tools with level and featured flag

### Profile Sections
- **Link** - Social media and website links
- **Project** - User projects with status and visibility controls
- **Qualification** - Education and certifications with optional verification

### Social Graph
- **Follow** - Follow relationships between users
- **Vouch** - User endorsements/recommendations

### Moderation
- **Report** - User reports for moderation

## Seed Data

The seed script creates:

### Admin Account
- **Email:** `admin@inspire-lab.app`
- **Password:** `admin123`
- **Role:** ADMIN

### Test Users (All ACTIVE)
- **Alice Johnson** (`alice@example.com`) - Senior Full-Stack Engineer
  - Skills: JavaScript, TypeScript, React, Next.js, Node.js, PostgreSQL
  - Tools: VS Code, Git, Figma, Prisma
  - Projects: E-commerce Platform, Real-time Chat App
  - Qualifications: B.S. CS from Stanford, AWS Certified

- **Bob Smith** (`bob@example.com`) - Backend Engineer
- **Charlie Davis** (`charlie@example.com`) - Frontend Developer

**Password for all test users:** `password123`

### Skill Tags (33 total)
Organized by category:
- Programming Languages (6)
- Frontend/Backend Frameworks (10)
- Databases (4)
- DevOps & Cloud (5)
- AI/ML (4)
- Design & Business (4)

### Tool Tags (25 total)
Organized by category:
- IDEs & Editors (4)
- Version Control (3)
- Design Tools (3)
- Project Management (2)
- Testing, ORMs, Infrastructure as Code, etc.

### Invite Codes
- **WELCOME2024** - 50 uses, expires in 1 year
- **BETA-ACCESS** - 100 uses, no expiration
- **STAFF-2024** - 25 uses, expires in 90 days

### Sample Data
- 5 follow relationships
- 1 vouch (Bob vouching for Alice)
- 2 projects for Alice
- 2 qualifications for Alice

## Indexes

Optimized indexes for common queries:

### User Indexes
- `handle` - Unique username lookups
- `email` - Login and email verification
- `status` - Filter active/pending/suspended users
- `createdAt` - Sort by join date
- `lastActiveAt` - Activity tracking

### Tag Indexes
- `slug` - Fast slug-based lookups
- `name` - Search by name
- `category` - Filter by category

### Social Graph Indexes
- `followerId` - Get users someone follows
- `followingId` - Get followers
- `createdAt(desc)` - Recent follows/vouches

### Feed Indexes
- `Project.status` - Filter by project status
- `Project.visibility` - Privacy controls
- `Project.createdAt(desc)` - Recent projects

## Migration Workflow

### Development
Use `db:push` for rapid iteration:
```bash
npm run db:push
```

### Production
Use migrations for version control:
```bash
# 1. Create migration
npx prisma migrate dev --name add_new_feature

# 2. Apply to production
npx prisma migrate deploy
```

## Common Tasks

### Add a New Skill Tag
```typescript
await prisma.skillTag.create({
  data: {
    name: "Swift",
    slug: "swift",
    category: "Programming Languages",
  },
});
```

### Create a User with Skills
```typescript
const user = await prisma.user.create({
  data: {
    email: "user@example.com",
    name: "New User",
    handle: "newuser",
    status: "ACTIVE",
    userSkills: {
      create: [
        {
          skillTag: { connect: { slug: "javascript" } },
          level: "EXPERT",
          featured: true,
          yearsOfExp: 5,
        },
      ],
    },
  },
});
```

### Query Users with Skills
```typescript
const users = await prisma.user.findMany({
  where: { status: "ACTIVE" },
  include: {
    userSkills: {
      include: { skillTag: true },
      where: { featured: true },
    },
  },
});
```

## Troubleshooting

### "Database does not exist"
```bash
# Create database manually
createdb inspire_lab

# Or use PostgreSQL command
psql -c "CREATE DATABASE inspire_lab;"
```

### "Migration failed"
```bash
# Reset and try again
npm run db:reset
```

### "Prisma Client out of sync"
```bash
npm run db:generate
```

### Seed script fails
```bash
# Drop and recreate database
dropdb inspire_lab
createdb inspire_lab
npm run db:push
npm run db:seed
```

## Environment Variables

Required in `.env`:

```env
# Database
DATABASE_URL="postgresql://username@localhost:5432/inspire_lab"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

## Performance Tips

1. **Use indexes wisely** - Already optimized for common queries
2. **Batch operations** - Use `createMany` for bulk inserts
3. **Select specific fields** - Use `select` to reduce data transfer
4. **Pagination** - Always paginate large result sets
5. **Connection pooling** - Configured automatically by Prisma

## Schema Diagram

```
User
├── userSkills → UserSkill → SkillTag
├── userTools → UserTool → ToolTag
├── projects → Project
├── qualifications → Qualification
├── links → Link
├── following → Follow
├── followers → Follow
├── vouchesGiven → Vouch
├── vouchesReceived → Vouch
└── inviteRedemptions → InviteRedemption → InviteCode
```

## Next Steps

1. Run `npm run db:reset` to initialize database
2. Sign in with admin or test user credentials
3. Explore Prisma Studio: `npx prisma studio`
4. Start building features using the seeded data
