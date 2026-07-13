// Consistent title + description + primary action across every admin/dashboard
// page — the "one obvious next thing to do" pattern.
export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{title}</h1>
        {description && <p className="text-sm text-body mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </div>
  );
}
