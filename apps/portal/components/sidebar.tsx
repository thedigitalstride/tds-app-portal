'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Wrench,
  Building2,
  X,
} from 'lucide-react';
import {
  cn,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Badge,
  TDSLogo,
  Skeleton,
} from '@tds/ui';
import { tools } from '@/lib/tools';
import { useClient } from './client-context';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
];

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const { clients, loadingClients, selectedClientId, setSelectedClientId, selectedClient } = useClient();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-neutral-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-neutral-200 px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <TDSLogo variant="minimal" size="md" />
          <span className="text-lg font-semibold">TDS Toolbox</span>
        </Link>
      </div>

      {/* Client Selector */}
      <div className="border-b border-neutral-200 p-4">
        <div className="mb-2 flex items-center space-x-2 text-xs font-semibold uppercase text-neutral-400">
          <Building2 className="h-4 w-4" />
          <span>Active Client</span>
        </div>
        {loadingClients ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50">
                <span className={cn(
                  'truncate',
                  selectedClient ? 'text-neutral-900 font-medium' : 'text-neutral-500'
                )}>
                  {selectedClient?.name || 'Select client...'}
                </span>
                <ChevronDown className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {selectedClientId && (
                <>
                  <DropdownMenuItem
                    onClick={() => setSelectedClientId(null)}
                    className="text-neutral-500"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear selection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {clients.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-neutral-500">
                  No clients found
                </div>
              ) : (
                clients.map((client) => (
                  <DropdownMenuItem
                    key={client._id}
                    onClick={() => setSelectedClientId(client._id)}
                    className={cn(
                      selectedClientId === client._id && 'bg-neutral-100'
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs text-neutral-500 truncate">
                        {client.website}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Tools Section */}
        <div className="mt-6">
          <div className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold uppercase text-neutral-400">
            <Wrench className="h-4 w-4" />
            <span>Tools</span>
          </div>
          <div className="mt-1 space-y-1">
            {tools.map((tool) => {
              const isActive = pathname.startsWith(tool.href);
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-neutral-100 text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <tool.icon className="h-5 w-5" />
                    <span>{tool.name}</span>
                  </div>
                  {tool.isNew && (
                    <Badge variant="secondary" className="text-xs">
                      New
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="mt-6">
            <div className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold uppercase text-neutral-400">
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </div>
            <div className="mt-1 space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User Menu */}
      <div className="border-t border-neutral-200 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center space-x-3 rounded-lg p-2 text-left hover:bg-neutral-50">
              <Avatar className="h-8 w-8">
                {session?.user?.image && (
                  <AvatarImage src={session.user.image} alt={session.user.name || ''} />
                )}
                <AvatarFallback>
                  {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">
                  {session?.user?.name}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {session?.user?.role === 'admin' ? 'Admin' : 'Member'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-neutral-500">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
