import type { MetaInsightsQuery } from './types';

export interface MetaPreset {
  id: string;
  label: string;
  description: string;
  fields: string[];
  breakdowns?: string[];
  level: MetaInsightsQuery['level'];
  timeIncrement?: number | 'monthly';
}

export const META_PRESETS: MetaPreset[] = [
  {
    id: 'performance-overview',
    label: 'Performance Overview',
    description: 'Spend, impressions, reach, clicks, and cost metrics',
    fields: ['spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'cpc', 'frequency'],
    level: 'account',
  },
  {
    id: 'demographics',
    label: 'Demographics',
    description: 'Performance broken down by age and gender',
    fields: ['spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'cpc'],
    breakdowns: ['age', 'gender'],
    level: 'account',
  },
  {
    id: 'platform-breakdown',
    label: 'Platform Breakdown',
    description: 'Performance by platform and placement',
    fields: ['spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'cpc'],
    breakdowns: ['publisher_platform', 'platform_position'],
    level: 'account',
  },
  {
    id: 'conversions-roas',
    label: 'Conversions & ROAS',
    description: 'Conversion actions, values, and return on ad spend',
    fields: ['spend', 'actions', 'action_values', 'purchase_roas', 'cost_per_action_type'],
    level: 'campaign',
  },
  {
    id: 'video-performance',
    label: 'Video Performance',
    description: 'Video view milestones and completion rates',
    fields: [
      'spend',
      'impressions',
      'video_play_actions',
      'video_p25_watched_actions',
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p100_watched_actions',
    ],
    level: 'campaign',
  },
  {
    id: 'daily-trend',
    label: 'Daily Trend',
    description: 'Daily performance metrics over time',
    fields: ['spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpm', 'cpc'],
    level: 'account',
    timeIncrement: 1,
  },
];

export function getPresetById(id: string): MetaPreset | undefined {
  return META_PRESETS.find((p) => p.id === id);
}
