import { Button } from "@/components/Button";
import { directionsUrl } from "@/lib/utils";

export function InlineDirectionsButton({ address }: { address?: string | null }) {
  const trimmedAddress = address?.trim();
  if (!trimmedAddress) return null;

  return (
    <Button
      href={directionsUrl(trimmedAddress)}
      target="_blank"
      rel="noreferrer"
      size="sm"
      variant="secondary"
      className="shrink-0"
    >
      Directions
    </Button>
  );
}
