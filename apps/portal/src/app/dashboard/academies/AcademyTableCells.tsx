import Link from "next/link";

export function AcademyBadge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md border border-stone-200 px-2 py-1 text-xs font-bold text-stone-700">{children}</span>;
}

export function LinkedTableCell({ children, className, href }: { children: React.ReactNode; className?: string; href?: string }) {
  return (
    <td className={`px-5 py-4 ${className ?? ""}`}>
      {href ? <Link href={href} className="block min-h-6">{children}</Link> : children}
    </td>
  );
}

