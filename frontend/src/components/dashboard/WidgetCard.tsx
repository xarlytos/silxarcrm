'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  children: React.ReactNode;
  className?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function WidgetCard({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-[var(--text-primary)]',
  iconBg = 'bg-[var(--bg-tertiary)]',
  children,
  className,
  action,
}: WidgetCardProps) {
  return (
    <div className={cn(
      'bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden',
      className
    )}>
      <div className="px-5 py-4 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
          )}
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h3>
            {subtitle && <p className="text-[13px] text-[var(--text-tertiary)]">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium text-expo-cobalt dark:text-blue-400 hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
