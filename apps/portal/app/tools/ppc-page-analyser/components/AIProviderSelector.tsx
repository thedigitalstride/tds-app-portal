'use client';

import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

type AIProvider = 'claude' | 'openai';

interface AIProviderSelectorProps {
  provider: AIProvider;
  model: string;
  availableProviders: AIProvider[];
  onProviderChange: (provider: AIProvider) => void;
  onModelChange: (model: string) => void;
}

const CLAUDE_MODELS: Record<string, string> = {
  'claude-sonnet-4-20250514': 'Claude Sonnet 4 (Recommended)',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku (Faster)',
};

const OPENAI_MODELS: Record<string, string> = {
  'gpt-4o': 'GPT-4o (Recommended)',
  'gpt-4o-mini': 'GPT-4o Mini (Faster)',
  'gpt-4-turbo': 'GPT-4 Turbo',
};

export function AIProviderSelector({
  provider,
  model,
  availableProviders,
  onProviderChange,
  onModelChange,
}: AIProviderSelectorProps) {
  const models = provider === 'claude' ? CLAUDE_MODELS : OPENAI_MODELS;
  const defaultModel = provider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o';

  // When provider changes, reset to default model
  const handleProviderChange = (newProvider: AIProvider) => {
    onProviderChange(newProvider);
    onModelChange(newProvider === 'claude' ? 'claude-sonnet-4-20250514' : 'gpt-4o');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          AI Provider
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleProviderChange('claude')}
            disabled={!availableProviders.includes('claude')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              provider === 'claude'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            } ${
              !availableProviders.includes('claude')
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">Claude</span>
          </button>

          <button
            type="button"
            onClick={() => handleProviderChange('openai')}
            disabled={!availableProviders.includes('openai')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
              provider === 'openai'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            } ${
              !availableProviders.includes('openai')
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            <Bot className="h-5 w-5" />
            <span className="font-medium">OpenAI</span>
          </button>
        </div>
        {availableProviders.length === 0 && (
          <p className="mt-2 text-sm text-red-500">
            No AI providers configured. Please set API keys in environment variables.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Model
        </label>
        <select
          value={model || defaultModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Object.entries(models).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
