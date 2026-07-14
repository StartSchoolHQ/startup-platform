"use client";

// Shared Recharts tooltip matching the style of admin/weekly-trends-chart.tsx

interface TooltipEntry {
  name: string;
  value: number | string;
  color?: string;
  stroke?: string;
  fill?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-background rounded-lg border p-3 shadow-md">
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      {payload.map((entry: TooltipEntry, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor: entry.color || entry.stroke || entry.fill,
            }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};
