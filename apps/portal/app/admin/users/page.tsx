'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Shield, User as UserIcon, Settings2, Crown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Skeleton,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@tds/ui';

type UserRole = 'super-admin' | 'admin' | 'user';

interface User {
  _id: string;
  email: string;
  name: string;
  image?: string;
  role: UserRole;
  createdAt: string;
}

function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'super-admin':
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
          <Crown className="mr-1 h-3 w-3" /> Super Admin
        </Badge>
      );
    case 'admin':
      return (
        <Badge variant="default">
          <Shield className="mr-1 h-3 w-3" /> Admin
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <UserIcon className="mr-1 h-3 w-3" /> User
        </Badge>
      );
  }
}

export default function UserManagementPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const viewerRole = session?.user?.role as UserRole | undefined;
  const isSuperAdmin = viewerRole === 'super-admin';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async (userId: string, newRole: UserRole) => {
    if (userId === session?.user?.id) {
      alert('You cannot change your own role.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const getAvailableRoles = (targetUser: User): { label: string; role: UserRole }[] => {
    if (targetUser._id === session?.user?.id) return [];

    const roles: { label: string; role: UserRole }[] = [];

    if (isSuperAdmin) {
      // Super admin can set any role
      if (targetUser.role !== 'super-admin') roles.push({ label: 'Make Super Admin', role: 'super-admin' });
      if (targetUser.role !== 'admin') roles.push({ label: 'Make Admin', role: 'admin' });
      if (targetUser.role !== 'user') roles.push({ label: 'Make User', role: 'user' });
    } else {
      // Admin can only toggle regular users to admin and vice versa
      // Cannot touch super-admins or other admins
      if (targetUser.role === 'user') {
        roles.push({ label: 'Make Admin', role: 'admin' });
      }
    }

    return roles;
  };

  // Should we show the permissions button for this target user?
  const canManagePermissions = (targetUser: User): boolean => {
    if (targetUser._id === session?.user?.id) return false;
    // Super admin can manage anyone's permissions
    if (isSuperAdmin) return true;
    // Admin can only manage regular user permissions
    if (viewerRole === 'admin' && targetUser.role === 'user') return true;
    return false;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">User Management</h1>
        <p className="mt-1 text-neutral-500">
          Manage team members and their access levels
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            All users with @thedigitalstride.co.uk email addresses who have signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const availableRoles = getAvailableRoles(user);
                  return (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            {user.image && <AvatarImage src={user.image} alt={user.name} />}
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                          {user._id === session?.user?.id && (
                            <Badge variant="outline" className="ml-2">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-500">{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-neutral-500">
                        {new Date(user.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManagePermissions(user) && (
                            <Link
                              href={`/admin/users/${user._id}`}
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900 h-8 px-3"
                            >
                              <Settings2 className="mr-1 h-3 w-3" />
                              Permissions
                            </Link>
                          )}
                          {availableRoles.length === 1 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => changeRole(user._id, availableRoles[0].role)}
                            >
                              {availableRoles[0].label}
                            </Button>
                          ) : availableRoles.length > 1 ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Change Role
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {availableRoles.map((r) => (
                                  <DropdownMenuItem
                                    key={r.role}
                                    onClick={() => changeRole(user._id, r.role)}
                                  >
                                    {r.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
