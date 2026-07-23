type FilterSelectOption = {
  label: string;
  value: string;
};

export function FilterSelect({ defaultValue, name, options }: { defaultValue: string; name: string; options: FilterSelectOption[] }) {
  return (
    <select name={name} defaultValue={defaultValue} className="min-h-14 rounded-md border border-slate-200 bg-white px-4 text-base text-slate-950">
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
