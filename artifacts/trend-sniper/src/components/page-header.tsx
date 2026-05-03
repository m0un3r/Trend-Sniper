export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
          TrendSniper
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
