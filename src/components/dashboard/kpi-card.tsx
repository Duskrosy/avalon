import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  change?: number;
  subtitle?: string;
};

export function KpiCard({ label, value, unit, change, subtitle }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <p className="text-2xl font-semibold text-gray-900">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {change !== undefined && (
        <p
          className={cn(
            "text-xs mt-1 font-medium",
            change >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}% vs last period
        </p>
      )}
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}