import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type StatsColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'yellow' | 'emerald';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: StatsColor;
  trend?: {
    value: number;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

const colorMap: Record<StatsColor, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  yellow: { bg: 'bg-amber-50', text: 'text-amber-600' },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'orange',
  trend,
  className,
}: StatsCardProps) {
  const colorStyles = colorMap[color] || colorMap.orange;
  const direction = trend?.direction || (trend?.value ? (trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'neutral') : 'neutral');
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${className || ''}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{formattedValue}</p>

            {trend && (
              <div className="flex items-center gap-1 pt-0.5">
                {direction === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
                {direction === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
                {direction === 'neutral' && <Minus className="h-3.5 w-3.5 text-slate-400" />}

                <span
                  className={`text-xs font-semibold ${
                    direction === 'up'
                      ? 'text-emerald-600'
                      : direction === 'down'
                      ? 'text-red-600'
                      : 'text-slate-500'
                  }`}
                >
                  {trend.value > 0 ? `+${trend.value}` : trend.value}%
                </span>

                {trend.label && (
                  <span className="text-xs text-slate-400 font-normal">
                    {trend.label}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className={`rounded-xl ${colorStyles.bg} ${colorStyles.text} p-3 shrink-0`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
