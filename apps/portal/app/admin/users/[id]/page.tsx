'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

  const fetchData = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      ? permissions.profileIds.filter((p) => p !== profileId)
      : [...permissions.profileIds, profileId];
    savePermissions({ profileIds: newProfileIds });
  };

  const grantTool = (toolId: string) => {
    if (!permissions) return;
    const newGranted = [...permissions.grantedTools, toolId];
    const newRevoked = permissions.revokedTools.filter((t) => t !== toolId);
    savePermissions({ grantedTools: newGranted, revokedTools: newRevoked });
  };

  const revokeTool = (toolId: string) => {
    if (!permissions) return;
    const newRevoked = [...permissions.revokedTools, toolId];
    const newGranted = permissions.grantedTools.filter((t) => t !== toolId);
    savePermissions({ grantedTools: newGranted, revokedTools: newRevoked });
  };

  const clearOverride = (toolId: string) => {
    if (!permissions) return;
    const newGranted = permissions.grantedTools.filter((t) => t !== toolId);
    const newRevoked = permissions.revokedTools.filter((t) => t !== toolId);
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
                  <Link href="/admin/profiles" className="underline">
                    Create one
                  </Link>
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
