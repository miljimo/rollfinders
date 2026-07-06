export function LinkedTableCell({ children, className }: { children: React.ReactNode; className?: string; href?: string }) {
  return (
    <td className={className}>
      <div className="px-5 py-4">{children}</div>
    </td>
  );
}

