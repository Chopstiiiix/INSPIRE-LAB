# INSPIRE-LAB - Claude Implementation State

## Project Summary
**App Name**: INSPIRE-LAB (renamed from "Kudo")
**Purpose**: Invite-only professional networking platform
**Tech Stack**:
- Next.js 16 (App Router)
- TypeScript (strict mode)
- Tailwind CSS 3.4 with shadcn/ui components
- Prisma 6 + PostgreSQL
- NextAuth v5 (beta.30) for authentication
- React Hook Form + Zod validation
- UploadThing for file uploads
- Resend for email (optional)

## Implementation Status

### ✅ COMPLETED
1. **Project Initialization**
   - Next.js 16 with TypeScript
   - All dependencies installed
   - ESLint + Prettier configured
   - Tailwind CSS configured with design tokens

2. **Design System**
   - Black UI with white text/borders theme implemented
   - CSS variables in `app/globals.css` for consistent design tokens
   - shadcn/ui components created: Button, Input, Card, Badge, Avatar, Skeleton, Label, Dropdown Menu
   - `lib/utils.ts` with cn() utility

3. **Database & Auth**
   - Prisma schema with UserStatus enum (PENDING/ACTIVE)
   - 13 models: User, Account, Session, VerificationToken, InviteCode, Follow, Link, Skill, Tool, Project, Qualification
   - NextAuth v5 configured with Credentials provider
   - PrismaAdapter integrated
   - Seed script updated to create ACTIVE users

4. **Route Structure**
   - Route groups created: `(marketing)`, `(auth)`, `(app)`
   - Landing page at `/` (marketing)
   - Auth pages at `/auth/signin` and `/auth/signup`
   - Protected app at `/app/discover`
   - Onboarding at `/onboarding`
   - Profile edit at `/profile/edit`

5. **Middleware & Route Protection**
   - `middleware.ts` created
   - Blocks non-authenticated users from `/app` routes
   - Redirects PENDING users to `/onboarding`
   - Redirects ACTIVE users away from `/onboarding` to `/app/discover`

6. **Core Features**
   - Landing page with invite-only messaging
   - Onboarding flow with handle + role title setup
   - App header with navigation and user dropdown
   - Server actions for auth, profile, follow, users, onboarding

### ⚠️ PARTIALLY DONE
1. **Auth Pages Compatibility**
   - `/auth/signin` and `/auth/signup` pages exist
   - ✅ **FIXED**: Refactored to use shadcn Input + Label pattern
   - Build now passes successfully

2. **App Layout**
   - Created `/app/(app)/layout.tsx` with AppHeader
   - Ready for testing

### ❌ NOT STARTED
1. Additional shadcn components: Dialog, Tabs
2. Profile components using new shadcn components
3. Database migration files (only using `db:push`)
4. UploadThing configuration in .env
5. Resend email configuration
6. User status transition actions (PENDING → ACTIVE tested, but not all edge cases)

## Files & Folders Created/Modified

### New Folders
```
app/(marketing)/
app/(auth)/
app/(app)/
app/(app)/discover/
app/onboarding/
components/ui/
```

### Key Files Created
```
CLAUDE_STATE.md (this file)
middleware.ts
lib/utils.ts
lib/auth.config.ts

app/(marketing)/page.tsx - Landing page
app/(auth)/signin/page.tsx
app/(auth)/signup/page.tsx
app/(app)/layout.tsx
app/(app)/discover/page.tsx - Main app feed
app/onboarding/page.tsx

app/actions/onboarding.ts

components/app-header.tsx
components/onboarding-form.tsx
components/ui/button.tsx - shadcn Button
components/ui/input.tsx - shadcn Input
components/ui/card.tsx - shadcn Card
components/ui/badge.tsx - shadcn Badge
components/ui/avatar.tsx - shadcn Avatar
components/ui/skeleton.tsx - shadcn Skeleton
components/ui/label.tsx - shadcn Label
components/ui/dropdown-menu.tsx - shadcn DropdownMenu

.prettierrc
```

### Key Files Modified
```
package.json - name changed to "inspire-lab", scripts updated
tailwind.config.ts - shadcn-compatible config with design tokens
app/globals.css - CSS variables for black UI theme
prisma/schema.prisma - Added UserStatus enum, status field
prisma/seed.ts - Set users to ACTIVE status
lib/auth.ts - Updated to NextAuth v5 API
app/layout.tsx - Updated to use new auth()
app/api/auth/[...nextauth]/route.ts - Updated exports
app/actions/* - Updated to use auth() instead of getServerSession
.eslintrc.json - Added prettier
README.md, QUICKSTART.md - Updated branding
```

### Deleted/Moved Files
```
Moved: app/auth/* → app/(auth)/*
Moved: app/page.tsx → app/(app)/discover/page.tsx
```

## Key Architectural Decisions

1. **NextAuth v5 Beta**: Using `auth()` instead of `getServerSession(authOptions)`
2. **Route Groups**: Organizing routes by context (marketing, auth, app)
3. **Middleware-based Protection**: Server-side route guards in `middleware.ts`
4. **UserStatus Enum**: PENDING (new signups) → ACTIVE (post-onboarding)
5. **Onboarding Required**: Users must complete profile before accessing /app
6. **Sharp Corners**: Border radius set to 0rem for minimal design
7. **Server Actions**: Using Next.js server actions instead of API routes
8. **Cursor Pagination**: Implemented in users feed

