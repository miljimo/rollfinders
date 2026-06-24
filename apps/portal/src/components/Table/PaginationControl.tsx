import { Button } from "@/components/Button";

type PaginationControlProps ={
  children: string;
  disabled: boolean;
  href?: string;
  onClick?: () => void;
  ariaLabel: string;
}

export function PaginationControl({
  children,
  disabled,
  href,
  onClick,
  ariaLabel,
}: PaginationControlProps) {

  if (href && !disabled) {
    return (
      <Button href={href} aria-label={ariaLabel} 
            disabled={disabled} 
            size="md" 
            variant="secondary" 
            className="min-h-10 px-4 py-2 hover:border-teal-700 hover:text-teal-800">
        {children}
      </Button>
    );
  }
  return (
    <Button 
      type="button" 
      aria-label={ariaLabel} 
      disabled={disabled} 
      onClick={onClick} 
      size="md" 
      variant="secondary" 
      className="min-h-10 px-4 py-2 hover:border-teal-700 hover:text-teal-800">
      {children}
    </Button>
  );
}
