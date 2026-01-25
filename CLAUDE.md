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
- `PageStore` - URL index with latestSnapshotId, clientsWithAccess (Page Store)
- `PageSnapshot` - version history with blobUrl, fetchedAt, httpStatus (Page Store)
- `UrlBatch` - generic batch processing for any tool (URL Batch Processing)

### Page Store Architecture (Single Source of Truth)

**Page Store is the ONLY place where page content is fetched and stored.** Tools NEVER fetch pages directly.

```
┌─────────────────────────────────────────────────────────────┐
│                      PAGE LIBRARY UI                         │
│  - View/manage stored URLs                                  │
│  - Bulk refresh snapshots                                   │
│  - Delete pages                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ manages via
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       PAGE STORE                             │
│  - PageStore model (URL index per client)                   │
│  - PageSnapshot model (version history)                     │
│  - Vercel Blob (HTML content storage)                       │
│  - Service: lib/services/page-store-service.ts              │
│  *** SINGLE SOURCE OF TRUTH FOR ALL PAGE CONTENT ***        │
└─────────────────────┬───────────────────────────────────────┘
                      │ tools read via getPage()
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                         TOOLS                                │
│  - Call getPage() to get HTML content                       │
│  - NEVER use fetch() directly for page content              │
│  - Track analyzedSnapshotId for staleness detection         │
│  - Auto-creates Page Store entries on first scan            │
└─────────────────────────────────────────────────────────────┘
```

**Rules for tools that analyze web pages:**

1. **Always use `getPage()` from `@/lib/services/page-store-service`** - never `fetch()` directly
2. **Require `clientId`** - all page content is scoped to a client
3. **Track `snapshotId`** - store which snapshot was analyzed for staleness detection
4. **Use `forceRefresh: true`** for rescan operations to get fresh content

```typescript
import { getPage } from '@/lib/services/page-store-service';

// Correct: Use Page Store
const { html, snapshot } = await getPage({
  url,
  clientId,
  userId: session.user.id,
  toolId: 'my-tool',
  forceRefresh: false,  // true for rescan
});
const snapshotId = snapshot._id.toString();

// WRONG: Never do this
const response = await fetch(url);  // ❌ Violates single source of truth
```

### URL Batch Processing (Shared Component)

Tools that process multiple URLs use the **shared URL batch system** for consistent UX.

```
┌─────────────────────────────────────────────────────────────┐
│              UrlBatchPanel (Shared UI Component)            │
│  - Single URL / Bulk Import modes                          │
│  - Sitemap parsing / URL list input                        │
│  - Live progress bar + current URL                         │
│  - Cancel button + background processing                   │
│  Location: apps/portal/components/url-batch-panel.tsx      │
└─────────────────────┬───────────────────────────────────────┘
                      │ calls
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              /api/url-batch (Shared API)                    │
│  - POST: Create batch                                      │
│  - GET: Poll status + process URLs                         │
│  - DELETE: Cancel batch                                    │
│  - Processor registry for tool-specific logic              │
│  Location: apps/portal/app/api/url-batch/route.ts          │
└─────────────────────┬───────────────────────────────────────┘
                      │ uses
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              UrlBatch Model (Generic)                       │
│  - toolId identifies which processor to use                │
│  - Tracks: urls, succeeded, failed, progress               │
│  Location: packages/database/src/models/url-batch.ts       │
└─────────────────────────────────────────────────────────────┘
```

**Using UrlBatchPanel in a tool:**

```tsx
import { UrlBatchPanel } from '@/components/url-batch-panel';

<UrlBatchPanel
  isOpen={showPanel}
  onClose={() => setShowPanel(false)}
  clientId={selectedClientId}
  clientName={selectedClient?.name || ''}
  toolId="my-tool"  // Must match processor registry
  onUrlsProcessed={refreshData}
  // Optional customization:
  title="Add URLs"
  singleUrlLabel="URL to process"
  processingLabel="Processing..."
/>
```

