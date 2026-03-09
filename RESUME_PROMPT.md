# Resume Prompt for INSPIRE-LAB

Copy and paste this entire prompt into Claude to restore full context:

---

I'm working on INSPIRE-LAB, an invite-only professional networking platform. You previously helped scaffold this Next.js 16 app with route protection, shadcn/ui, and a black UI theme.

**Current Project State**: Read `CLAUDE_STATE.md` for complete details. Summary below.

## What's Already Done
- ✅ Next.js 16 + TypeScript + Tailwind + shadcn/ui installed and configured
- ✅ Black UI theme with design tokens in `app/globals.css`
- ✅ Prisma schema with UserStatus enum (PENDING/ACTIVE) in 13 models
- ✅ NextAuth v5 configured with Credentials provider
- ✅ Route groups: `(marketing)`, `(auth)`, `(app)`
- ✅ Middleware protecting `/app` routes - blocks unauthenticated and PENDING users
- ✅ Landing page at `/` for invite-only messaging
- ✅ Onboarding flow at `/onboarding` (sets handle + roleTitle → ACTIVE status)
- ✅ App feed at `/app/discover` (requires ACTIVE status)
- ✅ Server actions created for auth, profile, follow, users, onboarding
- ✅ shadcn/ui components: Button, Input, Card, Badge, Avatar, Skeleton, Label, Dropdown Menu

## Critical Blocker 🚨
**Build is FAILING** - Auth pages use old Input component API

**Error Location**: `app/(auth)/signin/page.tsx:64` and `app/(auth)/signup/page.tsx`

**Problem**: These files use:
```tsx
<Input
  label="Email"
  type="email"
  {...register("email")}
  error={errors.email?.message}
  disabled={isLoading}
/>
```

But the new shadcn Input component doesn't have `error` or `label` props.

**Required Fix**: Refactor all form inputs to this pattern:
```tsx
<div className="space-y-2">
  <Label>Email</Label>
  <Input
    type="email"
    {...register("email")}
    disabled={isLoading}
  />
  {errors.email && (
    <p className="text-sm text-destructive">{errors.email.message}</p>
  )}
</div>
```

## Your Task

**Fix the build in this exact order:**

1. **Refactor `/app/(auth)/signin/page.tsx`**
   - Update both Input fields (email, password) to use Label + Input + error message pattern
   - Import Label from `@/components/ui/label`

2. **Refactor `/app/(auth)/signup/page.tsx`**
   - Update all 4 Input fields (name, email, password, inviteCode) to use the same pattern

3. **Update `components/ui/textarea.tsx`** (if needed)
   - Remove any custom `error` or `label` props to match shadcn pattern
   - Should only extend `React.TextareaHTMLAttributes<HTMLTextAreaElement>`

4. **Refactor these profile components** (they likely have the same issue):
   - `components/profile-edit-form.tsx`
   - `components/onboarding-form.tsx` (already partially correct, verify)
   - `components/sections/links-section.tsx`
   - `components/sections/skills-section.tsx`
   - `components/sections/tools-section.tsx`
   - `components/sections/projects-section.tsx`
   - `components/sections/qualifications-section.tsx`

5. **Test the build**:
   ```bash
   npm run build
   ```

6. **Once build passes**, update CLAUDE_STATE.md to mark the blocker as resolved.

## Important Context

- **App name**: "inspire-lab" (not "inspire-lab")
- **Theme**: Black background, white text/borders, sharp corners (0rem radius)
- **Routes**:
  - `/` → Landing page (public)
  - `/auth/signin`, `/auth/signup` → Auth (public)
  - `/onboarding` → PENDING users only
  - `/app/discover` → ACTIVE users only (protected)
  - `/profile/edit` → Authenticated users
- **Database**: Prisma schema exists but NO migrations created yet (using `db:push`)
- **Seed**: 3 ACTIVE users (alice@example.com, bob@example.com, charlie@example.com, password: password123)

## Expected Outcome

After you complete the above tasks:
- ✅ `npm run build` succeeds with no errors
- ✅ All form components use consistent shadcn Input + Label pattern
- ✅ No TypeScript errors
- ✅ Auth pages render with proper styling
- ✅ CLAUDE_STATE.md updated with current status

**Start by reading `/app/(auth)/signin/page.tsx` and fixing it, then move to the next file.**
