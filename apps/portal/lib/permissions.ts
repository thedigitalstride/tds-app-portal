import { connectDB, Profile, UserPermissions, ClientAssignment, Client, User } from '@tds/database';
import type { UserRole, IClient } from '@tds/database';
import { getServerSession } from '@/lib/auth';
import { tools } from '@/lib/tools';
import { adminPages } from '@/lib/admin-pages';

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
 * Check if a role is admin or super-admin
 */
export function isAtLeastAdmin(role: UserRole): boolean {
  return role === 'admin' || role === 'super-admin';
}

/**
 * Check if a role is super-admin
 */
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super-admin';
}

/**
 * Check if a user can access a specific tool
 */
export async function canAccessTool(userId: string, toolId: string): Promise<boolean> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return false;

  // Super-admins can access all tools
  if (user.role === 'super-admin') return true;

  // Admins have access by default, but can be restricted via revokedTools
  if (user.role === 'admin') {
    const permissions = await UserPermissions.findOne({ userId });
    if (!permissions) return true; // No restrictions = full access
    return !permissions.revokedTools.includes(toolId);
  }

  // Regular users: existing logic
  const permissions = await UserPermissions.findOne({ userId });
  if (!permissions) return false;

  if (permissions.revokedTools.includes(toolId)) return false;
  if (permissions.grantedTools.includes(toolId)) return true;

  if (permissions.profileIds.length === 0) return false;

  const profiles = await Profile.find({ _id: { $in: permissions.profileIds } });
  return profiles.some(profile => profile.toolIds.includes(toolId));
}

/**
 * Get all tool IDs a user can access
 */
export async function getAccessibleTools(userId: string): Promise<string[]> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return [];

  // Super-admins can access all tools
  if (user.role === 'super-admin') {
    return tools.map(t => t.id);
  }

  // Admins: all tools minus revoked
  if (user.role === 'admin') {
    const permissions = await UserPermissions.findOne({ userId });
    if (!permissions) return tools.map(t => t.id);
    return tools.map(t => t.id).filter(id => !permissions.revokedTools.includes(id));
  }

  // Regular users: existing logic
  const permissions = await UserPermissions.findOne({ userId });
  if (!permissions) return [];

  const profileToolIds = new Set<string>();
  if (permissions.profileIds.length > 0) {
    const profiles = await Profile.find({ _id: { $in: permissions.profileIds } });
    profiles.forEach(profile => {
      profile.toolIds.forEach(id => profileToolIds.add(id));
    });
  }

  permissions.grantedTools.forEach(id => profileToolIds.add(id));
  permissions.revokedTools.forEach(id => profileToolIds.delete(id));

  return Array.from(profileToolIds);
}

/**
 * Check if a user can access a specific client
 */
export async function canAccessClient(userId: string, clientId: string): Promise<boolean> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return false;

  // Super-admins and admins can access all clients
  if (isAtLeastAdmin(user.role)) return true;

  const assignment = await ClientAssignment.findOne({ userId, clientId });
  return !!assignment;
}

/**
 * Get all clients a user can access
 */
export async function getAccessibleClients(userId: string): Promise<IClient[]> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return [];

  // Super-admins and admins can access all clients
  if (isAtLeastAdmin(user.role)) {
    return await Client.find({ isActive: true }).sort({ name: 1 });
  }

  const assignments = await ClientAssignment.find({ userId });
  const clientIds = assignments.map(a => a.clientId);

  if (clientIds.length === 0) return [];

  return await Client.find({ _id: { $in: clientIds }, isActive: true }).sort({ name: 1 });
}

/**
 * Check if a user can access a specific admin page
 */
export async function canAccessAdminPage(userId: string, pageId: string): Promise<boolean> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return false;

  // Super-admins can access all admin pages
  if (user.role === 'super-admin') return true;

  // Admins have access by default, but can be restricted via revokedTools
  if (user.role === 'admin') {
    const permissions = await UserPermissions.findOne({ userId });
    if (!permissions) return true; // No restrictions = full access
    return !permissions.revokedTools.includes(pageId);
  }

  // Regular users cannot access admin pages
  return false;
}

/**
 * Get all admin page IDs a user can access
 */
export async function getAccessibleAdminPages(userId: string): Promise<string[]> {
  await connectDB();

  const user = await User.findById(userId);
  if (!user) return [];

  // Super-admins can access all admin pages
  if (user.role === 'super-admin') {
    return adminPages.map(p => p.id);
  }

  // Admins: all pages minus revoked
  if (user.role === 'admin') {
    const permissions = await UserPermissions.findOne({ userId });
    if (!permissions) return adminPages.map(p => p.id);
    return adminPages.map(p => p.id).filter(id => !permissions.revokedTools.includes(id));
  }

  // Regular users: no admin pages
  return [];
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
 * Middleware: Require admin role (admin or super-admin)
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (!isAtLeastAdmin(session.user.role)) throw new ForbiddenError();
  return session;
}

/**
 * Middleware: Require super-admin role
 */
export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (!isSuperAdmin(session.user.role)) throw new ForbiddenError();
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
