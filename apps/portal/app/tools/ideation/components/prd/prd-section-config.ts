import {
  FileText,
  AlertCircle,
  Users,
  BookOpen,
  Target,
  TrendingUp,
  CheckCircle,
  Rocket,
  Settings,
  AlertTriangle,
  Flag,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export interface PrdSectionConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const sectionMap: Record<string, PrdSectionConfig> = {
  'Executive Summary': { icon: FileText, color: '#1A6B3C', bgColor: '#EFF8F2' },
  'Problem Statement': { icon: AlertCircle, color: '#B85C3A', bgColor: '#FDF2EE' },
  'Target Users': { icon: Users, color: '#2D7A8A', bgColor: '#EDF7F9' },
  'User Stories': { icon: BookOpen, color: '#6B4FA0', bgColor: '#F5F0FB' },
  'Goals & Success Metrics': { icon: Target, color: '#D4A843', bgColor: '#FAF5EF' },
  'Competitive Landscape': { icon: TrendingUp, color: '#2D7A8A', bgColor: '#EDF7F9' },
  'Core Features (MVP)': { icon: CheckCircle, color: '#1A6B3C', bgColor: '#EFF8F2' },
  'Future Features (v2+)': { icon: Rocket, color: '#6B4FA0', bgColor: '#F5F0FB' },
  'Technical Considerations': { icon: Settings, color: '#8B6F47', bgColor: '#FAF5EF' },
  'Risks & Assumptions': { icon: AlertTriangle, color: '#B85C3A', bgColor: '#FDF2EE' },
  'MVP Definition': { icon: Flag, color: '#1A6B3C', bgColor: '#EFF8F2' },
  'Open Questions': { icon: HelpCircle, color: '#6B4FA0', bgColor: '#F5F0FB' },
};

const defaultConfig: PrdSectionConfig = {
  icon: FileText,
  color: '#525252',
  bgColor: '#F5F5F5',
};

export function getSectionConfig(title: string): PrdSectionConfig {
  return sectionMap[title] || defaultConfig;
}
