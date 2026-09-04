import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface ChartWidgetItem {
  label: string;
  value: number;
  color?: string;
}

interface ChartWidgetProps {
  title: string;
  data: ChartWidgetItem[];
  maxValue?: number;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
}

export function ChartWidget({
  title,
  data = [],
  maxValue,
  valuePrefix = '',
  valueSuffix = '',
  className,
}: ChartWidgetProps) {
  const calculatedMax = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 1;
  const max = maxValue && maxValue > 0 ? maxValue : calculatedMax || 1;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {data.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No data available</p>
        ) : (
          data.map((item, index) => {
            const percentage = Math.min(100, Math.max(0, (item.value / max) * 100));

            return (
              <div key={item.label || index} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{item.label}</span>
                  <span className="font-semibold text-slate-900 tracking-tight">
                    {valuePrefix}
                    {item.value.toLocaleString()}
                    {valueSuffix}
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className="h-2 bg-slate-100"
                  indicatorClassName={item.color || 'bg-amber-500'}
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
