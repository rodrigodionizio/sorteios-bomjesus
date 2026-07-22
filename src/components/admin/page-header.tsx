export function AdminPageHeader({
  breadcrumb,
  title,
  right,
}: {
  breadcrumb: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {breadcrumb}
        </div>
        <h1 className="text-[28px] font-black tracking-tight">{title}</h1>
      </div>
      {right}
    </div>
  );
}
