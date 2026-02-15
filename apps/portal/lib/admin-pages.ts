export interface AdminPage {
  id: string;
  name: string;
  href: string;
}

export const adminPages: AdminPage[] = [
  { id: 'admin:users', name: 'User Management', href: '/admin/users' },
  { id: 'admin:profiles', name: 'Profiles', href: '/admin/profiles' },
  { id: 'admin:feedback', name: 'Feedback', href: '/admin/feedback' },
  { id: 'admin:scrapingbee-usage', name: 'ScrapingBee Usage', href: '/admin/scrapingbee-usage' },
  { id: 'admin:ai-costs', name: 'AI Costs', href: '/admin/ai-costs' },
  { id: 'admin:ideation-prompts', name: 'Ideation Prompts', href: '/admin/ideation-prompts' },
];
