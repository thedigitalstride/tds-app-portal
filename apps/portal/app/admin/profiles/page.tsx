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
