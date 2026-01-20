# RBAC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement profile-based access control with tool permissions, user overrides, and client assignments.

**Architecture:** Two-tier hierarchy (Admin/User) with named profiles granting tool access. Per-user overrides (grant/revoke) take precedence over profiles. Admins see all data; users see only assigned clients.

**Tech Stack:** Next.js 15, MongoDB/Mongoose, NextAuth.js, TypeScript, React 19

**Note:** This project has no test infrastructure. Verification uses `pnpm type-check` and manual testing.

---

## Phase 1: Database Models

### Task 1: Create Profile Model

**Files:**
- Create: `packages/database/src/models/profile.ts`
- Modify: `packages/database/src/index.ts`

**Step 1: Create the Profile model**

Create `packages/database/src/models/profile.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProfile extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  toolIds: string[];
  isDefault: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    toolIds: {
      type: [String],
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

profileSchema.index({ name: 1 });
profileSchema.index({ isDefault: 1 });

export const Profile: Model<IProfile> =
  mongoose.models.Profile || mongoose.model<IProfile>('Profile', profileSchema);
```

**Step 2: Export from index**

Add to `packages/database/src/index.ts`:

```typescript
export { Profile, type IProfile } from './models/profile';
```

**Step 3: Verify with type-check**

Run: `cd /Users/ianhancock/My\ Repos/tds-app-portal/.worktrees/feature-rbac && pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add packages/database/src/models/profile.ts packages/database/src/index.ts
git commit -m "feat(database): add Profile model for RBAC"
```

---

### Task 2: Create UserPermissions Model

**Files:**
- Create: `packages/database/src/models/user-permissions.ts`
- Modify: `packages/database/src/index.ts`

**Step 1: Create the UserPermissions model**

Create `packages/database/src/models/user-permissions.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserPermissions extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileIds: mongoose.Types.ObjectId[];
  grantedTools: string[];
  revokedTools: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userPermissionsSchema = new Schema<IUserPermissions>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    profileIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Profile',
      default: [],
    },
    grantedTools: {
      type: [String],
      default: [],
    },
    revokedTools: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userPermissionsSchema.index({ userId: 1 });

export const UserPermissions: Model<IUserPermissions> =
  mongoose.models.UserPermissions ||
  mongoose.model<IUserPermissions>('UserPermissions', userPermissionsSchema);
```

**Step 2: Export from index**

Add to `packages/database/src/index.ts`:

```typescript
export { UserPermissions, type IUserPermissions } from './models/user-permissions';
```

**Step 3: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add packages/database/src/models/user-permissions.ts packages/database/src/index.ts
git commit -m "feat(database): add UserPermissions model for RBAC"
```

---

### Task 3: Create ClientAssignment Model

**Files:**
- Create: `packages/database/src/models/client-assignment.ts`
- Modify: `packages/database/src/index.ts`

**Step 1: Create the ClientAssignment model**

Create `packages/database/src/models/client-assignment.ts`:

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClientAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
}

const clientAssignmentSchema = new Schema<IClientAssignment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound unique index: user can only be assigned to a client once
clientAssignmentSchema.index({ userId: 1, clientId: 1 }, { unique: true });
clientAssignmentSchema.index({ userId: 1 });
clientAssignmentSchema.index({ clientId: 1 });

export const ClientAssignment: Model<IClientAssignment> =
  mongoose.models.ClientAssignment ||
  mongoose.model<IClientAssignment>('ClientAssignment', clientAssignmentSchema);
```

**Step 2: Export from index**

Add to `packages/database/src/index.ts`:

```typescript
export { ClientAssignment, type IClientAssignment } from './models/client-assignment';
```

**Step 3: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add packages/database/src/models/client-assignment.ts packages/database/src/index.ts
git commit -m "feat(database): add ClientAssignment model for RBAC"
```

---

## Phase 2: Permission Logic

### Task 4: Create Permission Utilities

**Files:**
- Create: `apps/portal/lib/permissions.ts`

**Step 1: Create the permissions module**

Create `apps/portal/lib/permissions.ts`:

```typescript
import { connectDB, Profile, UserPermissions, ClientAssignment, Client, User } from '@tds/database';
import { getServerSession } from '@/lib/auth';
import { tools } from '@/lib/tools';
import type { IClient } from '@tds/database';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Check if a user can access a specific tool
 */
