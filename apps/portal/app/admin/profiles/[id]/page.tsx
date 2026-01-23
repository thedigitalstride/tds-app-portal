'use client';

import { useState, useEffect, useCallback, use } from 'react';
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

  const fetchProfile = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
      ? profile.toolIds.filter((t) => t !== toolId)
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
