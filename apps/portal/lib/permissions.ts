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
    return await Client.find({ isActive: true }).sort({ name: 1 });
  }

  // Get assigned client IDs
  const assignments = await ClientAssignment.find({ userId });
  const clientIds = assignments.map(a => a.clientId);

  if (clientIds.length === 0) return [];

  return await Client.find({ _id: { $in: clientIds }, isActive: true }).sort({ name: 1 });
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
