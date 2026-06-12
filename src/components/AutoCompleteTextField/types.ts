export type AutoCompleteTextFieldOption = {
  id: string;
  label: string;
  description?: string;
  meta?: string;
};

export type AutoCompleteTextFieldProps = {
  label: string;
  name: string;
  options: AutoCompleteTextFieldOption[];
  selectedId?: string;
  placeholder?: string;
  emptyMessage?: string;
  errors?: string[];
  maxResults?: number;
  onSelectedIdChange?: (selectedId: string) => void;
  size?: "md" | "lg";
};
