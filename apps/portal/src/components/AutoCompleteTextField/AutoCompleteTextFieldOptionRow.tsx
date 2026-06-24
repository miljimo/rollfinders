import type { AutoCompleteTextFieldOption } from "./types";

export function AutoCompleteTextFieldOptionRow({
  active,
  id,
  onSelect,
  option,
}: {
  active: boolean;
  id: string;
  onSelect: () => void;
  option: AutoCompleteTextFieldOption;
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={active}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left text-sm font-semibold hover:bg-stone-100 ${active ? "bg-stone-200 text-stone-950 hover:bg-stone-200" : "text-stone-950"}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
    >
      <span className="truncate">{option.label}</span>
      {option.description ? <span className="shrink-0 font-medium text-stone-600">{option.description}</span> : null}
    </button>
  );
}