export async function canAccessTool(userId: string, toolId: string): Promise<boolean> {
  await connectDB();

  // Get user to check admin status
  const user = await User.findById(userId);
  if (!user) return false;

  // Admins can access all tools
  if (user.role === 'admin') return true;

  // Get user permissions
  const permissions = await UserPermissions.findOne({ userId });
  if (!permissions) return false;

  // Check revoked first (override wins)
  if (permissions.revokedTools.includes(toolId)) return false;

  // Check granted (override wins)
  if (permissions.grantedTools.includes(toolId)) return true;

  // Check profiles
  if (permissions.profileIds.length === 0) return false;

  const profiles = await Profile.find({ _id: { $in: permissions.profileIds } });
  return profiles.some(profile => profile.toolIds.includes(toolId));
}

/**
 * Get all tool IDs a user can access
 */
export async function getAccessibleTools(userId: string): Promise<string[]> {
  await connectDB();

  // Get user to check admin status
  const user = await User.findById(userId);
  if (!user) return [];

  // Admins can access all tools
  if (user.role === 'admin') {
    return tools.map(t => t.id);
  }

  // Get user permissions
  const permissions = await UserPermissions.findOne({ userId });
  if (!permissions) return [];

  // Collect tools from profiles
  const profileToolIds = new Set<string>();
  if (permissions.profileIds.length > 0) {
    const profiles = await Profile.find({ _id: { $in: permissions.profileIds } });
    profiles.forEach(profile => {
      profile.toolIds.forEach(id => profileToolIds.add(id));
    });
  }

  // Add granted tools
  permissions.grantedTools.forEach(id => profileToolIds.add(id));

  // Remove revoked tools
  permissions.revokedTools.forEach(id => profileToolIds.delete(id));

  return Array.from(profileToolIds);
}

/**
 * Check if a user can access a specific client
 */
export async function canAccessClient(userId: string, clientId: string): Promise<boolean> {
  await connectDB();

  // Get user to check admin status
  const user = await User.findById(userId);
  if (!user) return false;

  // Admins can access all clients
  if (user.role === 'admin') return true;

  // Check assignment
  const assignment = await ClientAssignment.findOne({ userId, clientId });
  return !!assignment;
}

/**
 * Get all clients a user can access
 */
export async function getAccessibleClients(userId: string): Promise<IClient[]> {
  await connectDB();

  // Get user to check admin status
  const user = await User.findById(userId);
  if (!user) return [];

  // Admins can access all clients
  if (user.role === 'admin') {
    return Client.find({ isActive: true }).sort({ name: 1 });
  }

  // Get assigned client IDs
  const assignments = await ClientAssignment.find({ userId });
  const clientIds = assignments.map(a => a.clientId);

  if (clientIds.length === 0) return [];

  return Client.find({ _id: { $in: clientIds }, isActive: true }).sort({ name: 1 });
}

/**
 * Middleware: Require authentication
 */
