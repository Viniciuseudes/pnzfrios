import { ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";

export function KpiCard({ icon: Icon, label, value, change, changeType, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "warn";
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex gap-4 items-start shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 leading-tight">{value}</p>
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
          changeType === "up" ? "text-emerald-600" : changeType === "down" ? "text-red-600" : "text-amber-600"
        }`}>
          {changeType === "up" ? <ArrowUp className="w-3 h-3" /> : changeType === "down" ? <ArrowDown className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {change}
        </div>
      </div>
    </div>
  );
}
