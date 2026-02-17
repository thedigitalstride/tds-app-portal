'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Building2,
  X,
  MessageSquare,
  MessageSquareText,
  Shield,
  CreditCard,
  Sparkles,
  DollarSign,
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@tds/ui';
import { tools } from '@/lib/tools';
import { getVersionDisplay } from '@/lib/version';
import { useClient } from './client-context';
import { NotificationBell } from './notification-bell';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'My Feedback', href: '/my-feedback', icon: MessageSquareText },
];

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Settings, pageId: 'admin:users' },
  { name: 'Profiles', href: '/admin/profiles', icon: Shield, pageId: 'admin:profiles' },
  { name: 'Feedback', href: '/admin/feedback', icon: MessageSquare, pageId: 'admin:feedback' },
  { name: 'ScrapingBee Usage', href: '/admin/scrapingbee-usage', icon: CreditCard, pageId: 'admin:scrapingbee-usage' },
  { name: 'AI Costs', href: '/admin/ai-costs', icon: DollarSign, pageId: 'admin:ai-costs' },
  { name: 'Ideation Prompts', href: '/admin/ideation-prompts', icon: Sparkles, pageId: 'admin:ideation-prompts' },
];

function getRoleDisplay(role: string): string {
  switch (role) {
    case 'super-admin': return 'Super Admin';
    case 'admin': return 'Admin';
    default: return 'Member';
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super-admin';
  const { clients, loadingClients, selectedClientId, setSelectedClientId, selectedClient } = useClient();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [accessibleTools, setAccessibleTools] = useState<string[] | null>(null);
  const [accessibleAdminPages, setAccessibleAdminPages] = useState<string[] | null>(null);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
    setMounted(true);
  }, []);

  // Fetch user access data
  useEffect(() => {
    if (!session?.user) return;

    const fetchAccess = async () => {
      try {
        const res = await fetch('/api/me/access');
        if (res.ok) {
          const data = await res.json();
          setAccessibleTools(data.tools);
          setAccessibleAdminPages(data.adminPages);
        }
      } catch (error) {
        console.error('Failed to fetch access data:', error);
      }
    };

    fetchAccess();
  }, [session?.user]);

  // Fetch new feedback count for admin badge
  useEffect(() => {
    if (!isAdmin) return;

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/feedback?limit=1');
        if (res.ok) {
          const data = await res.json();
          setNewFeedbackCount(data.newCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch feedback count:', error);
      }
    };

    fetchCount();
    // Refresh count every 60 seconds
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
  };

  // Prevent hydration mismatch by not rendering collapsed state until mounted
  const collapsed = mounted ? isCollapsed : false;

  // Filter tools based on access data
  const visibleTools = accessibleTools
    ? tools.filter((tool) => accessibleTools.includes(tool.id))
    : tools.filter((tool) => !tool.requiredRole || tool.requiredRole === 'user' || isAdmin);

  // Filter admin navigation based on access data
  const visibleAdminNav = accessibleAdminPages
    ? adminNavigation.filter((item) => accessibleAdminPages.includes(item.pageId))
    : adminNavigation;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex h-screen flex-col border-r border-neutral-200 bg-white transition-all duration-200',
          collapsed ? 'w-16' : 'w-80'
        )}
      >
        {/* Logo & Toggle */}
        <div className={cn(
          'flex h-16 items-center border-b border-neutral-200',
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <TDSLogo variant="minimal" size="md" />
            {!collapsed && <span className="text-lg font-semibold">TDS Toolbox</span>}
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell collapsed={collapsed} />
            <button
            onClick={toggleCollapsed}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors',
              collapsed && 'absolute left-16 -ml-4 bg-white border border-neutral-200 shadow-sm z-10'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          </div>
        </div>

        {/* Client Selector */}
        <div className={cn(
          'border-b border-neutral-200',
          collapsed ? 'p-2' : 'p-4'
        )}>
          {!collapsed && (
            <div className="mb-2 flex items-center space-x-2 text-xs font-semibold uppercase text-neutral-400">
              <Building2 className="h-4 w-4" />
              <span>Active Client</span>
            </div>
          )}
          {loadingClients ? (
            <Skeleton className={cn('h-10', collapsed ? 'w-10' : 'w-full')} />
          ) : collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 cursor-pointer">
                  <Building2 className="h-5 w-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {selectedClient?.name || 'No client selected'}
              </TooltipContent>
            </Tooltip>
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
              <DropdownMenuContent align="start" className="w-64 text-left">
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
                      <div className="flex flex-col text-left">
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
        <nav className={cn('flex-1 overflow-y-auto', collapsed ? 'p-2' : 'p-4')}>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const linkContent = (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors',
                    collapsed ? 'justify-center p-2' : 'space-x-3 px-3 py-2',
                    isActive
                      ? 'bg-neutral-100 text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </div>

          {/* Tools Section */}
          <div className="mt-6">
            {!collapsed && (
              <div className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold uppercase text-neutral-400">
                <Wrench className="h-4 w-4" />
                <span>Tools</span>
              </div>
            )}
            {collapsed && (
              <div className="flex justify-center py-2">
                <div className="h-px w-8 bg-neutral-200" />
              </div>
            )}
            <div className="mt-1 space-y-1">
              {visibleTools.map((tool) => {
                const isActive = pathname.startsWith(tool.href);
                const linkContent = (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className={cn(
                      'flex items-center rounded-lg text-sm font-medium transition-colors',
                      collapsed ? 'justify-center p-2' : 'justify-between px-3 py-2',
                      isActive
                        ? 'bg-neutral-100 text-neutral-900'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    {collapsed ? (
                      <tool.icon className="h-5 w-5 flex-shrink-0" />
                    ) : (
                      <>
                        <div className="flex items-center space-x-3">
                          <tool.icon className="h-5 w-5" />
                          <span>{tool.name}</span>
                        </div>
                        {tool.isNew && (
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        )}
                      </>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={tool.id}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        <span>{tool.name}</span>
                        {tool.isNew && <span className="ml-2 text-neutral-400">(New)</span>}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          </div>

          {/* Admin Section */}
          {isAdmin && visibleAdminNav.length > 0 && (
            <div className="mt-6">
              {!collapsed && (
                <div className="flex items-center space-x-2 px-3 py-2 text-xs font-semibold uppercase text-neutral-400">
                  <Settings className="h-4 w-4" />
                  <span>Admin</span>
                </div>
              )}
              {collapsed && (
                <div className="flex justify-center py-2">
                  <div className="h-px w-8 bg-neutral-200" />
                </div>
              )}
              <div className="mt-1 space-y-1">
                {visibleAdminNav.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const isFeedback = item.href === '/admin/feedback';
                  const showBadge = isFeedback && newFeedbackCount > 0;

                  const linkContent = (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center rounded-lg text-sm font-medium transition-colors',
                        collapsed ? 'justify-center p-2 relative' : 'justify-between px-3 py-2',
                        isActive
                          ? 'bg-neutral-100 text-neutral-900'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      )}
                    >
                      {collapsed ? (
                        <>
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {showBadge && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                              {newFeedbackCount > 9 ? '9+' : newFeedbackCount}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center space-x-3">
                            <item.icon className="h-5 w-5 flex-shrink-0" />
                            <span>{item.name}</span>
                          </div>
                          {showBadge && (
                            <Badge variant="secondary" className="bg-red-100 text-red-600 text-xs">
                              {newFeedbackCount}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          {linkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          <span>{item.name}</span>
                          {showBadge && <span className="ml-2 text-red-400">({newFeedbackCount} new)</span>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </div>
            </div>
          )}
        </nav>

        {/* User Menu */}
        <div className={cn('border-t border-neutral-200', collapsed ? 'p-2' : 'p-4')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="flex w-full items-center justify-center rounded-lg p-2 hover:bg-neutral-50">
                      <Avatar className="h-8 w-8">
                        {session?.user?.image && (
                          <AvatarImage src={session.user.image} alt={session.user.name || ''} />
                        )}
                        <AvatarFallback>
                          {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {session?.user?.name}
                  </TooltipContent>
                </Tooltip>
              ) : (
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
                      {getRoleDisplay(session?.user?.role || 'user')}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-neutral-400" />
                </button>
              )}
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

        {/* Version Footer */}
        <div className={cn(
          "border-t border-neutral-200 px-4 py-2",
          collapsed && "px-2 py-1"
        )}>
          <span className={cn(
            "text-[10px] text-neutral-400 font-mono",
            collapsed && "hidden"
          )}>
            {getVersionDisplay()}
          </span>
        </div>
      </aside>
    </TooltipProvider>
  );
}
