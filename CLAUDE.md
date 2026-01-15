# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## UX Philosophy

**Sophisticated power, simple experience.** All tools must be:

- **Smart by default**: Automatically detect duplicates, merge data, and maintain history without user intervention
- **Seamless workflows**: Single scan and bulk scan should behave identically from a data perspective - URLs are URLs regardless of how they were scanned
- **No duplicate data**: When scanning a URL that already exists for a client, update the existing record and add to scan history rather than creating duplicates
- **Unified views**: Dashboards show all data regardless of how it was captured (single vs bulk)
- **Minimal clicks**: Reduce friction at every step; smart defaults over configuration

## Commands

```bash
# Development (from root)
npm run dev           # Start all apps with Turbopack
npm run build         # Build all workspaces
npm run lint          # ESLint all workspaces
npm run type-check    # TypeScript checking

# From apps/portal/ directly
npm run dev           # next dev --turbopack
npm run build         # next build
npm run lint          # next lint
npm run type-check    # tsc --noEmit
```

## Architecture

### Monorepo Structure

This is a Turborepo monorepo with npm workspaces:

- **apps/portal/** - Next.js 15 application (React 19, Turbopack)
- **packages/ui/** - Shared UI components (`@tds/ui`)
- **packages/database/** - MongoDB/Mongoose models (`@tds/database`)

### Authentication

NextAuth.js with Google OAuth. Restricted to `@thedigitalstride.co.uk` emails only.

- First user auto-promoted to admin
- JWT-based sessions (stateless)
- Config: `apps/portal/lib/auth.ts`
- Protected API routes use `getServerSession(authOptions)` and check `session.user.role`

### Database

MongoDB with Mongoose. Connection uses global singleton pattern for serverless compatibility.

**Models** (in `packages/database/src/`):
- `User` - email, name, image, role (`'admin' | 'user'`)
- `Client` - name, website, description, contactEmail, contactName, isActive, createdBy

### Adding New Tools

1. Create page: `apps/portal/app/tools/[tool-name]/page.tsx`
2. Register in: `apps/portal/lib/tools.ts` (add to `tools` array)
3. Add API routes: `apps/portal/app/api/tools/[tool-name]/route.ts`

Tool interface:
```typescript
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  category: 'seo' | 'social' | 'analytics' | 'content' | 'utility';
  isNew?: boolean;
  requiredRole?: 'admin' | 'user';
}
```

### UI Components

Custom shadcn-style components in `packages/ui/src/components/`. Import via `@tds/ui`:

```typescript
import { Button, Card, Input, Badge, Dialog } from '@tds/ui';
```

Components use Tailwind CSS + CVA for variants. The `cn()` utility merges classNames.

### API Route Protection Pattern

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });
  // For admin routes:
  if (session.user.role !== 'admin') return new Response('Forbidden', { status: 403 });
  // ... handler logic
}
```

### Environment Variables

Required in `apps/portal/.env.local`:
- `MONGODB_URI` - MongoDB connection string
- `NEXTAUTH_URL` - App URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

### Path Aliases

In portal app tsconfig:
- `@/*` - `apps/portal/*`
- `@tds/ui` - `packages/ui`
- `@tds/database` - `packages/database`
