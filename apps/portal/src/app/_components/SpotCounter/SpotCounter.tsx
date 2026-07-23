type SpotCounterProps = {
  availableSpots?: number | null;
  bookedCount?: number | null;
};

function safeCount(value: number | null | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export function SpotCounter({ availableSpots, bookedCount }: SpotCounterProps) {
  safeCount(bookedCount, 12);
  const simulatedAvailableSpots = safeCount(availableSpots, 20);

  return (
    <div className="mt-7 w-fit rounded-lg px-8 py-5">
      <p className="text-xs font-black leading-5 text-teal-800">
        {simulatedAvailableSpots} spots available
      </p>
    </div>
  );
}
