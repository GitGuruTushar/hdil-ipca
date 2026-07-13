// An empty state should guide the user to the next action, not just say
// "nothing here" — every call site passes a concrete next step.
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      {Icon && (
        <div className="h-11 w-11 rounded-full bg-ivory flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-body" strokeWidth={1.75} />
        </div>
      )}
      <div className="font-display font-bold text-ink text-[15px]">{title}</div>
      {description && <p className="text-sm text-body mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