## Database Schema Status

**Models**: 13 total
- User (with status: PENDING | ACTIVE)
- Account, Session, VerificationToken (NextAuth)
- InviteCode (invite-only system)
- Follow (social graph)
- Link, Skill, Tool, Project, Qualification (profile sections)

**Migration Status**:
- ❌ NO migrations created
- Using `prisma db:push` for development
- **Action Required**: Run `prisma migrate dev` before production

**Seed Status**:
- ✅ Seed script exists and updated
- Creates 3 users (alice, bob, charlie) with status: ACTIVE
- Creates 2 invite codes
- NOT RUN YET (no DATABASE_URL set)

## Environment Setup Assumptions

**.env.example exists** with:
```
DATABASE_URL="postgresql://user:password@localhost:5432/inspire_lab"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
RESEND_API_KEY="" (optional)
EMAIL_FROM="noreply@inspire-lab.app" (optional)
UPLOADTHING_SECRET="" (optional)
UPLOADTHING_APP_ID="" (optional)
```

**Not Created**: `.env` file (user must create from .env.example)

**Dependencies Installed**: ✅ All npm packages installed

## Known Bugs & Blockers

### ✅ RESOLVED - Build Fixed
**Previous Issue**: Type mismatch in auth pages due to old Input component API
**Status**: **FIXED** - All form components refactored to use shadcn Input + Label pattern
**Fixed Files**:
- `/app/(auth)/signin/page.tsx` - Refactored email and password inputs
- `/app/(auth)/signup/page.tsx` - Refactored name, email, password, and inviteCode inputs
- `components/ui/textarea.tsx` - Migrated to shadcn pattern
- `components/profile-edit-form.tsx` - All form fields updated
- `components/onboarding-form.tsx` - Updated to use Label component
- `components/sections/links-section.tsx` - Form inputs refactored
- `components/sections/skills-section.tsx` - Form inputs refactored
- `components/sections/tools-section.tsx` - Form inputs refactored
- `components/sections/projects-section.tsx` - Form inputs refactored
- `components/sections/qualifications-section.tsx` - Form inputs refactored
- `components/follow-button.tsx` - Fixed button variant from "primary" to "default"
- `components/header.tsx` - Fixed button variant from "primary" to "default"
- `components/app-header.tsx` - Removed non-existent image property
- All section components - Fixed button variant from "danger" to "destructive"

**Build Status**: ✅ Passing (TypeScript compilation successful)

### Other Issues
1. **Deprecated Middleware Warning**: Next.js suggests using "proxy" instead of "middleware"
2. **Avatar Upload**: Component exists but needs testing with UploadThing
3. **Database Not Configured**: Need to create .env file and run migrations

## TODOs

### Immediate (Blocking)
1. ✅ **Fix Auth Pages** - COMPLETED - Updated signin/signup to use shadcn Input + Label pattern
2. ✅ **Fix Profile Edit Components** - COMPLETED - All form components updated to shadcn pattern
3. ✅ **Test Build** - COMPLETED - Build passes successfully
4. **Create .env** - Copy from .env.example and configure
5. **Run Migrations** - `npm run db:push` then `npm run db:seed`

### Next Priority
6. Test route protection flow (unauthenticated → signin → onboarding → app)
7. Create Dialog component for modals
8. Create Tabs component for profile sections
9. Update profile edit page UI with shadcn components
10. Test UploadThing integration

### Later
11. Add proper migrations (`prisma migrate dev`)
12. Configure Resend for magic links (optional)
13. Add loading states and skeletons
14. Error boundary components
15. Accessibility audit

## NEXT 5 Concrete Tasks (Execution Order)

1. ✅ **Refactor `/app/(auth)/signin/page.tsx`** - COMPLETED
   - Removed `error` and `label` props from Input
   - Wrapped each input in div with Label component
   - Error messages shown with `<p className="text-destructive text-sm">`

2. ✅ **Refactor `/app/(auth)/signup/page.tsx`** - COMPLETED
   - Same pattern as signin page applied
   - All 4 fields updated: name, email, password, inviteCode

3. ✅ **Update `components/ui/textarea.tsx`** - COMPLETED
   - Made shadcn-compatible (removed error/label props)
   - Uses same pattern as Input

4. ✅ **Update profile edit form components** - COMPLETED
   - `components/profile-edit-form.tsx` - Updated
   - All section components in `components/sections/*` - Updated
   - All using Label + Input pattern

5. **Test complete flow** - NEXT STEP
   - Create .env from .env.example
   - Run `npm run db:generate`
   - Run `npm run db:push`
   - Run `npm run db:seed`
   - ✅ Run `npm run build` - PASSING
   - Run `npm run dev`
   - Test: Landing → Signup → Onboarding → App

## Notes for Resume

- User wanted full Next.js scaffold with route protection
- Changed app name from "kudo" to "inspire-lab"
- Middleware protects /app routes (requires ACTIVE status)
- PENDING users must complete onboarding (set handle + roleTitle)
- Black UI theme is fully configured via CSS variables
- All shadcn components use design tokens from globals.css
