'use client';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  accent?: boolean;
}

export default function KPICard({ title, value, change, subtitle, accent = false }: KPICardProps) {
  return (
    <div className={`rounded-comfortable p-6 border transition-all hover:shadow-whisper ${
      accent
        ? 'bg-expo-black text-white border-expo-black'
        : 'bg-expo-white border-expo-border'
    }`}>
      <p className={`text-[13px] font-medium uppercase tracking-wider mb-4 ${
        accent ? 'text-white/50' : 'text-expo-silver'
      }`}>
        {title}
      </p>
      <p className={`text-[32px] font-bold tracking-heading leading-none ${
        accent ? 'text-white' : 'text-expo-black'
      }`}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-3">
        {change !== undefined && (
          <span className={`text-[13px] font-semibold px-2 py-0.5 rounded-subtle ${
            change >= 0
              ? 'bg-green-100 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <span className={`text-[13px] ${accent ? 'text-white/40' : 'text-expo-silver'}`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
