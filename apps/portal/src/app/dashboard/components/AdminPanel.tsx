export function AdminPanel({
  action,
  children,
  description,
  id,
  search,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  id?: string;
  search?: React.ReactNode;
  title: string;
}) {
  return (
    <section id={id}>
      <div className="grid gap-4 border-b border-stone-100 pb-4 lg:grid-cols-[minmax(240px,360px)_1fr] lg:items-start">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-stone-950">{title}</h2>
          <p className="text-sm text-stone-600">{description}</p>
        </div>
        {search || action ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            {search}
            {action}
          </div>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

