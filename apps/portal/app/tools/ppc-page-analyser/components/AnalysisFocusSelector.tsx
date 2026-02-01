'use client';

import React from 'react';
import { ShoppingCart, FileText, Building2, Globe } from 'lucide-react';

type AnalysisFocus = 'general' | 'ecommerce' | 'leadgen' | 'b2b';

interface AnalysisFocusSelectorProps {
  focus: AnalysisFocus;
  onChange: (focus: AnalysisFocus) => void;
}

const FOCUS_OPTIONS: {
  value: AnalysisFocus;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'general',
    label: 'General',
    description: 'Standard landing page analysis',
    icon: Globe,
  },
  {
    value: 'ecommerce',
    label: 'E-commerce',
    description: 'Product pages, checkout flows',
    icon: ShoppingCart,
  },
  {
    value: 'leadgen',
    label: 'Lead Gen',
    description: 'Forms, consultations, quotes',
    icon: FileText,
  },
  {
    value: 'b2b',
    label: 'B2B',
    description: 'Enterprise, demos, sales',
    icon: Building2,
  },
];

export function AnalysisFocusSelector({
  focus,
  onChange,
}: AnalysisFocusSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Analysis Focus
      </label>
      <div className="grid grid-cols-2 gap-2">
        {FOCUS_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = focus === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <Icon
                className={`h-5 w-5 mt-0.5 ${
                  isSelected ? 'text-blue-600' : 'text-neutral-400'
                }`}
              />
              <div>
                <div
                  className={`font-medium text-sm ${
                    isSelected ? 'text-blue-700' : 'text-neutral-700'
                  }`}
                >
                  {option.label}
                </div>
                <div className="text-xs text-neutral-500">{option.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
