'use client';

import { cn } from '@/lib/utils';
import { ChevronRight, LucideIcon } from 'lucide-react';

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
      'group relative bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl overflow-hidden dash-lift',
      className
    )}>
      <div className="px-5 py-4 border-b border-[var(--border-secondary)] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.05] transition-transform duration-300 ease-luxe group-hover:scale-[1.04]',
                iconBg,
              )}
            >
              <Icon className={cn('w-5 h-5', iconColor)} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12.5px] text-[var(--text-tertiary)] truncate">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="group/btn inline-flex items-center gap-1 text-[13px] font-medium text-[var(--expo-cobalt)] dark:text-blue-400 hover:gap-1.5 transition-all"
          >
            {action.label}
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 ease-luxe group-hover/btn:translate-x-0.5" />
          </button>
        )}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
