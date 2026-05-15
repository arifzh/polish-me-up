export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-[#F8BBD0]/60 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 sm:pb-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#3D1A2A] md:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-[#5C2D48]/70 sm:text-sm">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
