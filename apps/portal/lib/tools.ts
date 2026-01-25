import { LucideIcon, Search, Users, Settings, FolderOpen, Archive, Target } from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  category: 'seo' | 'social' | 'analytics' | 'content' | 'utility';
  isNew?: boolean;
  requiredRole?: 'admin' | 'user';
  hasClientData?: boolean;
}

export const tools: Tool[] = [
  {
    id: 'meta-tag-analyser',
    name: 'Meta Tag Analyser',
    description: 'Analyse and plan meta tags for any webpage. Check titles, descriptions, and Open Graph tags.',
    icon: Search,
    href: '/tools/meta-tag-analyser',
    category: 'seo',
    isNew: true,
    hasClientData: true,
  },
  {
    id: 'page-library',
    name: 'Page Library',
    description: 'Central hub for managing your page collection. Add URLs and view stored snapshots.',
    icon: Archive,
    href: '/tools/page-library',
    category: 'utility',
    requiredRole: 'admin',
    hasClientData: true,
  },
  {
    id: 'ppc-page-analyser',
    name: 'PPC Page Analyser',
    description: 'Analyse landing pages for PPC campaigns. Check conversion elements, page speed, and ad relevance.',
    icon: Target,
    href: '/tools/ppc-page-analyser',
    category: 'analytics',
    isNew: true,
    hasClientData: true,
  },
  // Add more tools here as they are built
];

export const categories = [
  { id: 'seo', name: 'SEO Tools', icon: Search },
  { id: 'analytics', name: 'Analytics', icon: FolderOpen },
  { id: 'social', name: 'Social Media', icon: Users },
  { id: 'content', name: 'Content', icon: FolderOpen },
  { id: 'utility', name: 'Utilities', icon: Settings },
];

export function getToolsByCategory(category: string): Tool[] {
  return tools.filter((tool) => tool.category === category);
}

export function getTool(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}
