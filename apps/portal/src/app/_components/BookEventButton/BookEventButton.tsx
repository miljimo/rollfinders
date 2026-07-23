import { Button, type ButtonProps } from "@/app/_components/Button";

type BookEventKind = "donation" | "free" | "paid";

type BookEventButtonProps = Omit<ButtonProps, "children"> & {
  eventKind: BookEventKind;
  label?: string;
  loading?: boolean;
  loadingLabel?: string;
  priceLabel?: string;
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
  priceLabel,
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
    children: (
      <span className="grid gap-1 leading-tight">
        <span className="text-lg font-black">{buttonLabel}</span>
        {priceLabel ? <span className="text-sm font-normal opacity-90">{priceLabel}</span> : null}
      </span>
    ),
  } as ButtonProps;

  return <Button {...composedProps} />;
}

export type { BookEventKind };
