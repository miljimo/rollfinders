export function DialogInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <div className="mt-1 break-words font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export function ProfileInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-950">{value}</p>
    </div>
  );
}

