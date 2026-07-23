import { Button, type ButtonProps } from "@/app/_components/Button";

type BookEventKind = "donation" | "free" | "paid";

type BookEventButtonProps = Omit<ButtonProps, "children"> & {
  eventKind: BookEventKind;
  label?: string;
  loading?: boolean;
  loadingLabel?: string;
};

function defaultBookEventLabel(eventKind: BookEventKind) {
  void eventKind;
  return "Book";
}

export function BookEventButton({
  eventKind,
  label,
  loading = false,
  loadingLabel = "Loading...",
  disabled,
  className,
  ...buttonProps
}: BookEventButtonProps) {
  const buttonLabel = loading ? loadingLabel : label ?? defaultBookEventLabel(eventKind);
  const composedProps = {
    ...buttonProps,
    disabled: disabled || loading,
    variant: buttonProps.variant ?? "primary",
    className,
    children: <span className="text-lg font-black">{buttonLabel}</span>,
  } as ButtonProps;

  return <Button {...composedProps} />;
}

export type { BookEventKind };