**Adding a new processor** (in `/api/url-batch/route.ts`):

```typescript
const processors: Record<string, UrlProcessor> = {
  'page-library': async (url, clientId, userId) => {
    // Archive to Page Store
    const result = await getPage({ url, clientId, userId, toolId: 'page-library' });
    return { success: true, result: { snapshotId: result.snapshot._id } };
  },
  'my-new-tool': async (url, clientId, userId) => {
    // Custom processing logic
    return { success: true, result: { /* tool-specific data */ } };
  },
};
```

### Adding New Tools

**See [TOOL_STANDARDS.md](./TOOL_STANDARDS.md) for detailed patterns and code examples.**

1. Create page: `apps/portal/app/tools/[tool-name]/page.tsx`
2. **Create layout (REQUIRED):** `apps/portal/app/tools/[tool-name]/layout.tsx` - includes Sidebar and auth checks
3. Register in: `apps/portal/lib/tools.ts` (add to `tools` array)
4. Add API routes: `apps/portal/app/api/tools/[tool-name]/route.ts`
5. Add model: `packages/database/src/models/[model-name].ts` (with history tracking)
6. **If tool processes URLs:** Use `UrlBatchPanel` component and add processor to `/api/url-batch/route.ts`

**Tool layout template** (every tool MUST have this):
```typescript
// apps/portal/app/tools/[tool-name]/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { canAccessTool } from '@/lib/permissions';
import { Sidebar } from '@/components/sidebar';

const TOOL_ID = '[tool-name]';  // Must match tools.ts id

export default async function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const hasAccess = await canAccessTool(session.user.id, TOOL_ID);
  if (!hasAccess) redirect('/dashboard?error=no-tool-access');

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
```

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

## Versioning System

This project uses **Semantic Versioning** with **Conventional Commits**.

### Commit Message Format
```
<type>[optional scope][!]: <description>
```

**Types and their version impact:**
| Type | Version Bump | Description |
|------|--------------|-------------|
| `feat` | MINOR | New feature for the user |
| `fix` | PATCH | Bug fix |
| `docs` | PATCH | Documentation only |
| `style` | PATCH | Formatting, no code change |
| `refactor` | PATCH | Code change, no feature/fix |
| `perf` | PATCH | Performance improvement |
| `test` | none | Adding/updating tests |
| `build` | none | Build system changes |
| `ci` | none | CI configuration changes |
| `chore` | PATCH | Other changes |

**Breaking changes:** Add `!` after type OR include `BREAKING CHANGE:` in footer → MAJOR bump

### When Committing Changes

**IMPORTANT:** When creating a commit, Claude MUST:

1. **Determine version bump** based on commit type(s) in this session:
   - Any `BREAKING CHANGE:` or `!` → bump MAJOR, reset MINOR and PATCH to 0
   - Any `feat:` (without breaking) → bump MINOR, reset PATCH to 0
   - Only `fix:`, `refactor:`, `docs:`, `style:`, `perf:`, `chore:` → bump PATCH
   - Only `test:`, `build:`, `ci:` → NO version bump

2. **Update version file** (`apps/portal/lib/version.ts`):
   - Update `major`, `minor`, or `patch` number
   - Update `buildDate` to today's date (YYYY-MM-DD format)

3. **Update CHANGELOG.md**:
   - Add entry under `## [Unreleased]` section
   - Use format: `- <description> ([commit-type])`
   - When releasing: move unreleased items to new version header

### Example Workflow

```bash
# User asks: "Add a dark mode toggle"
# Claude implements feature, then commits:

# 1. Determine: feat: → MINOR bump (1.0.0 → 1.1.0)
# 2. Update version.ts: minor: 1, patch: 0, buildDate: '2024-01-25'
# 3. Update CHANGELOG.md under [Unreleased]:
#    ### Added
#    - Dark mode toggle in user settings
# 4. Commit with message: "feat(ui): add dark mode toggle"
```

### Version Display
Version is shown in the sidebar footer as: `v1.2.3 · Jan 24`
