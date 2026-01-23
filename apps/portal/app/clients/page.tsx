'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tds/ui';
import { tools, type Tool } from '@/lib/tools';
import { useClient } from '@/components/client-context';

interface ToolUsageData {
  toolId: string;
  count: number;
  lastUsed: string;
}

interface ClientToolUsage {
  [clientId: string]: {
    tools: ToolUsageData[];
  };
}

interface Client {
  _id: string;
  name: string;
  website: string;
  description?: string;
  contactEmail?: string;
  contactName?: string;
  isActive: boolean;
  toolUsage?: ToolUsageData[];
  // Page store settings
  pageFreshnessHours?: number;
  maxSnapshotsPerUrl?: number;
}

export default function ClientsPage() {
  const { refreshClients: refreshGlobalClients } = useClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
    contactEmail: '',
    contactName: '',
    pageFreshnessHours: 24,
    maxSnapshotsPerUrl: 10,
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const [clientsRes, toolUsageRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/clients/tool-usage'),
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        let toolUsage: ClientToolUsage = {};

        if (toolUsageRes.ok) {
          toolUsage = await toolUsageRes.json();
        }

        // Merge tool usage into clients
        const clientsWithToolUsage = clientsData.map((client: Client) => ({
          ...client,
          toolUsage: toolUsage[client._id]?.tools || [],
        }));

        setClients(clientsWithToolUsage);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingClient
        ? `/api/clients/${editingClient._id}`
        : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchClients();
        refreshGlobalClients(); // Update the global client list for sidebar
        setDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to save client:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchClients();
        refreshGlobalClients(); // Update the global client list for sidebar
      }
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      website: client.website,
      description: client.description || '',
      contactEmail: client.contactEmail || '',
      contactName: client.contactName || '',
      pageFreshnessHours: client.pageFreshnessHours ?? 24,
      maxSnapshotsPerUrl: client.maxSnapshotsPerUrl ?? 10,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      website: '',
      description: '',
      contactEmail: '',
      contactName: '',
      pageFreshnessHours: 24,
      maxSnapshotsPerUrl: 10,
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Clients</h1>
          <p className="mt-1 text-neutral-500">
            Manage your client list. Client data can be shared across tools.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-2 h-4 w-48" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-neutral-500">No clients yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add your first client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-start">
                      {client.name}
                      {client.isActive ? (
                        <Badge variant="success" className="ml-2">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-start">
                      <a
                        href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:underline"
                      >
                        {client.website}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(client)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(client._id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {client.description && (
                  <p className="text-sm text-neutral-600">{client.description}</p>
                )}
                {client.contactName && (
                  <p className="mt-2 text-sm text-neutral-500">
                    Contact: {client.contactName}
                    {client.contactEmail && ` (${client.contactEmail})`}
                  </p>
                )}
                {client.toolUsage && client.toolUsage.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${client.description || client.contactName ? 'mt-3 pt-3 border-t border-neutral-100' : ''}`}>
                    <TooltipProvider>
                      {client.toolUsage.map((usage) => {
                        const tool = tools.find((t) => t.id === usage.toolId);
                        if (!tool) return null;
                        const Icon = tool.icon;
                        const lastUsedDate = new Date(usage.lastUsed).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        return (
                          <Tooltip key={usage.toolId}>
                            <TooltipTrigger asChild>
                              <Link href={`${tool.href}?clientId=${client._id}`}>
                                <Badge
                                  variant="outline"
                                  className="cursor-pointer hover:bg-neutral-100 transition-colors"
                                >
                                  <Icon className="mr-1 h-3 w-3" />
                                  {tool.name}
                                  <span className="ml-1 text-neutral-400">({usage.count})</span>
                                </Badge>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Last used: {lastUsedDate}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? 'Update the client details below.'
                : 'Add a new client to your list. This data can be shared across tools.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Client Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Acme Ltd"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Website *</label>
                <Input
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="www.example.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the client"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Name</label>
                <Input
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData({ ...formData, contactName: e.target.value })
                  }
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Email</label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  placeholder="john@example.com"
                />
              </div>
              {/* Page Store Settings */}
              <div className="pt-4 border-t border-neutral-200">
                <p className="text-sm font-medium text-neutral-500 mb-3">Page Store Settings</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Cache Freshness (hours)</label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={formData.pageFreshnessHours}
                      onChange={(e) =>
                        setFormData({ ...formData, pageFreshnessHours: parseInt(e.target.value) || 24 })
                      }
                    />
                    <p className="text-xs text-neutral-400 mt-1">1-168 hours (default: 24)</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Snapshots per URL</label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.maxSnapshotsPerUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, maxSnapshotsPerUrl: parseInt(e.target.value) || 10 })
                      }
                    />
                    <p className="text-xs text-neutral-400 mt-1">1-100 snapshots (default: 10)</p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingClient ? 'Save Changes' : 'Add Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
