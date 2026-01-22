# RBAC Design: Profile-Based Access Control

**Date:** 2025-01-20
**Status:** Approved
**Author:** Claude (via brainstorming session)

## Overview

A flexible Role-Based Access Control system for the TDS App Portal that supports:

- Two-tier hierarchy: Admin → User
- Named profiles that grant access to tool sets
- Per-user overrides (grant/revoke individual tools)
- Client assignment model (users see only assigned clients)
- Admin full visibility across all data

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hierarchy | Two-tier (Admin/User) | Simple, profiles handle tool access |
| Tool access | Profile-based with overrides | Flexible without complexity |
| Data access | Assigned clients | Users see only their work |
| Admin visibility | Full | Admins need oversight |
| New tool default | Admin-only | Secure by default |
| Permission caching | None (query per request) | Simplicity first, optimize later |

## Data Models

### Profile

```typescript
// packages/database/src/models/profile.ts
{
  _id: ObjectId,
  name: string,              // "SEO Specialist", "Content Manager"
  description: string,       // Human-readable description
  toolIds: string[],         // ["meta-tag-analyser", "keyword-tracker"]
  isDefault: boolean,        // Assigned to new users automatically?
  createdBy: ObjectId,       // Admin who created it
  createdAt: Date,
  updatedAt: Date
}
```

### UserPermissions

```typescript
// packages/database/src/models/user-permissions.ts
{
  _id: ObjectId,
  userId: ObjectId,          // Reference to User
  profileIds: ObjectId[],    // Assigned profiles
  grantedTools: string[],    // Extra tools beyond profiles
  revokedTools: string[],    // Tools removed despite profiles
  createdAt: Date,
  updatedAt: Date
}
```

### ClientAssignment

```typescript
// packages/database/src/models/client-assignment.ts
{
  _id: ObjectId,
  userId: ObjectId,          // User who has access
  clientId: ObjectId,        // Client they can access
  assignedBy: ObjectId,      // Admin who assigned
  assignedAt: Date
}
```

### User Model

No changes. Keep existing `role: 'admin' | 'user'`. Role controls admin functions; profiles control tool access.

## Permission Resolution Logic

### Tool Access

```
1. Is user an admin?
   → YES: Grant access to ALL tools
   → NO: Continue...

2. Is tool in user's revokedTools?
   → YES: Deny access (override wins)
   → NO: Continue...

3. Is tool in user's grantedTools?
   → YES: Grant access (override wins)
   → NO: Continue...

4. Is tool in ANY of user's assigned profiles?
   → YES: Grant access
   → NO: Deny access
```

### Client Access

```
1. Is user an admin?
   → YES: Return all clients
   → NO: Return only clients from ClientAssignment
```

## API Functions

```typescript
// apps/portal/lib/permissions.ts

// Check if user can access a specific tool
async function canAccessTool(userId: string, toolId: string): Promise<boolean>

// Get all tool IDs user can access
async function getAccessibleTools(userId: string): Promise<string[]>

// Get all clients user can access
async function getAccessibleClients(userId: string): Promise<Client[]>

// Check if user can access a specific client
async function canAccessClient(userId: string, clientId: string): Promise<boolean>
```

## API Protection Patterns

### Tool Access Guard

```typescript
export async function requireToolAccess(toolId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new UnauthorizedError();

  const hasAccess = await canAccessTool(session.user.id, toolId);
  if (!hasAccess) throw new ForbiddenError();

  return session;
}
```

### Client Access Guard

```typescript
export async function requireClientAccess(clientId: string) {
  const session = await getServerSession(authOptions);
  if (!session) throw new UnauthorizedError();

  const hasAccess = await canAccessClient(session.user.id, clientId);
  if (!hasAccess) throw new ForbiddenError();

  return session;
}
```

### Usage in Routes

```typescript
// Tool-specific API route
export async function GET(req, { params }) {
  const session = await requireToolAccess(params.toolId);
  // ... handle request
}

// Client-specific API route
export async function GET(req, { params }) {
  const session = await requireClientAccess(params.clientId);
  // ... handle request
}

// List endpoints return filtered data
export async function GET() {
  const session = await requireAuth();
  const clients = await getAccessibleClients(session.user.id);
  return Response.json(clients);
}
```

## Admin UI

### New Pages

