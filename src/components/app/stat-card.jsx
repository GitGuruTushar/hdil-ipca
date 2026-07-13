export function StatCard({ label, value, delta, warn = false, icon: Icon }) {
  return (
    <div className="app-glass glass-shadow rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-body">{label}</div>
        {Icon && <Icon className="h-4 w-4 text-body/60" strokeWidth={2} />}
      </div>
      <div className="font-display text-2xl font-bold text-ink mt-1.5">{value}</div>
      {delta && (
        <div className={`text-[11px] font-semibold mt-1 ${warn ? "text-amber-700" : "text-emerald-700"}`}>
          {delta}
        </div>
      )}
    </div>
  );
}

export function MetricGrid({ children }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">{children}</div>
  );
}