export async function requireAuth() {
  const session = await getServerSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

/**
 * Middleware: Require admin role
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw new ForbiddenError();
  return session;
}

/**
 * Middleware: Require tool access
 */
export async function requireToolAccess(toolId: string) {
  const session = await requireAuth();
  const hasAccess = await canAccessTool(session.user.id, toolId);
  if (!hasAccess) throw new ForbiddenError(`No access to tool: ${toolId}`);
  return session;
}

/**
 * Middleware: Require client access
 */
export async function requireClientAccess(clientId: string) {
  const session = await requireAuth();
  const hasAccess = await canAccessClient(session.user.id, clientId);
  if (!hasAccess) throw new ForbiddenError(`No access to client: ${clientId}`);
  return session;
}
```

**Step 2: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 3: Commit**

```bash
git add apps/portal/lib/permissions.ts
git commit -m "feat(portal): add permission utilities for RBAC"
```

---

## Phase 3: Admin API Routes

### Task 5: Create Profile CRUD API

**Files:**
- Create: `apps/portal/app/api/admin/profiles/route.ts`
- Create: `apps/portal/app/api/admin/profiles/[id]/route.ts`

**Step 1: Create profiles list/create route**

Create `apps/portal/app/api/admin/profiles/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Profile } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const profiles = await Profile.find().sort({ name: 1 });
    return NextResponse.json(profiles);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch profiles:', error);
    return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    await connectDB();

    const profile = await Profile.create({
      name: body.name,
      description: body.description || '',
      toolIds: body.toolIds || [],
      isDefault: body.isDefault || false,
      createdBy: session.user.id,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to create profile:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
```

**Step 2: Create profile detail/update/delete route**

Create `apps/portal/app/api/admin/profiles/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Profile, UserPermissions } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await connectDB();
    const profile = await Profile.findById(id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    await connectDB();
    const profile = await Profile.findByIdAndUpdate(
      id,
      {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.toolIds && { toolIds: body.toolIds }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
      { new: true }
    );

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await connectDB();

    // Check if any users are assigned to this profile
    const usersWithProfile = await UserPermissions.countDocuments({
      profileIds: id,
    });

    if (usersWithProfile > 0) {
      return NextResponse.json(
        { error: `Cannot delete profile: ${usersWithProfile} user(s) assigned` },
        { status: 400 }
      );
    }

    const profile = await Profile.findByIdAndDelete(id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to delete profile:', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
```

**Step 3: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add apps/portal/app/api/admin/profiles/
git commit -m "feat(api): add Profile CRUD endpoints"
```

---

### Task 6: Create User Permissions API

**Files:**
- Create: `apps/portal/app/api/admin/users/[id]/permissions/route.ts`

**Step 1: Create user permissions route**

Create `apps/portal/app/api/admin/users/[id]/permissions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, UserPermissions, Profile } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError, getAccessibleTools } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await params;

    await connectDB();

    // Get or create user permissions
    let permissions = await UserPermissions.findOne({ userId });
    if (!permissions) {
      permissions = await UserPermissions.create({
        userId,
        profileIds: [],
        grantedTools: [],
        revokedTools: [],
      });
    }

    // Get assigned profiles
    const profiles = await Profile.find({ _id: { $in: permissions.profileIds } });

    // Get effective tool access
    const accessibleTools = await getAccessibleTools(userId);

    return NextResponse.json({
      permissions,
      profiles,
      accessibleTools,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch user permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch user permissions' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await params;
    const body = await request.json();

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (body.profileIds !== undefined) updateData.profileIds = body.profileIds;
    if (body.grantedTools !== undefined) updateData.grantedTools = body.grantedTools;
    if (body.revokedTools !== undefined) updateData.revokedTools = body.revokedTools;

    const permissions = await UserPermissions.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true }
    );

    // Get updated effective tool access
    const accessibleTools = await getAccessibleTools(userId);

    return NextResponse.json({
      permissions,
      accessibleTools,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to update user permissions:', error);
    return NextResponse.json({ error: 'Failed to update user permissions' }, { status: 500 });
  }
}
```

**Step 2: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 3: Commit**

```bash
git add apps/portal/app/api/admin/users/[id]/permissions/
git commit -m "feat(api): add user permissions management endpoint"
```

---

### Task 7: Create Client Assignment API

**Files:**
- Create: `apps/portal/app/api/admin/users/[id]/clients/route.ts`

**Step 1: Create client assignment route**

Create `apps/portal/app/api/admin/users/[id]/clients/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ClientAssignment, Client } from '@tds/database';
import { requireAdmin, UnauthorizedError, ForbiddenError } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: userId } = await params;

    await connectDB();

    const assignments = await ClientAssignment.find({ userId }).populate('clientId');
    const clients = assignments
      .filter(a => a.clientId)
      .map(a => a.clientId);

    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to fetch client assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch client assignments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id: userId } = await params;
    const body = await request.json();

    await connectDB();

    // Verify client exists
    const client = await Client.findById(body.clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Create assignment (will fail if duplicate due to unique index)
    try {
      await ClientAssignment.create({
        userId,
        clientId: body.clientId,
        assignedBy: session.user.id,
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
        return NextResponse.json({ error: 'Client already assigned' }, { status: 400 });
      }
      throw err;
    }

    // Return updated list
    const assignments = await ClientAssignment.find({ userId }).populate('clientId');
    const clients = assignments
      .filter(a => a.clientId)
      .map(a => a.clientId);

    return NextResponse.json(clients, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to assign client:', error);
    return NextResponse.json({ error: 'Failed to assign client' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    await connectDB();

    await ClientAssignment.findOneAndDelete({ userId, clientId });

    // Return updated list
    const assignments = await ClientAssignment.find({ userId }).populate('clientId');
    const clients = assignments
      .filter(a => a.clientId)
      .map(a => a.clientId);

    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Failed to unassign client:', error);
    return NextResponse.json({ error: 'Failed to unassign client' }, { status: 500 });
  }
}
```

**Step 2: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 3: Commit**

```bash
git add apps/portal/app/api/admin/users/[id]/clients/
git commit -m "feat(api): add client assignment management endpoint"
```

---

## Phase 4: Update Existing APIs

### Task 8: Update Clients API to Filter by Permissions

**Files:**
- Modify: `apps/portal/app/api/clients/route.ts`

**Step 1: Update GET to use permissions**

Replace `apps/portal/app/api/clients/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, Client } from '@tds/database';
import {
  requireAuth,
  getAccessibleClients,
  UnauthorizedError,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();

    await connectDB();
    const clients = await getAccessibleClients(session.user.id);

    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    await connectDB();

    const client = await Client.create({
      ...body,
      createdBy: session.user.id,
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to create client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
```

**Step 2: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 3: Commit**

```bash
git add apps/portal/app/api/clients/route.ts
git commit -m "feat(api): filter clients by user permissions"
```

---

### Task 9: Update Client Detail API to Check Permissions

**Files:**
- Modify: `apps/portal/app/api/clients/[id]/route.ts`

**Step 1: Read current file**

Read `apps/portal/app/api/clients/[id]/route.ts` first.

**Step 2: Update to check client access**

Update to use `requireClientAccess` for GET, PATCH, DELETE operations. Add proper error handling for UnauthorizedError and ForbiddenError.

**Step 3: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add apps/portal/app/api/clients/[id]/route.ts
git commit -m "feat(api): add permission checks to client detail endpoint"
```

---

## Phase 5: Admin UI - Profiles

### Task 10: Create Profiles List Page

**Files:**
- Create: `apps/portal/app/admin/profiles/page.tsx`
- Create: `apps/portal/app/admin/profiles/layout.tsx`

**Step 1: Create layout with admin protection**

Create `apps/portal/app/admin/profiles/layout.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';

export default async function ProfilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
```

**Step 2: Create profiles list page**

Create `apps/portal/app/admin/profiles/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge, Input } from '@tds/ui';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';

interface Profile {
  _id: string;
  name: string;
  description: string;
  toolIds: string[];
  isDefault: boolean;
}

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/admin/profiles');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile),
      });
      if (res.ok) {
        setNewProfile({ name: '', description: '' });
        setShowCreate(false);
        fetchProfiles();
      }
    } catch (error) {
      console.error('Failed to create profile:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile?')) return;
    try {
      const res = await fetch(`/api/admin/profiles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProfiles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete profile');
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permission Profiles
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage tool access profiles for users
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Profile
        </Button>
      </div>

      {showCreate && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create New Profile</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={newProfile.name}
                onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                placeholder="e.g., SEO Specialist"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={newProfile.description}
                onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                placeholder="Brief description of this profile"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Profile'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {profiles.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No profiles created yet. Create your first profile to get started.
          </Card>
        ) : (
          profiles.map((profile) => (
            <Card key={profile._id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{profile.name}</h3>
                    {profile.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {profile.description || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {profile.toolIds.length} tool(s) assigned
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/profiles/${profile._id}`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(profile._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add apps/portal/app/admin/profiles/
git commit -m "feat(ui): add profiles list page"
```

---

### Task 11: Create Profile Edit Page

**Files:**
- Create: `apps/portal/app/admin/profiles/[id]/page.tsx`

**Step 1: Create profile edit page**

Create `apps/portal/app/admin/profiles/[id]/page.tsx`:

```typescript
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Checkbox } from '@tds/ui';
import { ArrowLeft, Save } from 'lucide-react';
import { tools } from '@/lib/tools';

interface Profile {
  _id: string;
  name: string;
  description: string;
  toolIds: string[];
  isDefault: boolean;
}

export default function ProfileEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/admin/profiles/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/profiles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          description: profile.description,
          toolIds: profile.toolIds,
          isDefault: profile.isDefault,
        }),
      });
      if (res.ok) {
        router.push('/admin/profiles');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleTool = (toolId: string) => {
    if (!profile) return;
    const newToolIds = profile.toolIds.includes(toolId)
      ? profile.toolIds.filter((id) => id !== toolId)
      : [...profile.toolIds, toolId];
    setProfile({ ...profile, toolIds: newToolIds });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <p>Profile not found</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/admin/profiles')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Profiles
      </Button>

      <h1 className="text-2xl font-bold mb-8">Edit Profile</h1>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Profile Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={profile.isDefault}
                onCheckedChange={(checked) =>
                  setProfile({ ...profile, isDefault: checked === true })
                }
              />
              <label htmlFor="isDefault" className="text-sm">
                Assign to new users by default
              </label>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Tool Access</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Select which tools users with this profile can access.
          </p>
          <div className="space-y-3">
            {tools.map((tool) => (
              <div key={tool.id} className="flex items-center gap-3">
                <Checkbox
                  id={tool.id}
                  checked={profile.toolIds.includes(tool.id)}
                  onCheckedChange={() => toggleTool(tool.id)}
                />
                <div>
                  <label htmlFor={tool.id} className="text-sm font-medium cursor-pointer">
                    {tool.name}
                  </label>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 3: Commit**

```bash
git add apps/portal/app/admin/profiles/[id]/
git commit -m "feat(ui): add profile edit page with tool selection"
```

---

## Phase 6: Admin UI - User Permissions

### Task 12: Create User Permissions Page

**Files:**
- Create: `apps/portal/app/admin/users/[id]/page.tsx`

**Step 1: Create user permissions management page**

Create `apps/portal/app/admin/users/[id]/page.tsx`:

```typescript
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge, Checkbox } from '@tds/ui';
import { ArrowLeft, Plus, X, Check, Ban } from 'lucide-react';
import { tools } from '@/lib/tools';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Profile {
  _id: string;
  name: string;
  toolIds: string[];
}

interface UserPermissions {
  profileIds: string[];
  grantedTools: string[];
  revokedTools: string[];
}

interface Client {
  _id: string;
  name: string;
  website: string;
}

export default function UserPermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [assignedClients, setAssignedClients] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [accessibleTools, setAccessibleTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [userRes, permRes, profilesRes, clientsRes, assignedRes] = await Promise.all([
        fetch(`/api/admin/users/${id}`),
        fetch(`/api/admin/users/${id}/permissions`),
        fetch('/api/admin/profiles'),
        fetch('/api/clients'),
        fetch(`/api/admin/users/${id}/clients`),
      ]);

      if (userRes.ok) setUser(await userRes.json());
      if (permRes.ok) {
        const permData = await permRes.json();
        setPermissions(permData.permissions);
        setAccessibleTools(permData.accessibleTools);
      }
      if (profilesRes.ok) setAllProfiles(await profilesRes.json());
      if (clientsRes.ok) setAllClients(await clientsRes.json());
      if (assignedRes.ok) setAssignedClients(await assignedRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePermissions = async (updates: Partial<UserPermissions>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions);
        setAccessibleTools(data.accessibleTools);
      }
    } catch (error) {
      console.error('Failed to save permissions:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleProfile = (profileId: string) => {
    if (!permissions) return;
    const newProfileIds = permissions.profileIds.includes(profileId)
      ? permissions.profileIds.filter((id) => id !== profileId)
      : [...permissions.profileIds, profileId];
    savePermissions({ profileIds: newProfileIds });
  };

  const grantTool = (toolId: string) => {
    if (!permissions) return;
    const newGranted = [...permissions.grantedTools, toolId];
    const newRevoked = permissions.revokedTools.filter((id) => id !== toolId);
    savePermissions({ grantedTools: newGranted, revokedTools: newRevoked });
  };

  const revokeTool = (toolId: string) => {
    if (!permissions) return;
    const newRevoked = [...permissions.revokedTools, toolId];
    const newGranted = permissions.grantedTools.filter((id) => id !== toolId);
    savePermissions({ grantedTools: newGranted, revokedTools: newRevoked });
  };

  const clearOverride = (toolId: string) => {
    if (!permissions) return;
    const newGranted = permissions.grantedTools.filter((id) => id !== toolId);
    const newRevoked = permissions.revokedTools.filter((id) => id !== toolId);
    savePermissions({ grantedTools: newGranted, revokedTools: newRevoked });
  };

  const assignClient = async (clientId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) {
        setAssignedClients(await res.json());
      }
    } catch (error) {
      console.error('Failed to assign client:', error);
    }
  };

  const unassignClient = async (clientId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/clients?clientId=${clientId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAssignedClients(await res.json());
      }
    } catch (error) {
      console.error('Failed to unassign client:', error);
    }
  };

  const getToolStatus = (toolId: string): 'granted' | 'revoked' | 'profile' | 'none' => {
    if (!permissions) return 'none';
    if (permissions.grantedTools.includes(toolId)) return 'granted';
    if (permissions.revokedTools.includes(toolId)) return 'revoked';
    if (accessibleTools.includes(toolId)) return 'profile';
    return 'none';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading user permissions...</div>
      </div>
    );
  }

  if (!user || !permissions) {
    return (
      <div className="p-8">
        <p>User not found</p>
      </div>
    );
  }

  const unassignedClients = allClients.filter(
    (c) => !assignedClients.some((ac) => ac._id === c._id)
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push('/admin/users')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Users
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground">{user.email}</p>
        <Badge className="mt-2">{user.role}</Badge>
      </div>

      {user.role === 'admin' ? (
        <Card className="p-6 bg-muted">
          <p className="text-muted-foreground">
            Admins have full access to all tools and clients. Permission settings
            do not apply.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Profiles Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Assigned Profiles</h2>
            <div className="space-y-2">
              {allProfiles.map((profile) => (
                <div key={profile._id} className="flex items-center gap-3">
                  <Checkbox
                    id={profile._id}
                    checked={permissions.profileIds.includes(profile._id)}
                    onCheckedChange={() => toggleProfile(profile._id)}
                    disabled={saving}
                  />
                  <label htmlFor={profile._id} className="cursor-pointer">
                    <span className="font-medium">{profile.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({profile.toolIds.length} tools)
                    </span>
                  </label>
                </div>
              ))}
              {allProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No profiles created yet.{' '}
                  <a href="/admin/profiles" className="underline">
                    Create one
                  </a>
                </p>
              )}
            </div>
          </Card>

          {/* Tool Access Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Tool Access</h2>
            <div className="space-y-3">
              {tools.map((tool) => {
                const status = getToolStatus(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      {status === 'granted' || status === 'profile' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Ban className="h-4 w-4 text-red-500" />
                      )}
                      <span>{tool.name}</span>
                      {status === 'granted' && (
                        <Badge variant="outline" className="text-xs">
                          granted
                        </Badge>
                      )}
                      {status === 'revoked' && (
                        <Badge variant="outline" className="text-xs">
                          revoked
                        </Badge>
                      )}
                      {status === 'profile' && (
                        <Badge variant="secondary" className="text-xs">
                          from profile
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {status !== 'granted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => grantTool(tool.id)}
                          disabled={saving}
                        >
                          Grant
                        </Button>
                      )}
                      {status !== 'revoked' && status !== 'none' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeTool(tool.id)}
                          disabled={saving}
                        >
                          Revoke
                        </Button>
                      )}
                      {(status === 'granted' || status === 'revoked') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => clearOverride(tool.id)}
                          disabled={saving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Client Assignments Section */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Assigned Clients</h2>
            <div className="space-y-2 mb-4">
              {assignedClients.map((client) => (
                <div
                  key={client._id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {client.website}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => unassignClient(client._id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {assignedClients.length === 0 && (
                <p className="text-sm text-muted-foreground">No clients assigned.</p>
              )}
            </div>
            {unassignedClients.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Add client:</p>
                <div className="flex flex-wrap gap-2">
                  {unassignedClients.map((client) => (
                    <Button
                      key={client._id}
                      size="sm"
                      variant="outline"
                      onClick={() => assignClient(client._id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {client.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 3: Commit**

```bash
git add apps/portal/app/admin/users/[id]/
git commit -m "feat(ui): add user permissions management page"
```

---

## Phase 7: Dashboard Integration

### Task 13: Update Dashboard to Filter Tools

**Files:**
- Modify: `apps/portal/app/dashboard/page.tsx`

**Step 1: Read current dashboard**

Read `apps/portal/app/dashboard/page.tsx` to understand current structure.

**Step 2: Update to filter tools by permission**

Add server-side tool filtering using `getAccessibleTools`. Show empty state if no tools accessible.

**Step 3: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add apps/portal/app/dashboard/page.tsx
git commit -m "feat(ui): filter dashboard tools by user permissions"
```

---

### Task 14: Update Tool Pages to Check Access

**Files:**
- Modify: `apps/portal/app/tools/meta-tag-analyser/page.tsx` (and any other tool pages)

**Step 1: Read current tool page**

Read the meta-tag-analyser page to understand current structure.

**Step 2: Add permission check**

Add server-side permission check using `canAccessTool`. Redirect to dashboard with error if no access.

**Step 3: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add apps/portal/app/tools/
git commit -m "feat(ui): add permission checks to tool pages"
```

---

## Phase 8: Navigation Updates

### Task 15: Add Profiles Link to Admin Navigation

**Files:**
- Modify: Navigation component (find and update admin nav)

**Step 1: Find navigation component**

Search for admin navigation menu component.

**Step 2: Add Profiles link**

Add link to `/admin/profiles` in admin navigation.

**Step 3: Verify with type-check**

Run: `pnpm type-check`
Expected: All 3 packages pass

**Step 4: Commit**

```bash
git add [navigation files]
git commit -m "feat(ui): add profiles link to admin navigation"
```

---

## Phase 9: Final Verification

### Task 16: Manual Testing Checklist

**Run dev server:**
```bash
cd /Users/ianhancock/My\ Repos/tds-app-portal/.worktrees/feature-rbac
pnpm dev
```

**Test scenarios:**

1. **Admin user:**
   - [ ] Can see all tools on dashboard
   - [ ] Can access all clients
   - [ ] Can access /admin/profiles
   - [ ] Can create/edit/delete profiles
   - [ ] Can manage user permissions at /admin/users/[id]
   - [ ] Can assign/unassign clients to users

2. **Regular user (no profiles):**
   - [ ] Dashboard shows "no tools available" message
   - [ ] No clients visible
   - [ ] Cannot access /admin/* pages

3. **Regular user (with profile):**
   - [ ] Only sees tools from assigned profile(s)
   - [ ] Only sees assigned clients
   - [ ] Granted tool overrides show correctly
   - [ ] Revoked tool overrides hide tools

**Step 2: Fix any issues found**

Address any bugs or issues discovered during testing.

**Step 3: Final commit**

```bash
git add .
git commit -m "fix: address issues from manual testing"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-3 | Database models (Profile, UserPermissions, ClientAssignment) |
| 2 | 4 | Permission utility functions |
| 3 | 5-7 | Admin API routes (profiles, user permissions, client assignments) |
| 4 | 8-9 | Update existing APIs for permission filtering |
| 5 | 10-11 | Admin UI for profiles |
| 6 | 12 | Admin UI for user permissions |
| 7 | 13-14 | Dashboard and tool page integration |
| 8 | 15 | Navigation updates |
| 9 | 16 | Manual testing and fixes |

**Total tasks:** 16
**Estimated commits:** 14-16
