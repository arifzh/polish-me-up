export function AnimatedGradientText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`pmu-animated-gradient-text ${className ?? ""}`}>
      {children}
    </span>
  );
}

export function ShinyText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`pmu-shiny-text ${className ?? ""}`}>{children}</span>
  );
}
