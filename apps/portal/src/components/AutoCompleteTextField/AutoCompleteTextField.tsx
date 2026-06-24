"use client";

import { useId, useMemo, useState } from "react";
import { AutoCompleteTextFieldOptionRow } from "./AutoCompleteTextFieldOptionRow";
import type { AutoCompleteTextFieldOption, AutoCompleteTextFieldProps } from "./types";

function optionSearchText(option: AutoCompleteTextFieldOption) {
  return `${option.label} ${option.description ?? ""} ${option.meta ?? ""}`.toLowerCase();
}

export function AutoCompleteTextField({
  emptyMessage = "No results found.",
  errors,
  label,
  maxResults = 25,
  name,
  options,
  onSelectedIdChange,
  placeholder = "Search",
  selectedId = "",
  size = "md",
}: AutoCompleteTextFieldProps) {
  const inputId = useId();
  const listId = `${inputId}-results`;
  const initialOption = options.find((option) => option.id === selectedId);
  const [query, setQuery] = useState(initialOption?.label ?? "");
  const [selectedOptionId, setSelectedOptionId] = useState(selectedId);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const trimmedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const filtered = trimmedQuery ? options.filter((option) => optionSearchText(option).includes(trimmedQuery)) : options;
    return filtered.slice(0, maxResults);
  }, [maxResults, options, trimmedQuery]);
  const activeOption = open ? matches[activeIndex] : undefined;
  const activeOptionId = activeOption ? `${listId}-${activeOption.id}` : undefined;

  const labelClassName = size === "lg" ? "text-lg font-bold text-stone-950" : "text-sm font-semibold text-stone-800";
  const inputClassName = size === "lg" ? "min-h-14 px-4 text-base" : "min-h-11 px-3 text-base";

  function selectOption(option: AutoCompleteTextFieldOption) {
    setSelectedOptionId(option.id);
    onSelectedIdChange?.(option.id);
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className={`grid min-w-0 ${size === "lg" ? "gap-2" : "gap-1"}`}>
      <label htmlFor={inputId} className={labelClassName}>{label}</label>
      <input name={name} type="hidden" value={selectedOptionId} />
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedOptionId("");
          onSelectedIdChange?.("");
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
            return;
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
            return;
          }

          if (event.key === "Enter" && open && activeOption) {
            event.preventDefault();
            selectOption(activeOption);
          }
        }}
        placeholder={placeholder}
        aria-invalid={errors ? "true" : undefined}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        className={`min-w-0 border border-stone-300 font-normal aria-invalid:border-red-500 ${inputClassName} ${open ? "rounded-md rounded-b-none" : "rounded-md"}`}
      />
      {open ? (
        <div id={listId} role="listbox" className="-mt-1 max-h-48 overflow-auto rounded-b-md border border-t-0 border-stone-300 bg-white shadow-sm">
          {matches.map((option, index) => (
            <AutoCompleteTextFieldOptionRow
              key={option.id}
              id={`${listId}-${option.id}`}
              active={option.id === selectedOptionId || index === activeIndex}
              option={option}
              onSelect={() => selectOption(option)}
            />
          ))}
          {!matches.length ? <p className="px-3 py-2 text-sm font-medium text-stone-600">{emptyMessage}</p> : null}
        </div>
      ) : null}
      {errors?.length ? <span className="text-xs font-semibold text-red-700">{errors[0]}</span> : null}
    </div>
  );
}