| Route | Purpose |
|-------|---------|
| `/admin/profiles` | List/create/delete profiles |
| `/admin/profiles/[id]` | Edit profile (assign tools) |
| `/admin/users/[id]` | User permissions & client assignments |

### User Permissions UI Layout

```
┌─────────────────────────────────────────────┐
│ User: Jane Smith                            │
│ Role: User                                  │
├─────────────────────────────────────────────┤
│ Profiles: [SEO Specialist ×] [+ Add]        │
├─────────────────────────────────────────────┤
│ Tool Access:                                │
│ ✅ Meta Tag Analyser    (from profile)      │
│ ✅ Keyword Tracker      (from profile)      │
│ ⛔ Bulk Scanner         (revoked)           │
│ ✅ Content Audit        (granted)           │
│                         [+ Grant Tool]      │
├─────────────────────────────────────────────┤
│ Assigned Clients:                           │
│ • Acme Corp            [×]                  │
│ • TechStart Ltd        [×]                  │
│                        [+ Assign Client]    │
└─────────────────────────────────────────────┘
```

## Dashboard Changes

### Tool Filtering

```typescript
// Server component
const session = await getServerSession(authOptions);
const accessibleToolIds = await getAccessibleTools(session.user.id);
const visibleTools = tools.filter(t => accessibleToolIds.includes(t.id));
```

### Client Filtering

```typescript
// API returns only accessible clients
const clients = await getAccessibleClients(session.user.id);
```

### Tool Page Protection

```typescript
export default async function ToolPage({ params }) {
  const session = await getServerSession(authOptions);
  const hasAccess = await canAccessTool(session.user.id, params.tool);

  if (!hasAccess) {
    redirect('/dashboard?error=no-access');
  }
  // Render tool...
}
```

### Empty States

- No tools: "No tools available. Contact your admin to request access."
- No clients: "No clients assigned. Contact your admin to get started."

## Migration & Rollout

### Phase 1: Add Models (No Breaking Changes)

1. Create `Profile`, `UserPermissions`, `ClientAssignment` models
2. Add permission functions that return "allow all" by default
3. Deploy - everything works as before

### Phase 2: Build Admin UI

1. Create `/admin/profiles` page
2. Enhance `/admin/users/[id]` with permission management
3. Admins start creating profiles and assigning users
4. No enforcement yet

### Phase 3: Enable Tool Filtering

1. Update dashboard to filter tools
2. Add tool page access checks
3. **Pre-requisite:** Create "Default" profile first!

### Phase 4: Enable Client Filtering

1. Update client API to filter by assignments
2. **Pre-requisite:** Assign existing clients to users first
3. Admins retain full visibility

### Rollback Safety

- Each phase is independently deployable
- Optional feature flag: `ENABLE_RBAC=true` in env
- Disable flag = all users see everything

### Initial Setup Checklist

1. [ ] Create "Full Access" profile with all tools
2. [ ] Create role-specific profiles (SEO, Content, etc.)
3. [ ] Assign all existing clients to appropriate users
4. [ ] Assign profiles to all existing users
5. [ ] Enable enforcement

## File Structure

```
apps/portal/
├── lib/
│   ├── auth.ts                    # Existing (unchanged)
│   ├── permissions.ts             # NEW: Permission logic
│   └── tools.ts                   # Existing (unchanged)
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── profiles/          # NEW: Profile CRUD
│   │   │   └── users/
│   │   │       └── [id]/
│   │   │           ├── permissions/   # NEW: User permissions
│   │   │           └── clients/       # NEW: Client assignments
│   │   └── clients/               # Updated: filtered access
│   ├── admin/
│   │   ├── profiles/              # NEW: Profile management UI
│   │   └── users/
│   │       └── [id]/              # Updated: permissions UI
│   └── dashboard/                 # Updated: filtered tools
packages/database/src/models/
├── profile.ts                     # NEW
├── user-permissions.ts            # NEW
├── client-assignment.ts           # NEW
└── index.ts                       # Updated: export new models
```

## Future Considerations

- **Permission caching:** Add Redis/session caching if queries become slow
- **Audit logging:** Track permission changes for compliance
- **Bulk operations:** Assign multiple clients/profiles at once
- **Permission inheritance:** Profiles that inherit from other profiles
- **Time-based access:** Temporary access grants with expiry
