import { AlertTriangle, CheckCircle } from "lucide-react";

export function Badge({ status }: { status: "Ativo" | "Inativo" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      status === "Ativo"
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "bg-red-50 text-red-600 border border-red-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "Ativo" ? "bg-emerald-500" : "bg-red-500"}`} />
      {status}
    </span>
  );
}

export function StockBadge({ qty }: { qty: number }) {
  const critical = qty < 15;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      critical
        ? "bg-red-50 text-red-700 border border-red-200"
        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
    }`}>
      {critical ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
      {critical ? `Crítico (${qty})` : `OK (${qty})`}
    </span>
  );
}
